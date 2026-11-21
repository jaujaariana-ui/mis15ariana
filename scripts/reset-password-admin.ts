// Script para resetear la contraseña directamente usando la Service Role Key
// Ejecutar: npx tsx scripts/reset-password-admin.ts "nueva_contraseña"
// Nota: Esto solo funciona con la Service Role Key (admin access)

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Cargar .env.local desde la raíz del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '..', '.env.local');
config({ path: envPath });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TEST_EMAIL = 'jauja.ariana@gmail.com';

async function main() {
  const newPassword = process.argv[2];
  
  if (!newPassword) {
    console.log('=== Resetear contraseña (Admin) ===\n');
    console.log('Uso: npx tsx scripts/reset-password-admin.ts "nueva_contraseña"\n');
    console.log('Ejemplo: npx tsx scripts/reset-password-admin.ts "MiContraseña123!"\n');
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error('❌ La contraseña debe tener al menos 6 caracteres');
    process.exit(1);
  }

  console.log('=== Resetear contraseña (Admin) ===\n');
  console.log(`📧 Email: ${TEST_EMAIL}`);
  console.log(`🔑 Nueva contraseña: ${'*'.repeat(newPassword.length)}\n`);

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Faltan variables de entorno');
    process.exit(1);
  }

  // Crear cliente admin con Service Role Key
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 1. Encontrar el usuario
  console.log('1️⃣  Buscando usuario...');
  const { data: users, error: listError } = await adminClient.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error al listar usuarios:', listError.message);
    process.exit(1);
  }

  const foundUser = users.users.find(u => u.email === TEST_EMAIL);
  
  if (!foundUser) {
    console.error(`❌ El email ${TEST_EMAIL} NO está registrado`);
    process.exit(1);
  }

  console.log(`✅ Usuario encontrado: ${foundUser.id}\n`);

  // 2. Resetear la contraseña
  console.log('2️⃣  Reseteando contraseña...');
  
  const { data, error: updateError } = await adminClient.auth.admin.updateUserById(
    foundUser.id,
    { password: newPassword }
  );

  if (updateError) {
    console.error('❌ Error al resetear contraseña:', updateError.message);
    process.exit(1);
  }

  console.log('✅ Contraseña reseteada exitosamente!\n');
  console.log('📋 Resumen:');
  console.log(`   - Email: ${data.user.email}`);
  console.log(`   - Contraseña: ${'*'.repeat(newPassword.length)}`);
  console.log(`   - Puedes iniciar sesión con la nueva contraseña en /admin/login\n`);
}

main().catch(console.error);
