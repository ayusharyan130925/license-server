/**
 * AppVersion Model
 * 
 * Represents an application version available for download
 * 
 * SECURITY: This model controls what versions clients can run.
 * Changes to is_active or is_mandatory can force updates or block access.
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AppVersion = sequelize.define('AppVersion', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    platform: {
      type: DataTypes.ENUM('mac', 'windows', 'linux'),
      allowNull: false,
      comment: 'Target platform (mac, windows, linux)'
    },
    arch: {
      type: DataTypes.ENUM('x64', 'arm64'),
      allowNull: true,
      comment: 'Architecture (x64, arm64). NULL = universal/all architectures'
    },
    version: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Semantic version string (e.g., "1.2.4") - for display only'
    },
    build_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Monotonically increasing build number - used for version comparison'
    },
    release_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Release notes for this version'
    },
    download_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Signed download URL (S3/CDN) - never hardcoded in client'
    },
    is_mandatory: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'If true, clients MUST update to this version (blocks old versions)'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'If false, version is disabled (kill switch)'
    },
    rollout_percentage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Percentage of users who should see this update (0-100). Uses deterministic hashing.'
    },
    min_supported_build: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Minimum build number that is still supported. Versions below this are blocked.'
    },
    channel: {
      type: DataTypes.ENUM('stable', 'beta'),
      allowNull: false,
      defaultValue: 'stable',
      comment: 'Release channel (stable, beta)'
    }
  }, {
    tableName: 'app_versions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['platform', 'arch', 'channel', 'is_active'],
        name: 'idx_app_versions_lookup'
      },
      {
        fields: ['build_number'],
        name: 'idx_app_versions_build_number'
      },
      {
        fields: ['channel'],
        name: 'idx_app_versions_channel'
      },
      {
        fields: ['is_active'],
        name: 'idx_app_versions_active'
      }
    ]
  });

  return AppVersion;
};
