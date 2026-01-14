/**
 * Migration: Create app_versions table
 * 
 * Purpose: Store application versions for update management
 * 
 * SECURITY: This table controls what versions clients can run.
 * Changes here can force updates or block access.
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('app_versions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      platform: {
        type: Sequelize.ENUM('mac', 'windows', 'linux'),
        allowNull: false
      },
      arch: {
        type: Sequelize.ENUM('x64', 'arm64'),
        allowNull: true
      },
      version: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      build_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      release_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      download_url: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      is_mandatory: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      rollout_percentage: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100
      },
      min_supported_build: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      channel: {
        type: Sequelize.ENUM('stable', 'beta'),
        allowNull: false,
        defaultValue: 'stable'
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

    // Indexes for efficient queries
    await queryInterface.addIndex('app_versions', ['platform', 'arch', 'channel', 'is_active'], {
      name: 'idx_app_versions_lookup'
    });

    await queryInterface.addIndex('app_versions', ['build_number'], {
      name: 'idx_app_versions_build_number'
    });

    await queryInterface.addIndex('app_versions', ['channel'], {
      name: 'idx_app_versions_channel'
    });

    await queryInterface.addIndex('app_versions', ['is_active'], {
      name: 'idx_app_versions_active'
    });

    // Composite index for version lookups
    await queryInterface.addIndex('app_versions', ['platform', 'arch', 'channel', 'build_number'], {
      name: 'idx_app_versions_unique_lookup',
      unique: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('app_versions');
  }
};
