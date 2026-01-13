/**
 * API Testing Script for VisionAI License Server
 * Run with: node test-api.js
 */

const BASE_URL = 'http://localhost:3000/api';
const DEVICE_HASH = 'test_device_hash_1234567890123456789012345678901234567890123456789012345678901234';

async function testAPI() {
  console.log('==========================================');
  console.log('VisionAI License Server API Testing');
  console.log('==========================================\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log(JSON.stringify(healthData, null, 2));
    console.log('\n---\n');

    // Test 2: Register User-Device
    console.log('2. Registering User-Device Pair...');
    const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        device_hash: DEVICE_HASH
      })
    });

    const registerData = await registerResponse.json();
    console.log(`Status: ${registerResponse.status}`);
    console.log(JSON.stringify(registerData, null, 2));
    
    if (!registerResponse.ok) {
      console.error(`\n❌ Registration failed with status ${registerResponse.status}`);
      console.error('This might be because database migrations haven\'t been run.');
      console.error('Run: npm run migrate\n');
    }

    if (!registerData.lease_token) {
      console.error('❌ Failed to get lease token. Exiting.');
      return;
    }

    const leaseToken = registerData.lease_token;
    console.log(`\n✓ Lease Token: ${leaseToken.substring(0, 50)}...`);
    console.log('\n---\n');

    // Test 3: Check License Status
    console.log('3. Checking License Status...');
    const statusResponse = await fetch(`${BASE_URL}/license/status`, {
      headers: {
        'Authorization': `Bearer ${leaseToken}`,
        'X-Device-Id': DEVICE_HASH
      }
    });

    const statusData = await statusResponse.json();
    console.log(JSON.stringify(statusData, null, 2));
    console.log('\n---\n');

    // Test 4: Create Checkout (if Stripe is configured)
    console.log('4. Creating Stripe Checkout Session...');
    const checkoutResponse = await fetch(`${BASE_URL}/billing/create-checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${leaseToken}`,
        'X-Device-Id': DEVICE_HASH
      }
    });

    const checkoutData = await checkoutResponse.json();
    console.log(JSON.stringify(checkoutData, null, 2));

    if (checkoutData.checkout_url) {
      console.log(`\n✓ Checkout URL: ${checkoutData.checkout_url}`);
    } else {
      console.log('\n⚠ Stripe not configured or error occurred');
    }

    console.log('\n==========================================');
    console.log('Testing Complete!');
    console.log('==========================================');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run tests
testAPI();
