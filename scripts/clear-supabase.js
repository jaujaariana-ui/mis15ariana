require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltan credenciales de Supabase en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function truncateTable(table) {
  // Primero obtener todos los IDs
  const { data: rows, error: fetchError } = await supabase
    .from(table)
    .select('id');
  
  if (fetchError) {
    console.error(`  ❌ Error leyendo ${table}:`, fetchError.message);
    return false;
  }

  if (!rows || rows.length === 0) {
    console.log(`  ℹ️  ${table} ya está vacía`);
    return true;
  }

  // Eliminar por IDs (batch de 1000 para evitar límites de URL)
  const ids = rows.map(r => r.id);
  let deleted = 0;
  
  for (let i = 0; i < ids.length; i += 1000) {
    const batch = ids.slice(i, i + 1000);
    const { error } = await supabase
      .from(table)
      .delete()
      .in('id', batch);
    
    if (error) {
      console.error(`  ❌ Error eliminando lote en ${table}:`, error.message);
      return false;
    }
    deleted += batch.length;
  }

  console.log(`  🗑️  ${deleted} filas eliminadas de ${table}`);
  return true;
}

async function countTable(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    console.error(`  ❌ Error contando ${table}:`, error.message);
    return -1;
  }
  return count || 0;
}

async function main() {
  console.log('============================================');
  console.log('  Xalt Moments - Limpiar base de datos');
  console.log('============================================');
  console.log(`URL: ${supabaseUrl}`);

  const tables = ['photos', 'rate_limits', 'guest_profiles', 'event_admins', 'events', 'organizers'];

  // Mostrar conteo antes
  console.log('\n📊 Conteo antes de eliminar:');
  for (const table of tables) {
    const count = await countTable(table);
    console.log(`  ${table}: ${count}`);
  }

  const confirmation = process.argv[2];
  if (confirmation !== '--yes' && confirmation !== '-y') {
    console.log('\n⚠️  Esta operación eliminará TODOS los datos de la base de datos.');
    console.log('   Para confirmar, ejecuta: node scripts/clear-supabase.js --yes');
    process.exit(0);
  }

  console.log('\n⚠️  Modo de confirmación activado. Eliminando datos...\n');

  // Eliminar en orden (respectando dependencias)
  for (const table of tables) {
    console.log(`🗑️  Eliminando ${table}...`);
    const success = await truncateTable(table);
    console.log(success ? `  ✅ ${table} eliminado` : `  ❌ ${table} fallido`);
  }

  // Verificar conteo después
  console.log('\n📊 Conteo después de eliminar:');
  let allEmpty = true;
  for (const table of tables) {
    const count = await countTable(table);
    console.log(`  ${table}: ${count}`);
    if (count > 0) allEmpty = false;
  }

  console.log('\n============================================');
  if (allEmpty) {
    console.log('  ✅ ¡Todas las tablas están vacías!');
  } else {
    console.log('  ⚠️  Algunas tablas aún tienen datos.');
  }
  console.log('============================================');
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
