'use strict';

/**
 * Migration: Add indexes for abuse detection performance
 * 
 * Purpose: Improve query performance for abuse detection and metrics
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add index on risk_events.created_at for time-based queries
    await queryInterface.addIndex('risk_events', ['created_at'], {
      name: 'idx_risk_events_created_at',
      ifNotExists: true
    });

    // Add composite index for risk events by type and date
    await queryInterface.addIndex('risk_events', ['event_type', 'created_at'], {
      name: 'idx_risk_events_type_date',
      ifNotExists: true
    });

    // Add index on device_creation_limits.identifier for faster lookups
    await queryInterface.addIndex('device_creation_limits', ['identifier'], {
      name: 'idx_device_limits_identifier',
      ifNotExists: true
    });

    // Add composite index for device_creation_limits by type and window
    await queryInterface.addIndex('device_creation_limits', ['identifier_type', 'window_start'], {
      name: 'idx_device_limits_type_window',
      ifNotExists: true
    });

    // Add index on device_users.created_at for churn detection
    await queryInterface.addIndex('device_users', ['created_at'], {
      name: 'idx_device_users_created_at',
      ifNotExists: true
    });

    // Add composite index for device_users by user and creation date
    await queryInterface.addIndex('device_users', ['user_id', 'created_at'], {
      name: 'idx_device_users_user_created',
      ifNotExists: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('risk_events', 'idx_risk_events_created_at');
    await queryInterface.removeIndex('risk_events', 'idx_risk_events_type_date');
    await queryInterface.removeIndex('device_creation_limits', 'idx_device_limits_identifier');
    await queryInterface.removeIndex('device_creation_limits', 'idx_device_limits_type_window');
    await queryInterface.removeIndex('device_users', 'idx_device_users_created_at');
    await queryInterface.removeIndex('device_users', 'idx_device_users_user_created');
  }
};
