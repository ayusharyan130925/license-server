'use strict';

/**
 * Migration: Create payments table to store Stripe payment/invoice details
 * Tracks all payment transactions for audit and reconciliation
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who made the payment'
      },
      subscription_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'subscriptions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Associated subscription'
      },
      stripe_invoice_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
        comment: 'Stripe invoice ID (for idempotency)'
      },
      stripe_payment_intent_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Stripe payment intent ID'
      },
      stripe_charge_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Stripe charge ID'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Payment amount in cents (e.g., 2999 = $29.99)'
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'usd',
        comment: 'Currency code (USD, EUR, etc.)'
      },
      status: {
        type: Sequelize.ENUM('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Payment status'
      },
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Payment method type (card, bank_account, etc.)'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Payment description/invoice description'
      },
      billing_period_start: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Start of billing period this payment covers'
      },
      billing_period_end: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'End of billing period this payment covers'
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When payment was successfully completed'
      },
      failure_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reason for payment failure (if applicable)'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata from Stripe'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for efficient queries
    await queryInterface.addIndex('payments', ['user_id'], {
      name: 'idx_payments_user_id'
    });

    await queryInterface.addIndex('payments', ['subscription_id'], {
      name: 'idx_payments_subscription_id'
    });

    await queryInterface.addIndex('payments', ['stripe_invoice_id'], {
      name: 'idx_payments_stripe_invoice_id',
      unique: true
    });

    await queryInterface.addIndex('payments', ['status'], {
      name: 'idx_payments_status'
    });

    await queryInterface.addIndex('payments', ['paid_at'], {
      name: 'idx_payments_paid_at'
    });

    // Composite index for user payment history queries
    await queryInterface.addIndex('payments', ['user_id', 'paid_at'], {
      name: 'idx_payments_user_paid_at'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('payments');
  }
};
