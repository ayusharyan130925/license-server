'use strict';

/**
 * Migration: Enhance subscriptions table with subscription period dates
 * Adds fields to track subscription periods and expiration dates
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add subscription period tracking fields
    await queryInterface.addColumn('subscriptions', 'current_period_start', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Start of current billing period (from Stripe)'
    });

    await queryInterface.addColumn('subscriptions', 'current_period_end', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'End of current billing period (from Stripe) - determines license expiration'
    });

    await queryInterface.addColumn('subscriptions', 'cancel_at_period_end', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether subscription will cancel at period end'
    });

    await queryInterface.addColumn('subscriptions', 'canceled_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When subscription was canceled (if applicable)'
    });

    await queryInterface.addColumn('subscriptions', 'trial_end', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'End of trial period (if applicable)'
    });

    // Add index for efficient queries on period_end (for finding expiring subscriptions)
    await queryInterface.addIndex('subscriptions', ['current_period_end'], {
      name: 'idx_subscriptions_period_end'
    });

    // Add index for status queries
    await queryInterface.addIndex('subscriptions', ['status', 'current_period_end'], {
      name: 'idx_subscriptions_status_period_end'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('subscriptions', 'idx_subscriptions_status_period_end');
    await queryInterface.removeIndex('subscriptions', 'idx_subscriptions_period_end');
    await queryInterface.removeColumn('subscriptions', 'trial_end');
    await queryInterface.removeColumn('subscriptions', 'canceled_at');
    await queryInterface.removeColumn('subscriptions', 'cancel_at_period_end');
    await queryInterface.removeColumn('subscriptions', 'current_period_end');
    await queryInterface.removeColumn('subscriptions', 'current_period_start');
  }
};
