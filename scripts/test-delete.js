require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

async function testDelete() {
  const photoId = '9d8c7227-093d-4b23-b832-139e0aaf888e';
  const supabaseHostname = new URL(supabaseUrl).hostname.split('.')[0];
  const cookieName = `sb-${supabaseHostname}-auth-token`;

  // Step 1: Create a guest profile to get session
  console.log('Step 1: Creating guest profile...');
  const createResp = await fetch('http://localhost:3000/api/guest/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      display_name: 'test-delete-3',
      event_id: 'adff9d91-aa71-4aba-a1d4-7b21a946a117',
    }),
  });
  const createData = await createResp.json();
  console.log('Profile:', JSON.stringify(createData.profile, null, 2));
  console.log('Session keys:', Object.keys(createData.session || {}));

  if (!createData.session || !createData.session.access_token) {
    console.error('No session returned');
    process.exit(1);
  }

  const at = createData.session.access_token;
  const rt = createData.session.refresh_token;

  // Step 2: Build the auth token cookie value (JSON serialized, same as Supabase does)
  const tokenValue = JSON.stringify({
    access_token: at,
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: rt,
    expires: Date.now() + 3600 * 1000,
    user: {},
  });

  // Step 3: Try DELETE with the cookie
  console.log('\nStep 2: Deleting photo with cookie...');
  const cookieJar = `${cookieName}=${encodeURIComponent(tokenValue)}`;
  console.log('Cookie name:', cookieName);

  const deleteResp = await fetch(`http://localhost:3000/api/photos/${photoId}`, {
    method: 'DELETE',
    headers: {
      'Cookie': cookieJar,
    },
  });
  const deleteData = await deleteResp.json();
  console.log('Delete status:', deleteResp.status);
  console.log('Delete response:', JSON.stringify(deleteData, null, 2));
}

testDelete().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
