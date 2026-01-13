'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Webhook Events Table
     * 
     * Purpose: Track processed Stripe webhook events for idempotency
     * Prevents duplicate processing of the same webhook event
     * 
     * SECURITY: Critical for preventing state drift and duplicate subscriptions
     */
    await queryInterface.createTable('webhook_events', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      stripe_event_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Stripe event ID - unique identifier from Stripe'
      },
      event_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Type of webhook event (e.g., checkout.session.completed)'
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When the webhook was processed'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Unique index on stripe_event_id for idempotency
    await queryInterface.addIndex('webhook_events', ['stripe_event_id'], {
      name: 'idx_webhook_events_stripe_event_id',
      unique: true
    });

    // Index on event_type for faster lookups
    await queryInterface.addIndex('webhook_events', ['event_type'], {
      name: 'idx_webhook_events_event_type'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('webhook_events');
  }
};
