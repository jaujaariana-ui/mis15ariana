// Test script for guest flow verification
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

async function createTestOrganizer() {
  console.log('\n=== Creando organizador de prueba ===');
  
  // Create a user in Supabase Auth - the trigger will auto-create the organizer record
  const email = 'test-organizer-' + Date.now() + '@xaltmoments.local';
  const password = 'TestPass123!';
  
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'Organizador de Prueba' },
  });
  
  if (userError || !userData.user) {
    console.error('❌ Error creando usuario:', userError?.message || 'Unknown error');
    return null;
  }
  
  const authUserId = userData.user.id;
  console.log('✅ Usuario Auth creado:', authUserId.slice(0, 12) + '...');
  
  // Wait a moment for the trigger to create the organizer record
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Verify organizer was created by the trigger
  const { data: organizer, error: orgError } = await admin
    .from('organizers')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();
  
  if (orgError || !organizer) {
    console.error('⚠️  Organizador no creado por trigger, creando manualmente...');
    const { error: insertError } = await admin
      .from('organizers')
      .insert({ auth_user_id: authUserId, email });
    if (insertError) {
      console.error('❌ Error creando organizador:', insertError.message);
      return null;
    }
    // Fetch the newly created organizer
    const { data: newOrg } = await admin
      .from('organizers')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();
    if (newOrg) {
      console.log('✅ Organizador creado manualmente');
      return newOrg.id; // Return organizer.id (referenced by events.organizer_id)
    }
    return null;
  }
  
  console.log('✅ Organizador listo');
  return organizer.id; // Return organizer.id (referenced by events.organizer_id)
}

async function createTestEvent(organizerId) {
  console.log('\n=== Creando evento de prueba ===');
  
  const { data, error } = await admin
    .from('events')
    .insert({
      name: 'Quinceañera de Prueba',
      slug: 'prueba-' + Date.now(),
      description: 'Evento de prueba para verificar guest flow',
      organizer_id: organizerId,
      status: 'active',
      max_photos_per_guest: 20,
      max_file_size_mb: 10,
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error creando evento:', error.message);
    return null;
  }
  
  console.log('✅ Evento creado:', data.id.slice(0, 12) + '...');
  console.log('   Slug:', data.slug);
  return data;
}

async function checkEvents() {
  console.log('\n=== Verificando eventos ===');
  const { data: events, error } = await admin.from('events').select('*');
  if (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
  
  if (!events || events.length === 0) {
    console.log('⚠️  No hay eventos en la base de datos, creando uno de prueba...');
    const organizerId = await createTestOrganizer();
    if (organizerId) {
      return await createTestEvent(organizerId);
    }
    return null;
  }
  
  const active = events.filter(e => e.status === 'active');
  console.log(`✅ ${events.length} eventos encontrados (${active.length} activos)`);
  
  active.forEach(e => {
    console.log(`  - ID: ${e.id.slice(0, 12)}...`);
    console.log(`    Slug: ${e.slug}`);
    console.log(`    Status: ${e.status}`);
  });
  
  return active[0];
}

async function checkGuestProfiles() {
  console.log('\n=== Verificando guest profiles ===');
  const { count, error } = await admin
    .from('guest_profiles')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  console.log(`📊 Guest profiles: ${count || 0}`);
}

async function testGuestAPI(eventId) {
  console.log('\n=== Probando API de guest ===');
  const baseUrl = 'http://localhost:3000';
  
  // Test 1: Create guest profile
  console.log('\n1. Creando perfil de invitado...');
  try {
    const createResp = await fetch(`${baseUrl}/api/guest/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: 'Invitado de Prueba',
        event_id: eventId,
      }),
    });
    
    const createData = await createResp.json();
    console.log(`   Status: ${createResp.status}`);
    
    if (createResp.ok && createData.profile) {
      console.log(`   ✅ Perfil creado: ${createData.profile.display_name}`);
      console.log(`   ID: ${createData.profile.id.slice(0, 12)}...`);
      
      // Check if Set-Cookie header is present
      const setCookie = createResp.headers.get('set-cookie');
      if (setCookie && setCookie.includes('xalt_guest_token')) {
        console.log('   ✅ Cookie xalt_guest_token establecida');
      } else {
        console.log('   ⚠️  Cookie no encontrada en respuesta');
      }
      
      // Test 2: Get guest profile
      console.log('\n2. Obteniendo perfil con cookie...');
      if (setCookie) {
        const tokenMatch = setCookie.match(/xalt_guest_token=([^;]+)/);
        if (tokenMatch) {
          const token = tokenMatch[1];
          
          const getResp = await fetch(`${baseUrl}/api/guest/profile?event_id=${eventId}`, {
            headers: { 'Cookie': `xalt_guest_token=${token}` },
          });
          
          const getData = await getResp.json();
          console.log(`   Status: ${getResp.status}`);
          
          if (getResp.ok && getData.profile) {
            console.log(`   ✅ Perfil obtenido: ${getData.profile.display_name}`);
          } else {
            console.log('   ❌ No se pudo obtener el perfil');
            console.log('   Respuesta:', JSON.stringify(getData));
          }
        }
      }
      
      // Test 3: Check Supabase Auth - should NOT have created a user
      console.log('\n3. Verificando que NO se creó usuario en Supabase Auth...');
      const { data: users } = await admin.auth.admin.listUsers(1, 100);
      const tempUsers = users?.users.filter(u => 
        u.email && u.email.includes('@temp.xaltmoments.local')
      ) || [];
      
      if (tempUsers.length === 0) {
        console.log('   ✅ No se crearon usuarios temporales en Supabase Auth');
      } else {
        console.log(`   ⚠️  Se encontraron ${tempUsers.length} usuarios temporales`);
      }
      
    } else {
      console.log('   ❌ Error al crear perfil');
      console.log('   Respuesta:', JSON.stringify(createData));
    }
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }
}

async function main() {
  console.log('========================================');
  console.log('  Xalt Moments - Verificación de Guest Flow');
  console.log('========================================');
  
  await checkGuestProfiles();
  const event = await checkEvents();
  
  if (event) {
    await testGuestAPI(event.id);
  } else {
    console.log('\n⚠️  No hay eventos activos para probar');
    console.log('   Crea un evento primero desde el panel admin');
  }
  
  console.log('\n========================================');
  console.log('  Verificación completada');
  console.log('========================================');
}

main().catch(console.error);
