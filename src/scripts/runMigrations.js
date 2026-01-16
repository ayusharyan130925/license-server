/**
 * Smart Migration Runner
 * 
 * Runs migrations but skips tables that already exist.
 * This allows migrations to be run multiple times safely.
 */

const path = require('path');
const fs = require('fs');
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Initialize Sequelize connection
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: false
  }
);

/**
 * Check if a table exists in the database
 */
async function tableExists(tableName) {
  try {
    const [results] = await sequelize.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = ?`,
      {
        replacements: [dbConfig.database, tableName],
        type: Sequelize.QueryTypes.SELECT
      }
    );
    return results && results.length > 0 && results[0].count > 0;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error.message);
    return false;
  }
}

/**
 * Check if a column exists in a table
 */
async function columnExists(tableName, columnName) {
  try {
    const [results] = await sequelize.query(
      `SELECT COUNT(*) as count FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
      {
        replacements: [dbConfig.database, tableName, columnName],
        type: Sequelize.QueryTypes.SELECT
      }
    );
    return results && results.length > 0 && results[0].count > 0;
  } catch (error) {
    console.error(`Error checking if column ${columnName} exists in ${tableName}:`, error.message);
    return false;
  }
}

/**
 * Check if an index exists
 */
async function indexExists(tableName, indexName) {
  try {
    const [results] = await sequelize.query(
      `SELECT COUNT(*) as count FROM information_schema.statistics 
       WHERE table_schema = ? AND table_name = ? AND index_name = ?`,
      {
        replacements: [dbConfig.database, tableName, indexName],
        type: Sequelize.QueryTypes.SELECT
      }
    );
    return results && results.length > 0 && results[0].count > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Extract table names from migration file
 * This is a simple heuristic - looks for createTable calls
 */
function getTablesFromMigration(migrationContent) {
  const tables = new Set();
  
  // Look for createTable calls
  const createTableRegex = /createTable\(['"]([^'"]+)['"]/gi;
  let match;
  while ((match = createTableRegex.exec(migrationContent)) !== null) {
    tables.add(match[1]);
  }
  
  // Look for addColumn calls (for migrations that add columns)
  const addColumnRegex = /addColumn\(['"]([^'"]+)['"]/gi;
  while ((match = addColumnRegex.exec(migrationContent)) !== null) {
    tables.add(match[1]);
  }
  
  return Array.from(tables);
}

/**
 * Check if migration should be skipped
 */
async function shouldSkipMigration(migration, migrationContent) {
  const tables = getTablesFromMigration(migrationContent);
  
  // If no tables found, run the migration (might be data migration or other operation)
  if (tables.length === 0) {
    return false;
  }
  
  // Check each table
  for (const table of tables) {
    const exists = await tableExists(table);
    
    // For createTable migrations, skip if table exists
    if (migrationContent.includes('createTable')) {
      if (exists) {
        console.log(`  ⏭️  Skipping: Table '${table}' already exists`);
        return true;
      }
    }
    
    // For addColumn migrations, check if column exists
    if (migrationContent.includes('addColumn')) {
      const columnMatches = migrationContent.matchAll(/addColumn\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g);
      for (const match of columnMatches) {
        const tableName = match[1];
        const columnName = match[2];
        if (await columnExists(tableName, columnName)) {
          console.log(`  ⏭️  Skipping: Column '${columnName}' already exists in '${tableName}'`);
          return true;
        }
      }
    }
    
    // For addIndex migrations, check if index exists
    if (migrationContent.includes('addIndex')) {
      const indexMatches = migrationContent.matchAll(/addIndex\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g);
      for (const match of indexMatches) {
        const tableName = match[1];
        const indexName = match[2];
        if (await indexExists(tableName, indexName)) {
          console.log(`  ⏭️  Skipping: Index '${indexName}' already exists on '${tableName}'`);
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Run migrations intelligently
 */
async function runMigrations() {
  try {
    // Test database connection
    await sequelize.authenticate();
    
    // Only log if not being called from server startup
    if (!process.env.SILENT_MIGRATIONS) {
      console.log('✓ Database connection established\n');
    }

    const migrationsPath = path.resolve(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.js'))
      .sort(); // Sort to ensure order

    const silent = process.env.SILENT_MIGRATIONS === 'true';
    
    if (!silent) {
      console.log(`Found ${migrationFiles.length} migration files\n`);
    }

    let runCount = 0;
    let skippedCount = 0;

    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsPath, file);
      const migrationContent = fs.readFileSync(migrationPath, 'utf8');
      const migration = require(migrationPath);

      if (!silent) {
        console.log(`📄 ${file}`);
      }

      // Check if migration should be skipped
      const shouldSkip = await shouldSkipMigration(migration, migrationContent);

      if (shouldSkip) {
        skippedCount++;
        if (!silent) {
          console.log(`  ✅ Skipped (table/column/index already exists)\n`);
        }
        continue;
      }

      // Run the migration
      try {
        if (!silent) {
          console.log(`  🔄 Running migration...`);
        }
        await migration.up(sequelize.getQueryInterface(), Sequelize);
        if (!silent) {
          console.log(`  ✅ Migration completed\n`);
        }
        runCount++;
      } catch (error) {
        // If error is about table/column/constraint/index already existing, skip it
        const isDuplicateError = 
          error.message.includes("already exists") || 
          error.message.includes("Duplicate column") ||
          error.message.includes("Duplicate key") ||
          error.message.includes("Duplicate check constraint") ||
          error.message.includes("ER_DUP_FIELDNAME") ||
          error.message.includes("ER_DUP_KEYNAME") ||
          error.message.includes("ER_CHECK_CONSTRAINT_DUP_NAME") ||
          error.code === 'ER_CHECK_CONSTRAINT_DUP_NAME' ||
          (error.message.includes("Table") && error.message.includes("doesn't exist") === false);
        
        if (isDuplicateError) {
          if (!silent) {
            console.log(`  ⏭️  Skipped (already exists): ${error.message}\n`);
          }
          skippedCount++;
        } else {
          if (!silent) {
            console.error(`  ❌ Migration failed: ${error.message}\n`);
          }
          throw error;
        }
      }
    }

    if (!silent) {
      console.log('\n📊 Migration Summary:');
      console.log(`  ✅ Run: ${runCount}`);
      console.log(`  ⏭️  Skipped: ${skippedCount}`);
      console.log(`  📝 Total: ${migrationFiles.length}\n`);
    }

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run migrations
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
