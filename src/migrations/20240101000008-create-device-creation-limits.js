'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Device Creation Rate Limiting Table
     * 
     * SECURITY: Track device creation rates to prevent abuse:
     * - Per IP address (prevents single IP creating many devices)
     * - Per user (prevents single user creating many devices)
     * - Per 24-hour window
     * 
     * This mitigates (but does not eliminate) device_hash forging attacks.
     */
    await queryInterface.createTable('device_creation_limits', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      identifier: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'IP address or user_id for rate limiting'
      },
      identifier_type: {
        type: Sequelize.ENUM('ip', 'user'),
        allowNull: false,
        comment: 'Type of identifier (ip or user)'
      },
      window_start: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Start of the 24-hour rate limit window'
      },
      device_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of devices created in this window'
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

    // Composite unique index: one record per identifier per window
    await queryInterface.addIndex('device_creation_limits', 
      ['identifier', 'identifier_type', 'window_start'], {
      name: 'idx_device_limits_identifier_window',
      unique: true
    });

    // Index for cleanup queries (expired windows)
    await queryInterface.addIndex('device_creation_limits', ['window_start'], {
      name: 'idx_device_limits_window_start'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('device_creation_limits');
  }
};
