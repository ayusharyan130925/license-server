'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add device cap configuration to users table
     * 
     * SECURITY: Enforce per-user device limits to mitigate device_hash forging.
     * Default: 2-3 devices per user (trial users)
     * Paid users may have higher caps (configurable per subscription tier)
     */
    
    await queryInterface.addColumn('users', 'max_devices', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Maximum devices allowed for this user. NULL = use system default. Set higher for paid users.'
    });

    // Add index for queries filtering by device count
    // (device count calculated via JOIN, but this field useful for paid user lookups)
    await queryInterface.addIndex('users', ['max_devices'], {
      name: 'idx_users_max_devices'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('users', 'idx_users_max_devices');
    await queryInterface.removeColumn('users', 'max_devices');
  }
};
