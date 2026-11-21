require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltan credenciales de Supabase en .env.local');
  process.exit(1);
}

async function enableRealtimeUpdate() {
  console.log('============================================');
  console.log('  Xalt Moments - Habilitar Realtime UPDATE');
  console.log('============================================');
  console.log(`URL: ${supabaseUrl}`);

  // Use Supabase REST API to execute raw SQL via the graphql endpoint
  // Supabase exposes a /sql endpoint for the service role
  const sqlEndpoint = `${supabaseUrl}/rest/v1/`;

  console.log('\nIntentando conectar a Supabase...');

  // First, try to verify connectivity
  try {
    const testResp = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });
    console.log(`✅ Conectado a Supabase (status: ${testResp.status})\n`);
  } catch (err) {
    console.error('❌ No se puede conectar a Supabase:', err.message);
    console.log('\n⚠️  No se puede conectar a Supabase desde esta máquina.');
    console.log('   Por favor, ejecuta este script desde tu computadora:');
    console.log('   node scripts/enable-photos-realtime-update.js --yes');
    process.exit(1);
  }

  // Use node-postgres to execute DDL
  const { Client } = require('pg');

  // Build PostgreSQL connection string from Supabase credentials
  const urlParts = supabaseUrl.replace('https://', '').split('.');
  const ref = urlParts[0];
  const host = `db.${ref}.supabase.co`;
  const connectionString = `postgresql://postgres:${serviceRoleKey}@${host}:5432/postgres`;

  console.log(`Conectando a PostgreSQL en ${host}...`);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Step 1: Remove table from publication
    console.log('Paso 1: Removiendo photos de la publicación...');
    await client.query(`ALTER PUBLICATION supabase_realtime REMOVE TABLE IF EXISTS photos`);
    console.log('  ✅ Tabla removida de la publicación\n');

    // Step 2: Re-add table (enables all event types: INSERT, UPDATE, DELETE, TRUNCATE)
    console.log('Paso 2: Agregando photos a la publicación con todos los eventos...');
    await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE photos`);
    console.log('  ✅ Tabla agregada con todos los eventos\n');

    // Verify
    console.log('Verificando configuración...');
    const result = await client.query(`
      SELECT publish_via, tablename, insert, update, delete, truncate
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'photos'
    `);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log(`  Tabla: ${row.tablename}`);
      console.log(`  INSERT: ${row.insert}`);
      console.log(`  UPDATE: ${row.update}`);
      console.log(`  DELETE: ${row.delete}`);
      console.log(`  TRUNCATE: ${row.truncate}`);
    }

    console.log('\n============================================');
    console.log('  ✅ Realtime UPDATE habilitado para photos');
    console.log('  Las eliminaciones de fotos ahora se');
    console.log('  propagan en tiempo real a todos los');
    console.log('  dispositivos conectados.');
    console.log('============================================');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n⚠️  No se puede conectar directamente a la base de datos.');
    console.log('   Esto puede ser un problema de red (VPN, firewall).');
    console.log('   Por favor, ejecuta este script desde tu computadora:');
    console.log('   node scripts/enable-photos-realtime-update.js --yes');
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const yes = process.argv.includes('--yes');
  if (!yes) {
    console.log('\n⚠️  Esto habilitará Realtime UPDATE para la tabla photos.');
    console.log('   Para confirmar, ejecuta: node scripts/enable-photos-realtime-update.js --yes');
    process.exit(0);
  }
  enableRealtimeUpdate().catch(console.error);
}
