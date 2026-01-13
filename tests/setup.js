/**
 * Jest Test Setup
 * 
 * Configures test database and global test utilities
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Set test environment
process.env.NODE_ENV = 'test';

// Test database configuration
process.env.DB_NAME = process.env.TEST_DB_NAME || process.env.DB_NAME || 'visionai_desktop_license';
process.env.DB_HOST = process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.TEST_DB_USER || process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'root';

// JWT secret for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_change_in_production';

// Stripe test keys (will be mocked)
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock';
process.env.STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_test_mock';

// Suppress console logs during tests (optional)
// global.console = { ...console, log: jest.fn(), error: jest.fn() };
