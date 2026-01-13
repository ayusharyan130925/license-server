const path = require('path');
const fs = require('fs');

// Resolve .env file path
const envPath = path.resolve(__dirname, '../../.env');

// Check if .env file exists (skip in test mode - tests set env vars directly)
if (process.env.NODE_ENV !== 'test') {
  if (!fs.existsSync(envPath)) {
    console.error(`❌ .env file not found at: ${envPath}`);
    console.error('Please create a .env file in the project root directory.\n');
    process.exit(1);
  }

  // Load environment variables
  const result = require('dotenv').config({ path: envPath });

  if (result.error) {
    console.error('❌ Error loading .env file:', result.error.message);
    process.exit(1);
  }

  // Validate required environment variables
  const requiredEnvVars = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_HOST'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error(`\n.env file location: ${envPath}`);
    console.error('Please ensure your .env file contains all required variables.');
    console.error('See ENV_SETUP.md or env_template.txt for reference.\n');
    process.exit(1);
  }
} else {
  // In test mode, try to load .env but don't fail if it doesn't exist
  require('dotenv').config({ path: envPath });
}

module.exports = {
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    }
  }
};
