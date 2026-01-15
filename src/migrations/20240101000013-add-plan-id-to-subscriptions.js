'use strict';

/**
 * Migration: Add plan_id to subscriptions table
 * 
 * Purpose: Link subscriptions to plans for feature entitlements
 * 
 * SECURITY: Foreign key constraint ensures referential integrity
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add plan_id column (nullable initially for existing records)
    await queryInterface.addColumn('subscriptions', 'plan_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'plans',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Plan associated with this subscription'
    });

    // Add index for faster lookups
    await queryInterface.addIndex('subscriptions', ['plan_id'], {
      name: 'idx_subscriptions_plan_id'
    });

    // Set default plan_id for existing subscriptions based on status
    // Trial subscriptions get trial plan, others get basic plan
    const [results] = await queryInterface.sequelize.query(`
      SELECT id FROM plans WHERE name = 'trial' LIMIT 1
    `);
    const trialPlanId = results[0]?.id;

    const [basicResults] = await queryInterface.sequelize.query(`
      SELECT id FROM plans WHERE name = 'basic' LIMIT 1
    `);
    const basicPlanId = basicResults[0]?.id;

    if (trialPlanId) {
      await queryInterface.sequelize.query(`
        UPDATE subscriptions 
        SET plan_id = ${trialPlanId} 
        WHERE status = 'trial' AND plan_id IS NULL
      `);
    }

    if (basicPlanId) {
      await queryInterface.sequelize.query(`
        UPDATE subscriptions 
        SET plan_id = ${basicPlanId} 
        WHERE status = 'active' AND plan_id IS NULL
      `);
    }

    // Make plan_id NOT NULL for new records (optional - can keep nullable if needed)
    // For now, we'll keep it nullable to allow flexibility
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('subscriptions', 'idx_subscriptions_plan_id');
    await queryInterface.removeColumn('subscriptions', 'plan_id');
  }
};
