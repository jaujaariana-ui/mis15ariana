// Execute migration: remove auth_user_id foreign key from guest_profiles
// Uses Supabase Management API (v2) to execute SQL
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAccessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltan credenciales de Supabase');
  process.exit(1);
}

async function main() {
  console.log('=== Migración: remover FK de guest_profiles.auth_user_id ===\n');

  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
  console.log(`Project: ${projectRef}\n`);

  // Method 1: Try Supabase Management API (requires personal access token)
  if (supabaseAccessToken) {
    console.log('Intentando con Supabase Management API...\n');
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/db/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          ALTER TABLE guest_profiles DROP CONSTRAINT IF EXISTS guest_profiles_auth_user_id_fkey;
          ALTER TABLE guest_profiles ALTER COLUMN auth_user_id DROP NOT NULL;
        `
      }),
    });

    const text = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Respuesta: ${text.slice(0, 300)}`);

    if (response.ok) {
      console.log('\n✅ Migración completada vía Management API');
      return;
    }
  }

  // Method 2: Try creating a stored function via the REST API
  console.log('\nIntentando crear función SQL vía REST...\n');

  const fullUrl = `https://${projectRef}.supabase.co`;

  // Try to create a function that drops the constraint, then call it via RPC
  // First, we try the /graphql endpoint
  const graphqlQuery = {
    query: `
      mutation {
        rpc(function: "remove_guest_auth_fk") {
          _all
        }
      }
    `
  };

  console.log('Nota: La migración necesita ejecutarse manualmente en el SQL Editor de Supabase.');
  console.log('\n📋 Copia y pega esto en el SQL Editor:');
  console.log('   👉 https://supabase.com/dashboard/project/bqckjtrjtctwhjvfasxj/sql/new');
  console.log('\n   SQL a ejecutar:');
  console.log('   ---');
  console.log('   ALTER TABLE guest_profiles DROP CONSTRAINT IF EXISTS guest_profiles_auth_user_id_fkey;');
  console.log('   ALTER TABLE guest_profiles ALTER COLUMN auth_user_id DROP NOT NULL;');
  console.log('   ---');
  console.log('\n   O ejecuta: supabase db push (si tienes el CLI instalado)');
}

main().catch(console.error);
