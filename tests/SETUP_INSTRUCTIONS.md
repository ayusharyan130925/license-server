# Test Suite Setup Instructions

## Quick Start

### 1. Install Test Dependencies

```bash
npm install
```

This installs:
- `jest` - Testing framework
- `supertest` - HTTP assertion library

### 2. Create Test Database

```sql
CREATE DATABASE visionai_license_test;
```

### 3. Configure Test Environment

The test suite automatically uses these environment variables (set in `tests/setup.js`):

```env
NODE_ENV=test
DB_NAME=visionai_license_test
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
```

You can override these by setting them in your environment or `.env` file.

### 4. Run Migrations

```bash
npm run migrate
```

This creates all tables in the test database.

### 5. Run Tests

```bash
npm test
```

## Test Database Management

The test suite automatically:
- **Resets database** before all tests (drops and recreates tables)
- **Cleans up** between test files (removes test data)
- **Uses transactions** where possible for isolation

## Running Specific Tests

```bash
# Single test file
npm test -- trial.test.js

# Tests matching pattern
npm test -- --testNamePattern="trial"

# Watch mode (re-runs on file changes)
npm run test:watch
```

## Coverage Report

```bash
npm run test:coverage
```

Generates coverage report in `coverage/` directory.

## Troubleshooting

### "Database connection failed"

- Verify MySQL is running
- Check test database exists: `SHOW DATABASES;`
- Verify credentials in environment

### "Table doesn't exist"

- Run migrations: `npm run migrate`
- Check `NODE_ENV=test` is set

### "Jest not found"

- Install dependencies: `npm install`
- Verify `jest` is in `node_modules/`

### Tests hang or timeout

- Check database connection
- Verify no other process is using test database
- Increase timeout in `jest.config.js` if needed

## CI/CD Integration

Tests are designed to run in CI/CD. Example GitHub Actions:

```yaml
- name: Setup MySQL
  run: |
    sudo systemctl start mysql
    mysql -e "CREATE DATABASE visionai_license_test;"
    mysql -e "GRANT ALL ON visionai_license_test.* TO 'root'@'localhost';"

- name: Run tests
  run: |
    npm install
    npm run migrate
    npm test
```

## Test Structure

```
tests/
├── setup.js              # Jest configuration
├── helpers/
│   ├── database.js       # DB utilities
│   ├── factories.js      # Test data
│   ├── stripe-mock.js    # Stripe mocks
│   └── jwt-helper.js    # JWT utilities
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

## Expected Test Results

All tests should pass. A passing test suite proves:

✅ Trials cannot be reset
✅ Reinstall does not bypass licensing  
✅ Race conditions are handled
✅ Stripe integration is idempotent
✅ Abuse mitigations are enforced
✅ System fails closed
✅ Server-time authority is enforced
