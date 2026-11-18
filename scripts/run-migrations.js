/**
 * Script to run Supabase database migrations using direct PostgreSQL connection.
 * This script reads all SQL migration files from supabase/migrations/
 * and executes them against the remote Supabase database.
 *
 * Usage: node scripts/run-migrations.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) continue;
  const key = trimmed.substring(0, eqIndex).trim();
  const value = trimmed.substring(eqIndex + 1).trim();
  envVars[key] = value;
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const dbPassword = envVars.SUPABASE_DB_PASSWORD;

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

if (!dbPassword) {
  console.error('❌ Missing SUPABASE_DB_PASSWORD in .env.local');
  console.error('   Get it from: https://supabase.com/dashboard/project/PROJECT_REF/settings/database');
  console.error('   Add to .env.local: SUPABASE_DB_PASSWORD=your-password');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

// Build PostgreSQL connection string
const pgHost = `${projectRef}.supabase.co`;
const pgPort = 5432;
const pgUser = 'postgres';
const pgDatabase = 'postgres';

console.log('═══════════════════════════════════════════════════════');
console.log('  Xalt Moments - Database Migration Script');
console.log('═══════════════════════════════════════════════════════\n');
console.log(`🔗 Connecting to: ${pgHost}`);
console.log(`📋 Database: ${pgDatabase}\n`);

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

if (migrationFiles.length === 0) {
  console.error('❌ No migration files found in supabase/migrations/');
  process.exit(1);
}

console.log(`📋 Found ${migrationFiles.length} migration files:\n`);
for (const file of migrationFiles) {
  console.log(`   📄 ${file}`);
}
console.log();

async function runMigrations() {
  const client = new Client({
    host: pgHost,
    port: pgPort,
    user: pgUser,
    password: dbPassword,
    database: pgDatabase,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    console.log('🚀 Executing migrations...\n');

    let successCount = 0;
    let failCount = 0;

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        await client.query(sql);
        console.log(`✅ ${file} - executed successfully`);
        successCount++;
      } catch (error) {
        // Check if it's a "already exists" error (idempotent)
        if (error.code === '42P07' || error.code === '42710') {
          console.log(`⏭️  ${file} - already exists, skipping`);
          successCount++;
        } else {
          console.log(`❌ ${file} - ${error.message}`);
          failCount++;
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`  Results: ${successCount} succeeded, ${failCount} failed`);
    console.log('═══════════════════════════════════════════════════════\n');

    if (failCount > 0) {
      console.log('⚠️  Some migrations failed. Check the errors above.');
      console.log('   You can also execute them manually at:');
      console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql\n`);
    } else {
      console.log('🎉 All migrations executed successfully!\n');
      console.log('Next steps:');
      console.log('1. Enable anonymous sign-ins in Supabase Auth settings');
      console.log('2. Configure Cloudflare R2 credentials in .env.local');
      console.log('3. Run: npm run dev\n');
    }
  } catch (error) {
    console.error(`❌ Connection failed: ${error.message || error}`);
    console.error(`   Error code: ${error.code || 'N/A'}`);
    console.error(`   Error detail: ${error.detail || 'N/A'}`);
    console.error(`   Error hint: ${error.hint || 'N/A'}`);
    console.error('\nPossible causes:');
    console.error('  - Wrong database password');
    console.error('  - Project ref mismatch');
    console.error('  - Network/firewall blocking port 5432');
    console.error('\nGet your password from:');
    console.error(`  https://supabase.com/dashboard/project/${projectRef}/settings/database\n`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
