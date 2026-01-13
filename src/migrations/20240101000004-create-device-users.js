'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('device_users', {
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
      device_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'devices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add composite unique index to prevent duplicate user-device pairs
    await queryInterface.addIndex('device_users', ['user_id', 'device_id'], {
      name: 'idx_device_users_user_device',
      unique: true
    });

    // Add individual indexes for faster lookups
    await queryInterface.addIndex('device_users', ['user_id'], {
      name: 'idx_device_users_user_id'
    });
    await queryInterface.addIndex('device_users', ['device_id'], {
      name: 'idx_device_users_device_id'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('device_users');
  }
};
