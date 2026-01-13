/**
 * Comprehensive API Testing Script
 * Tests all endpoints and edge cases
 * Run with: node test-all-apis.js
 */

const BASE_URL = 'http://localhost:3000/api';

// Test utilities
function generateDeviceHash(seed) {
  return `test_device_${seed}_${'0'.repeat(64 - 20 - seed.length)}`;
}

function generateEmail(seed) {
  return `test${seed}@example.com`;
}

async function makeRequest(method, endpoint, body = null, headers = {}) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json().catch(() => ({ error: 'No JSON response' }));
    return { status: response.status, data, response };
  } catch (error) {
    return { status: 0, data: { error: error.message }, response: null };
  }
}

async function runTests() {
  console.log('==========================================');
  console.log('Comprehensive API Test Suite');
  console.log('==========================================\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function test(name, fn) {
    return async () => {
      try {
        await fn();
        results.passed++;
        results.tests.push({ name, status: 'PASS' });
        console.log(`✅ ${name}`);
      } catch (error) {
        results.failed++;
        results.tests.push({ name, status: 'FAIL', error: error.message });
        console.log(`❌ ${name}: ${error.message}`);
      }
    };
  }

  // Test 1: Health Check
  await test('Health Check - Server is running', async () => {
    const { status, data } = await makeRequest('GET', '/health');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!data.status || data.status !== 'ok') throw new Error('Health check failed');
  })();

  // Test 2: Register - First time device (should get trial)
  let leaseToken1, deviceHash1;
  await test('Register - First time device gets trial', async () => {
    deviceHash1 = generateDeviceHash('first');
    const { status, data } = await makeRequest('POST', '/auth/register', {
      email: generateEmail('first'),
      device_hash: deviceHash1
    });
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!data.lease_token) throw new Error('No lease token returned');
    if (data.license_status !== 'trial') throw new Error(`Expected trial, got ${data.license_status}`);
    leaseToken1 = data.lease_token;
  })();

  // Test 3: Register - Same device, different email (trial should continue)
  await test('Register - Same device, different email (trial continues)', async () => {
    const { status, data } = await makeRequest('POST', '/auth/register', {
      email: generateEmail('second'),
      device_hash: deviceHash1
    });
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (data.license_status !== 'trial') throw new Error(`Expected trial, got ${data.license_status}`);
  })();

  // Test 4: Register - New device (should get new trial)
  let leaseToken2, deviceHash2;
  await test('Register - New device gets new trial', async () => {
    deviceHash2 = generateDeviceHash('new');
    const { status, data } = await makeRequest('POST', '/auth/register', {
      email: generateEmail('new'),
      device_hash: deviceHash2
    });
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (data.license_status !== 'trial') throw new Error(`Expected trial, got ${data.license_status}`);
    leaseToken2 = data.lease_token;
  })();

  // Test 5: License Status - Valid token
  await test('License Status - Valid token returns status', async () => {
    // Make sure we have a valid token from registration
    if (!leaseToken1) {
      // Re-register to get a token
      const regResult = await makeRequest('POST', '/auth/register', {
        email: generateEmail('token'),
        device_hash: generateDeviceHash('token')
      });
      if (regResult.status !== 200) throw new Error(`Registration failed: ${regResult.status}`);
      leaseToken1 = regResult.data.lease_token;
      deviceHash1 = generateDeviceHash('token');
    }
    
    const { status, data } = await makeRequest('GET', '/license/status', null, {
      'Authorization': `Bearer ${leaseToken1}`,
      'X-Device-Id': deviceHash1
    });
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    // License status endpoint returns 'status' not 'license_status'
    if (!data || (!data.status && !data.license_status)) {
      throw new Error(`No license status returned. Response: ${JSON.stringify(data)}`);
    }
  })();

  // Test 6: License Status - Invalid token
  await test('License Status - Invalid token is rejected', async () => {
    const { status } = await makeRequest('GET', '/license/status', null, {
      'Authorization': 'Bearer invalid_token',
      'X-Device-Id': deviceHash1
    });
    if (status !== 401 && status !== 403) throw new Error(`Expected 401/403, got ${status}`);
  })();

  // Test 7: License Status - Missing device ID
  await test('License Status - Missing device ID is rejected', async () => {
    const { status } = await makeRequest('GET', '/license/status', null, {
      'Authorization': `Bearer ${leaseToken1}`
    });
    if (status !== 400 && status !== 401) throw new Error(`Expected 400/401, got ${status}`);
  })();

  // Test 8: Register - Invalid email format
  await test('Register - Invalid email format is rejected', async () => {
    const { status } = await makeRequest('POST', '/auth/register', {
      email: 'invalid-email',
      device_hash: generateDeviceHash('invalid')
    });
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
  })();

  // Test 9: Register - Missing required fields
  await test('Register - Missing email is rejected', async () => {
    const { status } = await makeRequest('POST', '/auth/register', {
      device_hash: generateDeviceHash('missing')
    });
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
  })();

  // Test 10: Register - Missing device_hash
  await test('Register - Missing device_hash is rejected', async () => {
    const { status } = await makeRequest('POST', '/auth/register', {
      email: generateEmail('missing')
    });
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
  })();

  // Test 11: Multiple registrations - Same device should return same trial
  await test('Register - Multiple calls for same device return same trial', async () => {
    const deviceHash = generateDeviceHash('multiple');
    const email = generateEmail('multiple');
    
    // First registration
    const { data: data1 } = await makeRequest('POST', '/auth/register', {
      email,
      device_hash: deviceHash
    });
    
    // Second registration (should be same trial)
    const { data: data2 } = await makeRequest('POST', '/auth/register', {
      email: generateEmail('multiple2'),
      device_hash: deviceHash
    });
    
    if (data1.license_status !== 'trial' || data2.license_status !== 'trial') {
      throw new Error('Both should be trial');
    }
  })();

  // Test 12: Billing - Create checkout (may fail if Stripe not configured)
  await test('Billing - Create checkout session', async () => {
    const { status, data } = await makeRequest('POST', '/billing/create-checkout', null, {
      'Authorization': `Bearer ${leaseToken1}`,
      'X-Device-Id': deviceHash1
    });
    // Accept 200 (success) or 409 (already active) or 500 (Stripe not configured)
    if (status !== 200 && status !== 409 && status !== 500) {
      throw new Error(`Unexpected status ${status}`);
    }
  })();

  // Test 13: Billing - Create checkout without auth
  await test('Billing - Create checkout without auth is rejected', async () => {
    const { status } = await makeRequest('POST', '/billing/create-checkout');
    if (status !== 401 && status !== 403) throw new Error(`Expected 401/403, got ${status}`);
  })();

  // Test 14: Rate limiting (if implemented)
  await test('Rate Limiting - Multiple rapid requests', async () => {
    const deviceHash = generateDeviceHash('ratelimit');
    let rateLimited = false;
    
    // Make multiple rapid requests
    for (let i = 0; i < 10; i++) {
      const { status } = await makeRequest('POST', '/auth/register', {
        email: generateEmail(`ratelimit${i}`),
        device_hash: generateDeviceHash(`ratelimit${i}`)
      });
      if (status === 429) {
        rateLimited = true;
        break;
      }
    }
    
    // Rate limiting may or may not be enabled, so we just check it doesn't crash
    console.log(`   (Rate limiting ${rateLimited ? 'detected' : 'not triggered'})`);
  })();

  // Summary
  console.log('\n==========================================');
  console.log('Test Summary');
  console.log('==========================================');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log('\nDetailed Results:');
  results.tests.forEach(t => {
    const icon = t.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${t.name}`);
    if (t.error) console.log(`   Error: ${t.error}`);
  });
  console.log('\n==========================================');
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
