#!/usr/bin/env node

/**
 * Stripe Reconciliation Job
 * 
 * SECURITY: Reconciles Stripe subscription state with database.
 * Handles cases where webhooks are missed or delayed.
 * 
 * Usage:
 *   node src/scripts/reconcile-stripe.js
 * 
 * Recommended: Run via cron every 6-24 hours
 * Example cron: 0 */6 * * * cd /path/to/project && node src/scripts/reconcile-stripe.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const ReconciliationService = require('../services/reconciliationService');

async function main() {
  console.log('Starting Stripe reconciliation...');
  console.log(`Time: ${new Date().toISOString()}\n`);

  try {
    const result = await ReconciliationService.reconcileAll();

    console.log('Reconciliation complete:');
    console.log(`  Total users checked: ${result.total}`);
    console.log(`  Reconciliations performed: ${result.reconciled}`);
    console.log(`  Errors: ${result.errors}`);

    process.exit(0);
  } catch (error) {
    console.error('Reconciliation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
