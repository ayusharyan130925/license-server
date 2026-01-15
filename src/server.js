const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const routes = require('./routes');
const db = require('./models');
const CleanupService = require('./services/cleanupService');

/**
 * License & Billing Server
 * 
 * Production-grade server for managing:
 * - Device-based 14-day trials
 * - Stripe subscription management
 * - License validation via JWT lease tokens
 * 
 * Architecture:
 * - Express.js REST API
 * - Sequelize ORM with MySQL
 * - JWT for license lease tokens
 * - Stripe for payment processing
 */

const app = express();
const PORT = config.port;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.urls.frontend,
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (development only)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'VisionAI License Server',
    version: '1.0.0',
    status: 'running'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'An error occurred'
  });
});

// Database connection and server startup
async function startServer() {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    
    // Only log in non-test environments
    if (config.nodeEnv !== 'test') {
      console.log('✓ Database connection established successfully');
    }

    // Sync models (in production, use migrations only - sync is for development)
    if (config.nodeEnv === 'development') {
      console.log('⚠ Running in development mode');
    }

    // Start server (skip in test mode - tests handle server startup)
    if (config.nodeEnv !== 'test') {
      app.listen(PORT, () => {
        console.log(`✓ Server running on port ${PORT}`);
        console.log(`✓ Environment: ${config.nodeEnv}`);
        console.log(`✓ API available at http://localhost:${PORT}/api`);
      });

      // Start cleanup job (runs periodically)
      startCleanupJob();
    }
  } catch (error) {
    if (config.nodeEnv !== 'test') {
      console.error('✗ Failed to start server:', error);
      process.exit(1);
    } else {
      // In test mode, just throw (tests will handle)
      throw error;
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  await db.sequelize.close();
  process.exit(0);
});

/**
 * Start cleanup job for old database records
 * Runs periodically to clean up old rate limit windows and risk events
 */
function startCleanupJob() {
  const intervalHours = config.abuseDetection?.cleanupIntervalHours || 24;
  const intervalMs = intervalHours * 60 * 60 * 1000;

  // Run cleanup immediately on startup (after a short delay)
  setTimeout(async () => {
    try {
      console.log('Running initial cleanup job...');
      const result = await CleanupService.runCleanup({
        rateLimitRetentionDays: config.abuseDetection?.rateLimitRetentionDays || 7,
        riskEventRetentionDays: config.abuseDetection?.riskEventRetentionDays || 90
      });
      console.log(`✓ Cleanup completed: ${result.rateLimitWindows.deleted} rate limit windows, ${result.riskEvents.deleted} risk events`);
    } catch (error) {
      console.error('Cleanup job error:', error);
    }
  }, 5000); // Wait 5 seconds after server starts

  // Schedule periodic cleanup
  setInterval(async () => {
    try {
      console.log('Running scheduled cleanup job...');
      const result = await CleanupService.runCleanup({
        rateLimitRetentionDays: config.abuseDetection?.rateLimitRetentionDays || 7,
        riskEventRetentionDays: config.abuseDetection?.riskEventRetentionDays || 90
      });
      console.log(`✓ Cleanup completed: ${result.rateLimitWindows.deleted} rate limit windows, ${result.riskEvents.deleted} risk events`);
    } catch (error) {
      console.error('Cleanup job error:', error);
    }
  }, intervalMs);

  console.log(`✓ Cleanup job scheduled (runs every ${intervalHours} hours)`);
}

// Start the server (skip in test mode)
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
