# Test Suite Documentation

## Overview

Comprehensive test suite for the VisionAI License Server, proving security guarantees and correct behavior under all scenarios.

## Test Categories

### 1. Trial Lifecycle (`trial.test.js`)
- First-time device registration
- Trial expiration (exactly 14 days)
- Trial immutability (cannot be reset)
- Multiple registration attempts

### 2. Device Identity (`device.test.js`)
- Uninstall/reinstall scenarios
- Email change does not reset trial
- Device reassignment
- Multiple users on same device

### 3. Abuse Detection (`abuse.test.js`)
- Per-user device cap enforcement
- Rate limiting (per IP, per user)
- Device churn detection
- Paid user device caps

### 4. License Status & JWT (`license.test.js`)
- JWT lease token expiration
- Token tampering rejection
- Server-time authority
- License status calculation

### 5. Concurrency (`concurrency.test.js`)
- Parallel registration attempts
- Race condition prevention
- Transaction rollback
- Database uniqueness constraints

### 6. Stripe Integration (`stripe.test.js`)
- Webhook idempotency
- Subscription state updates
- Webhook signature verification
- Checkout session creation

### 7. Reconciliation (`reconciliation.test.js`)
- Missed webhook recovery
- Stripe ↔ DB state sync
- Reconciliation safety rules
- Audit logging

### 8. Failure Scenarios (`failure.test.js`)
- Invalid input handling
- Rate limiting
- Database failures
- Error handling (fail closed)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Test Database

Create a test database:

```sql
CREATE DATABASE visionai_license_test;
```

Update `.env` or create `.env.test`:

```env
NODE_ENV=test
DB_NAME=visionai_license_test
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
```

### 3. Run Migrations

```bash
npm run migrate
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npm test -- trial.test.js
```

### Run in Watch Mode

```bash
npm run test:watch
```

### Generate Coverage Report

```bash
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.js                    # Jest configuration
├── helpers/
│   ├── database.js            # DB utilities
│   ├── factories.js           # Test data factories
│   ├── stripe-mock.js         # Stripe API mocks
│   └── jwt-helper.js          # JWT token utilities
└── __tests__/
    ├── trial.test.js
    ├── device.test.js
    ├── abuse.test.js
    ├── license.test.js
    ├── concurrency.test.js
    ├── stripe.test.js
    ├── reconciliation.test.js
    └── failure.test.js
```

## Test Database Management

Tests use a separate test database (`visionai_license_test`). The test suite:

1. **Resets database** before all tests (`beforeAll`)
2. **Cleans up** between tests (`beforeEach`)
3. **Closes connections** after all tests (`afterAll`)

## Mocking

### Stripe API

Stripe API calls are mocked using `tests/helpers/stripe-mock.js`:

```javascript
const { setupDefaultStripeMocks, mockStripeClient } = require('../helpers/stripe-mock');

beforeAll(() => {
  setupDefaultStripeMocks();
});

// Customize mock responses
mockStripeClient.subscriptions.retrieve.mockResolvedValue({
  id: 'sub_test_123',
  status: 'active'
});
```

## Writing New Tests

### Test Template

```javascript
describe('Feature Name', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  beforeEach(async () => {
    // Clean up between tests
  });

  test('should do something specific', async () => {
    // Arrange
    const deviceHash = generateDeviceHash('test-device');
    
    // Act
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', device_hash: deviceHash });
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.body.license_status).toBe('trial');
  });
});
```

### Best Practices

1. **Test behavior, not implementation** - Focus on what the system does, not how
2. **Assert both API and DB** - Verify state in both layers
3. **Use descriptive test names** - "should grant trial for new device" not "should work"
4. **Clean up between tests** - Prevent test pollution
5. **Test security guarantees** - Each test should prove a security property

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test_password
          MYSQL_DATABASE: visionai_license_test
        ports:
          - 3306:3306
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run migrate
      - run: npm test
```

## Troubleshooting

### Tests Fail with "Database connection error"

- Verify test database exists
- Check `.env` or test environment variables
- Ensure MySQL is running

### Tests Fail with "Table doesn't exist"

- Run migrations: `npm run migrate`
- Check `NODE_ENV=test` is set

### Stripe Mock Errors

- Ensure `setupDefaultStripeMocks()` is called in `beforeAll`
- Check mock implementations in `tests/helpers/stripe-mock.js`

## Coverage Goals

- **Line Coverage**: > 80%
- **Branch Coverage**: > 75%
- **Critical Paths**: 100% (trial logic, abuse detection, Stripe integration)

## Security Test Checklist

- [x] Trials cannot be reset
- [x] Reinstall does not bypass licensing
- [x] Race conditions are handled
- [x] Stripe integration is idempotent
- [x] Abuse mitigations are enforced
- [x] System fails closed
- [x] Server-time authority is enforced
- [x] JWT lease tokens expire correctly
