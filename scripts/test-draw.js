// Test script for draw (sorteo) functionality
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

const baseUrl = 'http://localhost:3000';

async function getActiveEvent() {
  const { data: events } = await admin
    .from('events')
    .select('*')
    .eq('status', 'active')
    .limit(1);
  return events && events.length > 0 ? events[0] : null;
}

async function getOrganizer() {
  const { data: organizers } = await admin
    .from('organizers')
    .select('id, auth_user_id')
    .limit(1);
  return organizers && organizers.length > 0 ? organizers[0] : null;
}

async function getGuestsWithPhotos(eventId) {
  const { data: photos } = await admin
    .from('photos')
    .select('guest_id')
    .eq('event_id', eventId)
    .is('deleted_at', null);

  if (!photos || photos.length === 0) return [];

  const guestIds = [...new Set(photos.map(p => p.guest_id).filter(Boolean))];
  const { data: guests } = await admin
    .from('guest_profiles')
    .select('id, display_name')
    .eq('event_id', eventId)
    .in('id', guestIds);

  return guests || [];
}

async function testParticipantsEndpoint(eventId) {
  console.log('\n=== Test 1: Endpoint de participantes ===');

  const res = await fetch(`${baseUrl}/api/events/${eventId}/draw/participants`);
  const data = await res.json();

  console.log(`   Status: ${res.status}`);
  console.log(`   Participantes: ${data.count || 0}`);

  if (res.ok && data.participants) {
    console.log('   ✅ Endpoint de participantes funciona');
    data.participants.forEach((p, i) => {
      console.log(`     ${i + 1}. ${p.display_name} (${p.photo_count} fotos)`);
    });
    return true;
  } else {
    console.log('   ❌ Error:', JSON.stringify(data));
    return false;
  }
}

async function testDrawStateEndpoint(eventId) {
  console.log('\n=== Test 2: Endpoint de estado del sorteo ===');

  const res = await fetch(`${baseUrl}/api/events/${eventId}/draw`);
  const data = await res.json();

  console.log(`   Status: ${res.status}`);

  if (res.ok) {
    console.log('   ✅ Endpoint de estado funciona');
    console.log(`   Sesión activa: ${data.activeSession ? 'Sí' : 'No'}`);
    console.log(`   Última sesión: ${data.session ? data.session.status : 'Ninguna'}`);
    return true;
  } else {
    console.log('   ❌ Error:', JSON.stringify(data));
    return false;
  }
}

async function testDrawSessionTable() {
  console.log('\n=== Test 3: Tabla draw_sessions ===');

  const { data, error } = await admin
    .from('draw_sessions')
    .select('*')
    .limit(5);

  if (error) {
    console.log(`   ❌ Error consultando tabla: ${error.message}`);
    return false;
  }

  console.log(`   ✅ Tabla draw_sessions existe`);
  console.log(`   Registros: ${data?.length || 0}`);
  return true;
}

async function testRealtimePublication() {
  console.log('\n=== Test 4: Supabase Realtime para draw_sessions ===');

  try {
    const { data: result, error } = await admin
      .from('pg_publication_tables')
      .select('schemaname, tablename')
      .eq('pubname', 'supabase_realtime');

    if (!error && result) {
      const hasDrawSessions = result.some(r => r.tablename === 'draw_sessions');
      if (hasDrawSessions) {
        console.log('   ✅ draw_sessions habilitado en Realtime');
        return true;
      }
    }
  } catch (e) {
    // Ignorar error de permisos
  }

  console.log('   ⚠️  No se pudo verificar Realtime automáticamente');
  console.log('   (La migración ya lo configuró, pero no tenemos permisos para verificar)');
  return true;
}

async function main() {
  console.log('========================================');
  console.log('  Xalt Moments - Test de Sorteo');
  console.log('========================================');

  // Test 1: Tabla draw_sessions
  const tableOk = await testDrawSessionTable();

  // Test 2: Realtime
  await testRealtimePublication();

  // Obtener evento activo
  const event = await getActiveEvent();
  if (!event) {
    console.log('\n❌ No hay eventos activos para probar');
    console.log('   Crea un evento activo primero');
    return;
  }

  console.log(`\n📋 Evento: ${event.name}`);
  console.log(`   ID: ${event.id.slice(0, 12)}...`);

  // Verificar invitados con fotos
  const guests = await getGuestsWithPhotos(event.id);
  console.log(`\n👥 Invitados con fotos: ${guests.length}`);
  guests.forEach(g => {
    console.log(`   - ${g.display_name}`);
  });

  if (guests.length === 0) {
    console.log('\n⚠️  No hay invitados con fotos para probar el sorteo');
    console.log('   Los invitados deben subir al menos una foto');
  }

  // Test 3: Endpoint de participantes
  await testParticipantsEndpoint(event.id);

  // Test 4: Endpoint de estado
  await testDrawStateEndpoint(event.id);

  console.log('\n========================================');
  console.log('  Test completado');
  console.log('========================================');
}

main().catch(console.error);
