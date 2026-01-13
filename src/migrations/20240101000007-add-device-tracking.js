'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add device tracking fields for abuse detection
     * 
     * SECURITY: Track device lifecycle to detect:
     * - Rapid device creation (device_hash forging)
     * - Device churn patterns
     * - Suspicious registration patterns
     */
    
    // Add last_seen_at to devices table
    await queryInterface.addColumn('devices', 'last_seen_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Last time this device was seen (updated on each license check)'
    });

    // Add index for churn detection queries
    await queryInterface.addIndex('devices', ['last_seen_at'], {
      name: 'idx_devices_last_seen_at'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('devices', 'idx_devices_last_seen_at');
    await queryInterface.removeColumn('devices', 'last_seen_at');
  }
};
