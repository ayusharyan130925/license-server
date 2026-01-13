/**
 * Database Test Helpers
 * 
 * Utilities for managing test database state
 */

const db = require('../../src/models');
const { sequelize } = db;

/**
 * Drop and recreate all tables (clean slate)
 * SECURITY: Only use in test environment
 */
async function resetDatabase() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetDatabase() can only be called in test environment');
  }

  // Drop all tables in reverse order of dependencies
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  
  await sequelize.query('DROP TABLE IF EXISTS risk_events');
  await sequelize.query('DROP TABLE IF EXISTS device_creation_limits');
  await sequelize.query('DROP TABLE IF EXISTS webhook_events');
  await sequelize.query('DROP TABLE IF EXISTS device_users');
  await sequelize.query('DROP TABLE IF EXISTS subscriptions');
  await sequelize.query('DROP TABLE IF EXISTS devices');
  await sequelize.query('DROP TABLE IF EXISTS users');
  await sequelize.query('DROP TABLE IF EXISTS SequelizeMeta');
  
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

  // Run migrations to recreate tables
  // Use Sequelize CLI via child process
  const { execSync } = require('child_process');
  const path = require('path');
  
  try {
    // Run migrations with test environment
    execSync('npx sequelize-cli db:migrate', { 
      env: { 
        ...process.env, 
        NODE_ENV: 'test',
        DB_NAME: process.env.TEST_DB_NAME || process.env.DB_NAME || 'visionai_license_test'
      },
      stdio: 'pipe',
      cwd: path.resolve(__dirname, '../..')
    });
  } catch (error) {
    // If migrations fail, log but continue (might be first run or tables already exist)
    console.warn('Migration warning (may be expected):', error.message);
  }
}

/**
 * Close database connection
 */
async function closeDatabase() {
  await sequelize.close();
}

/**
 * Start a transaction for test isolation
 * @returns {Promise<Transaction>}
 */
async function startTransaction() {
  return await sequelize.transaction();
}

/**
 * Rollback a transaction
 * @param {Transaction} transaction
 */
async function rollbackTransaction(transaction) {
  await transaction.rollback();
}

module.exports = {
  resetDatabase,
  closeDatabase,
  startTransaction,
  rollbackTransaction,
  sequelize,
  db
};
