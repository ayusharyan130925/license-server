const { DeviceCreationLimit, RiskEvent } = require('../models');
const { Op } = require('sequelize');
const db = require('../models');

/**
 * Cleanup Service
 * 
 * Handles periodic cleanup of old database records:
 * - Old device creation limit windows (older than retention period)
 * - Old risk events (optional, for compliance)
 * 
 * SECURITY: Cleanup jobs should run periodically to prevent database bloat
 */
class CleanupService {
  /**
   * Clean up old device creation limit windows
   * 
   * Removes rate limit records older than retention period (default: 7 days)
   * These records are no longer needed for rate limiting checks.
   * 
   * @param {number} retentionDays - Days to retain (default: 7)
   * @returns {Promise<{deleted: number}>} - Number of records deleted
   */
  static async cleanupOldRateLimitWindows(retentionDays = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deleted = await DeviceCreationLimit.destroy({
      where: {
        window_start: {
          [Op.lt]: cutoffDate
        }
      }
    });

    return { deleted };
  }

  /**
   * Clean up old risk events
   * 
   * Removes risk event records older than retention period (default: 90 days)
   * Keep longer for compliance/audit purposes.
   * 
   * @param {number} retentionDays - Days to retain (default: 90)
   * @returns {Promise<{deleted: number}>} - Number of records deleted
   */
  static async cleanupOldRiskEvents(retentionDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deleted = await RiskEvent.destroy({
      where: {
        created_at: {
          [Op.lt]: cutoffDate
        }
      }
    });

    return { deleted };
  }

  /**
   * Run all cleanup tasks
   * 
   * @param {Object} options - Cleanup options
   * @param {number} options.rateLimitRetentionDays - Days to retain rate limit records (default: 7)
   * @param {number} options.riskEventRetentionDays - Days to retain risk events (default: 90)
   * @returns {Promise<Object>} - Cleanup results
   */
  static async runCleanup(options = {}) {
    const {
      rateLimitRetentionDays = 7,
      riskEventRetentionDays = 90
    } = options;

    const [rateLimitResult, riskEventResult] = await Promise.all([
      this.cleanupOldRateLimitWindows(rateLimitRetentionDays),
      this.cleanupOldRiskEvents(riskEventRetentionDays)
    ]);

    return {
      rateLimitWindows: rateLimitResult,
      riskEvents: riskEventResult,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = CleanupService;
