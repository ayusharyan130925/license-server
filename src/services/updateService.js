/**
 * Update Service
 * 
 * Handles application version checking and update management
 * 
 * SECURITY: Never trusts client-provided version logic.
 * All comparisons and decisions are server-side.
 */

const { AppVersion } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');

class UpdateService {
  /**
   * Check if an update is available for a client
   * 
   * SECURITY: Uses build_number for comparison (not semver).
   * Applies rollout percentage using deterministic hashing.
   * Enforces min_supported_build to block old versions.
   * 
   * @param {Object} params - Update check parameters
   * @param {string} params.currentVersion - Client's current version (semver, for display)
   * @param {number} params.currentBuild - Client's current build number
   * @param {string} params.platform - Platform (mac, windows, linux)
   * @param {string} params.arch - Architecture (x64, arm64)
   * @param {string} params.channel - Release channel (stable, beta)
   * @param {string} params.deviceId - Device ID for deterministic rollout
   * @returns {Promise<Object>} - Update check result
   */
  static async checkForUpdate({
    currentVersion,
    currentBuild,
    platform,
    arch,
    channel,
    deviceId
  }) {
    // SECURITY: Validate inputs
    if (!platform || !['mac', 'windows', 'linux'].includes(platform)) {
      throw new Error('Invalid platform');
    }
    if (arch && !['x64', 'arm64'].includes(arch)) {
      throw new Error('Invalid architecture');
    }
    if (!channel || !['stable', 'beta'].includes(channel)) {
      throw new Error('Invalid channel');
    }
    if (typeof currentBuild !== 'number' || currentBuild < 0) {
      throw new Error('Invalid current build number');
    }
    if (!deviceId) {
      throw new Error('Device ID required');
    }

    // SECURITY: Fail closed - if we can't determine update status, deny access
    try {
      // Find the latest active version for this platform/arch/channel
      // NULL arch means universal (works for all architectures)
      const whereClause = {
        platform,
        channel,
        is_active: true
      };

      if (arch) {
        // If arch is specified, match either specific arch or NULL (universal)
        whereClause.arch = { [Op.or]: [arch, null] };
      } else {
        // If no arch specified, only match universal (NULL) versions
        whereClause.arch = null;
      }

      const latestVersion = await AppVersion.findOne({
        where: whereClause,
        order: [['build_number', 'DESC']]
      });

      // No active version found - fail closed
      if (!latestVersion) {
        return {
          updateAvailable: false,
          error: 'No active version available for this platform'
        };
      }

      // SECURITY: Check if current build is below minimum supported
      // This allows instant kill-switch of bad versions
      if (latestVersion.min_supported_build !== null && 
          currentBuild < latestVersion.min_supported_build) {
        return {
          updateAvailable: true,
          mandatory: true,
          latestVersion: latestVersion.version,
          buildNumber: latestVersion.build_number,
          minSupportedBuild: latestVersion.min_supported_build,
          message: 'Your version is no longer supported. Please update to continue.',
          downloadUrl: latestVersion.download_url,
          releaseNotes: latestVersion.release_notes
        };
      }

      // SECURITY: Prevent downgrade - client can't go to older build
      if (currentBuild > latestVersion.build_number) {
        // Client has newer build than server knows about
        // This shouldn't happen, but fail closed
        return {
          updateAvailable: false,
          error: 'Client version is newer than server knows about'
        };
      }

      // No update needed if client is already on latest
      if (currentBuild === latestVersion.build_number) {
        return {
          updateAvailable: false
        };
      }

      // SECURITY: Apply rollout percentage using deterministic hashing
      // Same device always gets same result (consistent experience)
      const shouldRollout = this.shouldIncludeInRollout(deviceId, latestVersion.rollout_percentage);

      if (!shouldRollout) {
        // This device is not in the rollout percentage
        return {
          updateAvailable: false
        };
      }

      // Update is available
      return {
        updateAvailable: true,
        mandatory: latestVersion.is_mandatory,
        latestVersion: latestVersion.version,
        buildNumber: latestVersion.build_number,
        releaseNotes: latestVersion.release_notes,
        downloadUrl: latestVersion.download_url,
        // Include min_supported_build if it would block this client
        ...(latestVersion.min_supported_build !== null && 
            currentBuild < latestVersion.min_supported_build ? {
              minSupportedBuild: latestVersion.min_supported_build,
              message: 'Your version is no longer supported'
            } : {})
      };
    } catch (error) {
      // SECURITY: Fail closed - on any error, don't grant update info
      console.error('Update check error:', error);
      throw new Error('Failed to check for updates');
    }
  }

  /**
   * Determine if a device should be included in rollout percentage
   * 
   * SECURITY: Uses deterministic hashing so same device always gets same result.
   * This ensures consistent user experience (no flickering).
   * 
   * @param {string} deviceId - Device identifier
   * @param {number} rolloutPercentage - Rollout percentage (0-100)
   * @returns {boolean} - True if device should see update
   */
  static shouldIncludeInRollout(deviceId, rolloutPercentage) {
    if (rolloutPercentage >= 100) {
      return true;
    }
    if (rolloutPercentage <= 0) {
      return false;
    }

    // Create deterministic hash from device ID
    const hash = crypto.createHash('sha256').update(deviceId).digest('hex');
    // Convert first 8 hex chars to integer (0-4294967295)
    const hashInt = parseInt(hash.substring(0, 8), 16);
    // Map to 0-100 range
    const devicePercentage = (hashInt % 100) + 1;

    return devicePercentage <= rolloutPercentage;
  }

  /**
   * Create a new app version (admin only)
   * 
   * @param {Object} versionData - Version data
   * @returns {Promise<AppVersion>} - Created version
   */
  static async createVersion(versionData) {
    // Validate required fields
    if (!versionData.platform || !versionData.version || 
        versionData.build_number === undefined || !versionData.download_url) {
      throw new Error('Missing required fields: platform, version, build_number, download_url');
    }

    // Validate platform
    if (!['mac', 'windows', 'linux'].includes(versionData.platform)) {
      throw new Error('Invalid platform');
    }

    // Validate arch if provided
    if (versionData.arch && !['x64', 'arm64'].includes(versionData.arch)) {
      throw new Error('Invalid architecture');
    }

    // Validate channel
    if (versionData.channel && !['stable', 'beta'].includes(versionData.channel)) {
      throw new Error('Invalid channel');
    }

    // Validate rollout percentage
    if (versionData.rollout_percentage !== undefined) {
      if (versionData.rollout_percentage < 0 || versionData.rollout_percentage > 100) {
        throw new Error('rollout_percentage must be between 0 and 100');
      }
    }

    return await AppVersion.create({
      platform: versionData.platform,
      arch: versionData.arch || null,
      version: versionData.version,
      build_number: versionData.build_number,
      release_notes: versionData.release_notes || null,
      download_url: versionData.download_url,
      is_mandatory: versionData.is_mandatory || false,
      is_active: versionData.is_active !== undefined ? versionData.is_active : true,
      rollout_percentage: versionData.rollout_percentage !== undefined ? versionData.rollout_percentage : 100,
      min_supported_build: versionData.min_supported_build || null,
      channel: versionData.channel || 'stable'
    });
  }

  /**
   * Update an existing app version (admin only)
   * 
   * @param {number} versionId - Version ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<AppVersion>} - Updated version
   */
  static async updateVersion(versionId, updates) {
    const version = await AppVersion.findByPk(versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    // Validate updates
    if (updates.platform && !['mac', 'windows', 'linux'].includes(updates.platform)) {
      throw new Error('Invalid platform');
    }
    if (updates.arch && !['x64', 'arm64'].includes(updates.arch)) {
      throw new Error('Invalid architecture');
    }
    if (updates.channel && !['stable', 'beta'].includes(updates.channel)) {
      throw new Error('Invalid channel');
    }
    if (updates.rollout_percentage !== undefined) {
      if (updates.rollout_percentage < 0 || updates.rollout_percentage > 100) {
        throw new Error('rollout_percentage must be between 0 and 100');
      }
    }

    // Update allowed fields
    const allowedFields = [
      'platform', 'arch', 'version', 'build_number', 'release_notes',
      'download_url', 'is_mandatory', 'is_active', 'rollout_percentage',
      'min_supported_build', 'channel'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    await version.update(updateData);
    return version.reload();
  }

  /**
   * List app versions with optional filters (admin only)
   * 
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array<AppVersion>>} - List of versions
   */
  static async listVersions(filters = {}) {
    const where = {};

    if (filters.platform) {
      where.platform = filters.platform;
    }
    if (filters.channel) {
      where.channel = filters.channel;
    }
    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
    }
    if (filters.arch) {
      where.arch = filters.arch;
    }

    return await AppVersion.findAll({
      where,
      order: [['build_number', 'DESC']]
    });
  }
}

module.exports = UpdateService;
