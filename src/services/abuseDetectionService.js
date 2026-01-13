const { Device, DeviceUser, DeviceCreationLimit, RiskEvent, User } = require('../models');
const { Op } = require('sequelize');
const db = require('../models');
const config = require('../config');

/**
 * Abuse Detection Service
 * 
 * SECURITY: Mitigates device_hash forging attacks through:
 * - Per-user device caps
 * - Rate limiting (per IP, per user)
 * - Device churn detection
 * - Risk event logging
 * 
 * NOTE: These are mitigations, not cryptographic guarantees.
 * A determined attacker with multiple IPs/accounts can still forge device hashes.
 */

// Configuration constants (from config, with fallbacks)
const DEFAULT_MAX_DEVICES_PER_USER = config.abuseDetection?.defaultMaxDevicesPerUser || 2;
const MAX_DEVICES_PER_IP_PER_24H = config.abuseDetection?.maxDevicesPerIpPer24h || 5;
const MAX_DEVICES_PER_USER_PER_24H = config.abuseDetection?.maxDevicesPerUserPer24h || 3;
const DEVICE_CHURN_THRESHOLD = config.abuseDetection?.deviceChurnThreshold || 5;

class AbuseDetectionService {
  /**
   * Get effective device cap for a user
   * @param {User} user - User instance
   * @returns {number} - Maximum devices allowed
   */
  static getDeviceCapForUser(user) {
    // Paid users may have higher caps (set via max_devices field)
    if (user.max_devices !== null && user.max_devices !== undefined) {
      return user.max_devices;
    }
    return DEFAULT_MAX_DEVICES_PER_USER;
  }

  /**
   * Count devices associated with a user
   * @param {number} userId - User ID
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<number>} - Number of devices
   */
  static async countUserDevices(userId, transaction = null) {
    const count = await DeviceUser.count({
      where: { user_id: userId },
      transaction
    });
    return count;
  }

  /**
   * Check if user has exceeded device cap
   * @param {number} userId - User ID
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<{exceeded: boolean, current: number, max: number}>}
   */
  static async checkDeviceCap(userId, transaction = null) {
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      throw new Error('User not found');
    }

    const maxDevices = this.getDeviceCapForUser(user);
    const currentCount = await this.countUserDevices(userId, transaction);

    return {
      exceeded: currentCount >= maxDevices,
      current: currentCount,
      max: maxDevices
    };
  }

  /**
   * Get or create rate limit record for identifier
   * @param {string} identifier - IP address or user_id
   * @param {string} identifierType - 'ip' or 'user'
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<DeviceCreationLimit>}
   */
  static async getOrCreateRateLimit(identifier, identifierType, transaction = null) {
    // Calculate 24-hour window start (current hour, rounded down)
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setHours(0, 0, 0, 0); // Start of today

    const [limit] = await DeviceCreationLimit.findOrCreate({
      where: {
        identifier: identifier,
        identifier_type: identifierType,
        window_start: windowStart
      },
      defaults: {
        identifier: identifier,
        identifier_type: identifierType,
        window_start: windowStart,
        device_count: 0
      },
      transaction
    });

    // If record exists but is from a previous day, reset it
    const recordDate = new Date(limit.window_start);
    if (recordDate.getTime() < windowStart.getTime()) {
      limit.window_start = windowStart;
      limit.device_count = 0;
      await limit.save({ transaction });
    }

    return limit;
  }

  /**
   * Check if rate limit is exceeded
   * @param {string} identifier - IP address or user_id
   * @param {string} identifierType - 'ip' or 'user'
   * @param {number} maxAllowed - Maximum devices allowed in window
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<{exceeded: boolean, current: number, max: number}>}
   */
  static async checkRateLimit(identifier, identifierType, maxAllowed, transaction = null) {
    const limit = await this.getOrCreateRateLimit(identifier, identifierType, transaction);
    
    return {
      exceeded: limit.device_count >= maxAllowed,
      current: limit.device_count,
      max: maxAllowed
    };
  }

  /**
   * Increment device creation counter
   * @param {string} identifier - IP address or user_id
   * @param {string} identifierType - 'ip' or 'user'
   * @param {Transaction} transaction - Database transaction
   */
  static async incrementDeviceCreation(identifier, identifierType, transaction = null) {
    const limit = await this.getOrCreateRateLimit(identifier, identifierType, transaction);
    limit.device_count += 1;
    await limit.save({ transaction });
  }

  /**
   * Detect device churn (rapid device creation)
   * @param {number} userId - User ID
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<{suspicious: boolean, deviceCount: number, timeWindow: number}>}
   */
  static async detectDeviceChurn(userId, transaction = null) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Count devices created by this user in the last hour
    const recentDevices = await DeviceUser.count({
      where: {
        user_id: userId,
        created_at: {
          [Op.gte]: oneHourAgo
        }
      },
      transaction
    });

    const suspicious = recentDevices >= DEVICE_CHURN_THRESHOLD;

    return {
      suspicious,
      deviceCount: recentDevices,
      timeWindow: 3600 // 1 hour in seconds
    };
  }

  /**
   * Log a risk event
   * @param {Object} eventData - Event data
   * @param {number|null} eventData.user_id - User ID
   * @param {number|null} eventData.device_id - Device ID
   * @param {string|null} eventData.ip_address - IP address
   * @param {string} eventData.event_type - Event type enum
   * @param {Object|null} eventData.metadata - Additional metadata
   * @param {Transaction} transaction - Database transaction
   */
  static async logRiskEvent(eventData, transaction = null) {
    await RiskEvent.create({
      user_id: eventData.user_id || null,
      device_id: eventData.device_id || null,
      ip_address: eventData.ip_address || null,
      event_type: eventData.event_type,
      metadata: eventData.metadata || null
    }, { transaction });
  }

  /**
   * Extract IP address from request
   * @param {Object} req - Express request object
   * @returns {string} - IP address
   */
  static extractIpAddress(req) {
    // Check for forwarded IP (if behind proxy)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  /**
   * Validate device registration (comprehensive abuse check)
   * @param {number} userId - User ID
   * @param {string} ipAddress - IP address
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<{allowed: boolean, reason?: string, details?: Object}>}
   */
  static async validateDeviceRegistration(userId, ipAddress, transaction = null) {
    // Check 1: Per-user device cap
    const capCheck = await this.checkDeviceCap(userId, transaction);
    if (capCheck.exceeded) {
      await this.logRiskEvent({
        user_id: userId,
        ip_address: ipAddress,
        event_type: 'DEVICE_CAP_EXCEEDED',
        metadata: {
          current: capCheck.current,
          max: capCheck.max
        }
      }, transaction);

      return {
        allowed: false,
        reason: 'DEVICE_CAP_EXCEEDED',
        details: {
          current: capCheck.current,
          max: capCheck.max,
          message: `Maximum ${capCheck.max} devices allowed per user`
        }
      };
    }

    // Check 2: Rate limit per IP
    const ipRateLimit = await this.checkRateLimit(
      ipAddress,
      'ip',
      MAX_DEVICES_PER_IP_PER_24H,
      transaction
    );
    if (ipRateLimit.exceeded) {
      await this.logRiskEvent({
        user_id: userId,
        ip_address: ipAddress,
        event_type: 'DEVICE_CREATION_RATE_LIMIT',
        metadata: {
          identifier_type: 'ip',
          current: ipRateLimit.current,
          max: ipRateLimit.max
        }
      }, transaction);

      return {
        allowed: false,
        reason: 'RATE_LIMIT_EXCEEDED',
        details: {
          type: 'ip',
          current: ipRateLimit.current,
          max: ipRateLimit.max,
          message: `Too many devices created from this IP address. Limit: ${ipRateLimit.max} per 24 hours`
        }
      };
    }

    // Check 3: Rate limit per user
    const userRateLimit = await this.checkRateLimit(
      userId.toString(),
      'user',
      MAX_DEVICES_PER_USER_PER_24H,
      transaction
    );
    if (userRateLimit.exceeded) {
      await this.logRiskEvent({
        user_id: userId,
        ip_address: ipAddress,
        event_type: 'DEVICE_CREATION_RATE_LIMIT',
        metadata: {
          identifier_type: 'user',
          current: userRateLimit.current,
          max: userRateLimit.max
        }
      }, transaction);

      return {
        allowed: false,
        reason: 'RATE_LIMIT_EXCEEDED',
        details: {
          type: 'user',
          current: userRateLimit.current,
          max: userRateLimit.max,
          message: `Too many devices created. Limit: ${userRateLimit.max} per 24 hours`
        }
      };
    }

    // Check 4: Device churn detection (log only, don't block)
    const churnCheck = await this.detectDeviceChurn(userId, transaction);
    if (churnCheck.suspicious) {
      await this.logRiskEvent({
        user_id: userId,
        ip_address: ipAddress,
        event_type: 'DEVICE_CHURN_DETECTED',
        metadata: {
          deviceCount: churnCheck.deviceCount,
          timeWindow: churnCheck.timeWindow
        }
      }, transaction);
      // Log but don't block - this is detection, not prevention
    }

    return { allowed: true };
  }
}

module.exports = AbuseDetectionService;
