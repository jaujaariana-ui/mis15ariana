// Script de diagnóstico para el email de recuperación de contraseña
// Ejecutar: npx tsx scripts/diagnose-forgot-password.ts

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
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const TEST_EMAIL = 'jauja.ariana@gmail.com';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function main() {
  console.log('=== Diagnóstico de recuperación de contraseña ===\n');
  
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log(`📧 Email a verificar: ${TEST_EMAIL}`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);

  // Crear cliente admin con Service Role Key
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 1. Verificar si el usuario existe en Auth
  console.log('1️⃣  Verificando si el usuario existe en Supabase Auth...');
  const { data: users, error: listError } = await adminClient.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error al listar usuarios:', listError.message);
    process.exit(1);
  }

  const foundUser = users.users.find(u => u.email === TEST_EMAIL);
  
  if (!foundUser) {
    console.error(`❌ El email ${TEST_EMAIL} NO está registrado en Supabase Auth.`);
    console.log('\n💡 Solución: Regístrate primero en /admin/register o pide al administrador que te agregue.');
    process.exit(1);
  }

  console.log('✅ Usuario encontrado:');
  console.log(`   - ID: ${foundUser.id}`);
  console.log(`   - Email: ${foundUser.email}`);
  console.log(`   - Email verificado: ${foundUser.email_confirmed_at ? '✅ Sí' : '❌ No'}`);
  console.log(`   - Creado: ${foundUser.created_at}`);
  console.log(`   - Último login: ${foundUser.last_sign_in_at || 'Nunca'}\n`);

  // 2. Verificar la configuración de email
  console.log('2️⃣  Verificando configuración de email...');
  
  // Intentar obtener la configuración de email a través de la API
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/config`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const config = await response.json();
      console.log('✅ Configuración de email:');
      console.log(`   - Email enabled: ${config.mailer?.enabled ? 'Sí' : 'No'}`);
      console.log(`   - JWT expiry: ${config.jwt?.exp || 'N/A'}`);
      console.log(`   - Secure cookie: ${config.cookie?.secure || 'N/A'}`);
    } else {
      console.log('⚠️  No se pudo obtener la configuración de email (esto es normal)');
    }
  } catch (err) {
    console.log('⚠️  No se pudo verificar la configuración de email');
  }

  // 3. Probar enviar el email de recuperación
  console.log('\n3️⃣  Probando envío de email de recuperación...');
  const redirectTo = `${BASE_URL}/auth/callback`;
  console.log(`   - Redirect URL: ${redirectTo}`);

  const { error: resetError } = await adminClient.auth.admin.inviteUserByEmail(TEST_EMAIL, {
    data: { test: true }
  });

  if (resetError) {
    console.error('❌ Error al intentar enviar email:', resetError.message);
    console.error('   Error code:', resetError.code || resetError.status);
  } else {
    console.log('✅ Email de invitación enviado exitosamente (prueba)');
  }

  // 4. Intentar resetPasswordForEmail directamente
  console.log('\n4️⃣  Probando resetPasswordForEmail directamente...');
  
  // Usar el cliente anon para simular el comportamiento real
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  
  const { error: passwordResetError } = await anonClient.auth.resetPasswordForEmail(TEST_EMAIL, {
    redirectTo
  });

  if (passwordResetError) {
    console.error('❌ Error al enviar email de recuperación:', passwordResetError.message);
    console.error('   Error code:', passwordResetError.code || passwordResetError.status);
    
    if (passwordResetError.message.includes('rate limit') || passwordResetError.message.includes('too many')) {
      console.log('\n⚠️  Límite de intentos excedido. Espera unos minutos e intenta de nuevo.');
    }
  } else {
    console.log('✅ Email de recuperación enviado exitosamente');
    console.log('   Revisa tu bandeja de entrada y spam');
  }

  console.log('\n=== Diagnóstico completado ===\n');
  
  console.log('📋 Resumen de verificaciones:');
  console.log('   1. Verifica que la URL de redirección en Supabase coincide con:', BASE_URL);
  console.log('   2. Revisa la carpeta de spam/promociones en Gmail');
  console.log('   3. Si usas el email por defecto de Supabase, puede tardar hasta 5 minutos');
  console.log('   4. Si el email no llega después de 10 minutos, verifica la configuración SMTP en Supabase');
  console.log('   5. En Supabase Dashboard → Project Settings → API → Site URL debe ser:', BASE_URL);
}

main().catch(console.error);
