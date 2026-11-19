require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

async function createTestEvent() {
  const testEmail = 'test@example.com';
  const testPassword = 'password123';

  // Use anon client to login
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  console.log('Logging in as test user...');
  const { data: loginData, error: loginError } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (loginError) {
    console.error('Login failed:', loginError.message);
    process.exit(1);
  }
  console.log('✓ Logged in successfully');

  // Use admin client to create event directly in DB
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Find organizer
  const { data: organizer, error: orgError } = await adminClient
    .from('organizers')
    .select('id')
    .eq('email', testEmail)
    .single();

  if (orgError || !organizer) {
    console.error('Organizer not found:', orgError?.message);
    process.exit(1);
  }
  console.log('✓ Organizer found:', organizer.id);

  // Check if test event already exists
  const { data: existingEvents } = await adminClient
    .from('events')
    .select('id')
    .ilike('name', 'Test Event for E2E%')
    .limit(1);

  if (existingEvents && existingEvents.length > 0) {
    console.log('✓ Test event already exists:', existingEvents[0].id);
    return;
  }

  // Create test event
  const eventId = uuidv4();
  const eventName = `Test Event for E2E ${Date.now()}`;
  const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  console.log('Creating test event with ID:', eventId);

  const { data: event, error: eventError } = await adminClient
    .from('events')
    .insert({
      id: eventId,
      name: eventName,
      slug,
      description: 'Auto-generated test event for E2E tests',
      status: 'active',
      organizer_id: organizer.id,
    })
    .select()
    .single();

  if (eventError) {
    console.error('Failed to create event:', eventError.message);
    process.exit(1);
  }

  console.log('✓ Test event created successfully');
  console.log('Event:', JSON.stringify(event, null, 2));
}

createTestEvent().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
