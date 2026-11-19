require('dotenv').config({ path: '.env.local' });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function setupTestUser() {
  const testEmail = 'test@example.com';
  const testPassword = 'password123';

  console.log(`Setting up test user: ${testEmail}`);

  // Try to register the test user
  const response = await fetch(`${APP_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });

  const data = await response.json();
  console.log(`Status: ${response.status}`);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.status === 201) {
    console.log('✓ Test user created successfully');
  } else if (response.status === 409) {
    console.log('✓ Test user already exists');
  } else {
    console.error('✗ Failed to create test user');
    process.exit(1);
  }

  // Try to login to verify
  console.log('\nVerifying login...');
  const loginResponse = await fetch(`${APP_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });

  if (loginResponse.ok) {
    console.log('✓ Login verified successfully');
  } else {
    console.log('⚠ Login endpoint may not exist - trying Supabase directly via browser would be needed');
  }
}

setupTestUser().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
