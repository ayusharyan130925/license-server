'use strict';

/**
 * Migration: Create plans table
 * 
 * Purpose: Store subscription plans with feature entitlements
 * 
 * Plans:
 * - trial: 14-day trial with limited features
 * - basic: Basic paid plan
 * - pro: Professional paid plan
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('plans', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.ENUM('trial', 'basic', 'pro'),
        allowNull: false,
        unique: true,
        comment: 'Plan name identifier'
      },
      max_cameras: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Maximum number of cameras allowed'
      },
      pdf_export: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'PDF export feature enabled'
      },
      fps_limit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30,
        comment: 'FPS limit for video processing'
      },
      cloud_backup: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Cloud backup feature enabled'
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

    // Add index on name for fast lookups
    await queryInterface.addIndex('plans', ['name'], {
      name: 'idx_plans_name',
      unique: true
    });

    // Insert default plans
    await queryInterface.bulkInsert('plans', [
      {
        name: 'trial',
        max_cameras: 2,
        pdf_export: false,
        fps_limit: 30,
        cloud_backup: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'basic',
        max_cameras: 4,
        pdf_export: true,
        fps_limit: 60,
        cloud_backup: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'pro',
        max_cameras: 999,
        pdf_export: true,
        fps_limit: 120,
        cloud_backup: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('plans');
  }
};
