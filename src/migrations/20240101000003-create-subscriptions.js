'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subscriptions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      stripe_customer_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true
      },
      stripe_subscription_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true
      },
      status: {
        type: Sequelize.ENUM('trial', 'active', 'expired'),
        allowNull: false,
        defaultValue: 'trial'
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

    // Add indexes for faster lookups
    await queryInterface.addIndex('subscriptions', ['user_id'], {
      name: 'idx_subscriptions_user_id'
    });
    await queryInterface.addIndex('subscriptions', ['stripe_customer_id'], {
      name: 'idx_subscriptions_stripe_customer_id',
      unique: true
    });
    await queryInterface.addIndex('subscriptions', ['stripe_subscription_id'], {
      name: 'idx_subscriptions_stripe_subscription_id',
      unique: true
    });
    await queryInterface.addIndex('subscriptions', ['status'], {
      name: 'idx_subscriptions_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('subscriptions');
  }
};
