'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Risk Events / Audit Trail Table
     * 
     * SECURITY: Log suspicious patterns and security events for:
     * - Forensic analysis
     * - Abuse pattern detection
     * - Compliance/audit requirements
     * 
     * Events are logged but do not block operations (detection, not prevention).
     */
    await queryInterface.createTable('risk_events', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User associated with event (nullable for IP-based events)'
      },
      device_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'devices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Device associated with event (nullable)'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address (IPv4 or IPv6)'
      },
      event_type: {
        type: Sequelize.ENUM(
          'DEVICE_CAP_EXCEEDED',
          'DEVICE_CREATION_RATE_LIMIT',
          'DEVICE_CHURN_DETECTED',
          'RAPID_DEVICE_CREATION',
          'RECONCILIATION_PERFORMED',
          'SUSPICIOUS_PATTERN'
        ),
        allowNull: false,
        comment: 'Type of risk event'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional event context (device count, time window, etc.)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Indexes for common queries
    await queryInterface.addIndex('risk_events', ['user_id'], {
      name: 'idx_risk_events_user_id'
    });

    await queryInterface.addIndex('risk_events', ['device_id'], {
      name: 'idx_risk_events_device_id'
    });

    await queryInterface.addIndex('risk_events', ['ip_address'], {
      name: 'idx_risk_events_ip_address'
    });

    await queryInterface.addIndex('risk_events', ['event_type'], {
      name: 'idx_risk_events_event_type'
    });

    await queryInterface.addIndex('risk_events', ['created_at'], {
      name: 'idx_risk_events_created_at'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('risk_events');
  }
};
