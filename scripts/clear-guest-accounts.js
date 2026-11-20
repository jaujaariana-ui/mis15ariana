// ============================================
// Xalt Moments - Eliminar cuentas guest automáticas
// ============================================
// Este script elimina todos los usuarios de Supabase Auth
// que fueron creados automáticamente para invitados
// (emails con formato guest-*@temp.xaltmoments.local).
//
// También elimina los perfiles de guest_profiles asociados.
//
// Uso: node scripts/clear-guest-accounts.js
// Requiere: .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
//
// ⚠️ ADVERTENCIA: Esta operación es IRREVERSIBLE.
//    Todos los usuarios guest y sus perfiles se perderán.
// ============================================

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltan credenciales de Supabase en .env.local');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listGuestUsers() {
  const allUsers = [];
  let page = 1;
  let hasMore = true;

  console.log('\n🔍 Buscando usuarios guest (guest-*@temp.xaltmoments.local)...');

  while (hasMore) {
    const result = await adminClient.auth.admin.listUsers(page, 1000);
    
    if (result.error) {
      console.error('  ❌ Error listando usuarios:', result.error.message);
      break;
    }

    if (!result.data || !result.data.users || result.data.users.length === 0) {
      break;
    }

    // Filtrar solo los usuarios guest
    const guestUsers = result.data.users.filter(user => 
      user.email && user.email.startsWith('guest-') && user.email.endsWith('@temp.xaltmoments.local')
    );

    allUsers.push(...guestUsers);
    console.log(`  Página ${page}: ${guestUsers.length} usuarios guest encontrados (total: ${allUsers.length})`);

    hasMore = result.data.users.length === 1000;
    page++;
  }

  return allUsers;
}

async function deleteGuestUser(userId) {
  try {
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      console.error(`    ❌ Error eliminando usuario ${userId}:`, error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`    ❌ Error eliminando usuario ${userId}:`, error.message);
    return false;
  }
}

async function countGuestProfiles() {
  const { count, error } = await adminClient
    .from('guest_profiles')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('  ❌ Error contando guest_profiles:', error.message);
    return -1;
  }
  return count || 0;
}

async function main() {
  console.log('============================================');
  console.log('  Xalt Moments - Limpiar cuentas guest');
  console.log('============================================');
  console.log(`URL: ${supabaseUrl}`);

  const confirmation = process.argv[2];
  if (confirmation !== '--yes' && confirmation !== '-y') {
    console.log('\n⚠️  Esta operación eliminará TODOS los usuarios guest automáticos');
    console.log('   (emails con formato guest-*@temp.xaltmoments.local)');
    console.log('   y sus perfiles asociados de guest_profiles.');
    console.log('\n   Para confirmar, ejecuta: node scripts/clear-guest-accounts.js --yes');
    process.exit(0);
  }

  console.log('\n⚠️  Modo de confirmación activado. Procediendo...\n');

  // Contar guest_profiles antes
  const profilesBefore = await countGuestProfiles();
  console.log(`📊 guest_profiles antes: ${profilesBefore}`);

  // Listar usuarios guest
  const guestUsers = await listGuestUsers();
  console.log(`\n📋 Total de usuarios guest encontrados: ${guestUsers.length}`);

  if (guestUsers.length === 0) {
    console.log('\n✨ No se encontraron usuarios guest para eliminar.');
    return;
  }

  // Mostrar los usuarios que se eliminarán
  console.log('\n📝 Usuarios a eliminar:');
  guestUsers.forEach(user => {
    console.log(`  - ${user.email} (creado: ${user.created_at})`);
  });

  // Eliminar usuarios guest
  console.log('\n🗑️  Eliminando usuarios guest...');
  let deleted = 0;
  let failed = 0;

  for (const user of guestUsers) {
    const success = await deleteGuestUser(user.id);
    if (success) {
      deleted++;
      console.log(`  ✅ ${user.email}`);
    } else {
      failed++;
      console.log(`  ❌ ${user.email}`);
    }
  }

  // Contar guest_profiles después (deberían eliminarse por CASCADE o ya estaban vacíos)
  const profilesAfter = await countGuestProfiles();
  console.log(`\n📊 guest_profiles después: ${profilesAfter}`);

  console.log('\n============================================');
  console.log('  Resultado final');
  console.log('============================================');
  console.log(`  ✅ Usuarios eliminados: ${deleted}`);
  if (failed > 0) {
    console.log(`  ❌ Usuarios fallidos: ${failed}`);
  }
  console.log(`  📊 guest_profiles: ${profilesBefore} → ${profilesAfter}`);
  console.log('============================================');

  if (deleted === 0 && failed === 0) {
    console.log('\n✨ No se encontraron usuarios guest para eliminar.');
  } else {
    console.log('\n✨ Proceso completado.');
  }
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
