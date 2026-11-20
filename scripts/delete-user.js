// Eliminar usuario específico de Supabase Auth y su organizador asociado
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltan credenciales de Supabase');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = 'jauja.ariana@gmail.com';
  const force = process.argv.includes('--yes');

  console.log(`=== Eliminar usuario: ${email} ===\n`);

  if (!force) {
    console.log('⚠️  Esta acción es irreversible.');
    console.log('Ejecuta: node scripts/delete-user.js --yes\n');
    process.exit(0);
  }

  // 1. Buscar el usuario en Auth
  console.log('1. Buscando usuario en Supabase Auth...');
  const { data: users, error: listError } = await admin.auth.admin.listUsers(1, 100);

  if (listError) {
    console.error('❌ Error listando usuarios:', listError.message);
    process.exit(1);
  }

  const targetUser = users.users.find(u => u.email === email);

  if (!targetUser) {
    console.log(`✅ El usuario ${email} NO existe en Supabase Auth.`);
    console.log('   Puedes registrarte sin problema.');
    return;
  }

  const userId = targetUser.id;
  console.log(`✅ Usuario encontrado: ${userId.slice(0, 12)}...`);
  console.log(`   Creado: ${targetUser.created_at}`);

  // 2. Buscar y eliminar el organizador asociado
  console.log('\n2. Buscando organizador asociado...');
  const { data: organizer } = await admin
    .from('organizers')
    .select('*')
    .eq('auth_user_id', userId)
    .single();

  if (organizer) {
    console.log(`   Organizador encontrado: ${organizer.id.slice(0, 12)}...`);
    const { error: delOrgError } = await admin
      .from('organizers')
      .delete()
      .eq('id', organizer.id);

    if (delOrgError) {
      console.error(`   ⚠️  Error eliminando organizador: ${delOrgError.message}`);
    } else {
      console.log(`   ✅ Organizador eliminado`);
    }
  } else {
    console.log(`   ⚠️  No hay organizador asociado`);
  }

  // 3. Eliminar el usuario de Auth
  console.log('\n3. Eliminando usuario de Supabase Auth...');
  const { error: delError } = await admin.auth.admin.deleteUser(userId);

  if (delError) {
    console.error(`❌ Error eliminando usuario: ${delError.message}`);
    process.exit(1);
  }

  console.log(`✅ Usuario eliminado correctamente`);
  console.log(`\nAhora puedes registrarte con ${email} sin problemas.`);
}

main().catch(console.error);
