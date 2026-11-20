// Test script for guest photo upload and delete flow
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const guestTokenSecret = process.env.GUEST_TOKEN_SECRET || serviceRoleKey || 'xalt-moments-guest-secret';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltan credenciales de Supabase');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const baseUrl = 'http://localhost:3000';

async function getActiveEvent() {
  const { data: events } = await admin.from('events').select('*').eq('status', 'active').limit(1);
  return events && events.length > 0 ? events[0] : null;
}

async function createGuestProfile(eventId) {
  const resp = await fetch(`${baseUrl}/api/guest/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      display_name: 'Invitado Foto Test',
      event_id: eventId,
    }),
  });
  const data = await resp.json();
  const setCookie = resp.headers.get('set-cookie');
  let token = null;
  if (setCookie) {
    const match = setCookie.match(/xalt_guest_token=([^;]+)/);
    if (match) token = match[1];
  }
  return { profile: data.profile, token, status: resp.status };
}

async function testUploadFlow(eventId, guestId, token) {
  console.log('\n=== Probando upload de foto ===');
  
  // Step 1: Get upload URL from Cloudinary directly
  console.log('1. Obteniendo upload signature de Cloudinary...');
  const uploadUrlResp = await fetch(`${baseUrl}/api/photos/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `xalt_guest_token=${token}`,
    },
    body: JSON.stringify({
      event_id: eventId,
      guest_id: guestId,
      mime_type: 'image/jpeg',
      original_filename: 'test-photo.jpg',
    }),
  });
  
  const uploadUrlData = await uploadUrlResp.json();
  console.log(`   Status: ${uploadUrlResp.status}`);
  
  if (uploadUrlResp.ok) {
    console.log('   ✅ Upload URL obtenida');
    console.log(`   Timestamp: ${uploadUrlData.timestamp}`);
    
    // Step 2: Register photo in database
    console.log('\n2. Registrando foto en la base de datos...');
    const registerResp = await fetch(`${baseUrl}/api/photos/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `xalt_guest_token=${token}`,
      },
      body: JSON.stringify({
        event_id: eventId,
        guest_id: guestId,
        storage_key: `test-photo-${Date.now()}.jpg`,
        original_filename: 'test-photo.jpg',
        mime_type: 'image/jpeg',
        file_size: 1024,
      }),
    });
    
    const registerData = await registerResp.json();
    console.log(`   Status: ${registerResp.status}`);
    
    if (registerResp.ok && registerData.photo) {
      console.log('   ✅ Foto registrada');
      console.log(`   ID: ${registerData.photo.id.slice(0, 12)}...`);
      return registerData.photo;
    } else {
      console.log('   ❌ Error al registrar foto');
      console.log('   Respuesta:', JSON.stringify(registerData));
      return null;
    }
  } else {
    console.log('   ❌ Error al obtener upload URL');
    console.log('   Respuesta:', JSON.stringify(uploadUrlData));
    return null;
  }
}

async function testDeletePhoto(photoId, token) {
  console.log('\n=== Probando delete de foto ===');
  
  const resp = await fetch(`${baseUrl}/api/photos/${photoId}`, {
    method: 'DELETE',
    headers: {
      'Cookie': `xalt_guest_token=${token}`,
    },
  });
  
  const data = await resp.json();
  console.log(`   Status: ${resp.status}`);
  
  if (resp.ok && data.success) {
    console.log('   ✅ Foto eliminada correctamente');
    return true;
  } else {
    console.log('   ❌ Error al eliminar foto');
    console.log('   Respuesta:', JSON.stringify(data));
    return false;
  }
}

async function testDeleteWithoutAuth(photoId) {
  console.log('\n=== Probando delete sin autenticación (debe fallar) ===');
  
  const resp = await fetch(`${baseUrl}/api/photos/${photoId}`, {
    method: 'DELETE',
  });
  
  const data = await resp.json();
  console.log(`   Status: ${resp.status}`);
  
  if (resp.status === 401) {
    console.log('   ✅ Correctamente rechazado (401)');
    return true;
  } else {
    console.log('   ⚠️  Status inesperado:', resp.status);
    console.log('   Respuesta:', JSON.stringify(data));
    return false;
  }
}

async function testDeleteWithWrongToken(photoId, eventId) {
  console.log('\n=== Probando delete con token de otro guest (debe fallar) ===');
  
  // Create another guest
  const { token: otherToken } = await createGuestProfile(eventId);
  if (!otherToken) {
    console.log('   ⚠️  No se pudo crear otro guest');
    return false;
  }
  
  const resp = await fetch(`${baseUrl}/api/photos/${photoId}`, {
    method: 'DELETE',
    headers: {
      'Cookie': `xalt_guest_token=${otherToken}`,
    },
  });
  
  const data = await resp.json();
  console.log(`   Status: ${resp.status}`);
  
  if (resp.status === 403) {
    console.log('   ✅ Correctamente rechazado (403) - no es su foto');
    return true;
  } else {
    console.log('   ⚠️  Status inesperado:', resp.status);
    console.log('   Respuesta:', JSON.stringify(data));
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('  Xalt Moments - Test de Fotos Guest');
  console.log('========================================');
  
  const event = await getActiveEvent();
  if (!event) {
    console.log('❌ No hay eventos activos');
    return;
  }
  console.log(`\n📋 Evento: ${event.name}`);
  console.log(`   ID: ${event.id.slice(0, 12)}...`);
  
  // Create guest profile
  console.log('\n=== Creando perfil de invitado ===');
  const { profile, token, status } = await createGuestProfile(event.id);
  
  if (!profile || !token) {
    console.log(`❌ Error al crear perfil (status: ${status})`);
    return;
  }
  
  console.log(`✅ Perfil creado: ${profile.display_name}`);
  console.log(`   ID: ${profile.id.slice(0, 12)}...`);
  console.log(`   Token: ${token.slice(0, 20)}...`);
  
  // Verify token
  const payload = jwt.verify(token, guestTokenSecret);
  console.log(`   Token payload: guest_id=${payload.guest_id.slice(0, 12)}...`);
  
  let photoId = null;
  
  // Test upload flow
  const photo = await testUploadFlow(event.id, profile.id, token);
  if (photo) {
    photoId = photo.id;
  }
  
  // Test delete without auth
  if (photoId) {
    await testDeleteWithoutAuth(photoId);
  }
  
  // Test delete with wrong token
  if (photoId) {
    await testDeleteWithWrongToken(photoId, event.id);
  }
  
  // Test delete with correct token
  if (photoId) {
    const deleted = await testDeletePhoto(photoId, token);
    
    // Verify soft delete
    if (deleted) {
      console.log('\n=== Verificando soft delete en DB ===');
      const { data: photoInDb } = await admin
        .from('photos')
        .select('deleted_at')
        .eq('id', photoId)
        .single();
      
      if (photoInDb && photoInDb.deleted_at) {
        console.log('   ✅ Foto marcada como eliminada en DB');
      } else {
        console.log('   ⚠️  Foto no marcada como eliminada');
      }
    }
  }
  
  // Cleanup: delete test guest profile
  console.log('\n=== Limpieza ===');
  const { error: delError } = await admin
    .from('guest_profiles')
    .delete()
    .eq('id', profile.id);
  
  if (delError) {
    console.log(`⚠️  Error limpiando guest: ${delError.message}`);
  } else {
    console.log('✅ Perfil de prueba eliminado');
  }
  
  console.log('\n========================================');
  console.log('  Test completado');
  console.log('========================================');
}

main().catch(console.error);
