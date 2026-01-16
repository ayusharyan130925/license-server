const { User, Device, Subscription, DeviceUser } = require('../models');
const { Op } = require('sequelize');
const db = require('../models');
const AbuseDetectionService = require('./abuseDetectionService');

/**
 * License Service
 * 
 * Core business logic for license management:
 * - Trial enforcement (device-based, 14 days)
 * - License status calculation
 * - Device-user associations
 * 
 * SECURITY NOTES:
 * - All operations use database transactions for atomicity
 * - Row-level locking prevents race conditions
 * - Trial fields are immutable once set (enforced at DB + app level)
 * - All date calculations are server-side to prevent tampering
 */
class LicenseService {
  /**
   * Calculate trial end date (14 days from start)
   * @param {Date} startDate - Trial start date
   * @returns {Date} - Trial end date
   */
  static calculateTrialEndDate(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 14);
    return endDate;
  }

  /**
   * Check if trial is currently active
   * @param {Device} device - Device instance
   * @returns {boolean} - True if trial is active
   */
  static isTrialActive(device) {
    if (!device.trial_started_at || !device.trial_ended_at) {
      return false;
    }
    const now = new Date();
    return now >= new Date(device.trial_started_at) && now <= new Date(device.trial_ended_at);
  }

  /**
   * Check if trial has expired
   * @param {Device} device - Device instance
   * @returns {boolean} - True if trial has expired
   */
  static isTrialExpired(device) {
    if (!device.trial_ended_at) {
      return false;
    }
    return new Date() > new Date(device.trial_ended_at);
  }

  /**
   * Get or create user by email
   * Idempotent operation - unique constraint on email prevents duplicates
   * @param {string} email - User email
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<User>} - User instance
   */
  static async getOrCreateUser(email, transaction = null) {
    const [user] = await User.findOrCreate({
      where: { email: email.toLowerCase().trim() },
      defaults: { email: email.toLowerCase().trim() },
      transaction
    });
    return user;
  }

  /**
   * Get or create device by hash
   * Uses row-level locking to prevent race conditions
   * @param {string} deviceHash - Hashed device identifier
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<Device>} - Device instance
   */
  static async getOrCreateDevice(deviceHash, transaction = null) {
    // Use row-level lock to prevent concurrent trial creation
    const [device] = await Device.findOrCreate({
      where: { device_hash: deviceHash },
      defaults: {
        device_hash: deviceHash,
        first_seen_at: new Date()
      },
      transaction,
      lock: transaction ? db.Sequelize.Transaction.LOCK.UPDATE : undefined
    });
    
    // Reload with lock if in transaction to ensure fresh data
    if (transaction && !device.isNewRecord) {
      await device.reload({
        transaction,
        lock: db.Sequelize.Transaction.LOCK.UPDATE
      });
    }
    
    return device;
  }

  /**
   * Start trial for a device (if eligible)
   * Trial eligibility: device has never consumed a trial
   * 
   * SECURITY: This method enforces immutability:
   * - trial_consumed can NEVER be reset to false
   * - trial_started_at can NEVER be modified once set
   * - Uses atomic UPDATE with WHERE clause to prevent race conditions
   * 
   * @param {Device} device - Device instance (must be locked if in transaction)
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<Device>} - Updated device instance
   */
  static async startTrialIfEligible(device, transaction = null) {
    // CRITICAL: Check immutability - trial_consumed is permanent
    if (device.trial_consumed) {
      // Reload to get latest state
      await device.reload({ transaction });
      return device;
    }

    // CRITICAL: If trial already started, it's immutable - don't restart
    if (device.trial_started_at) {
      // Ensure trial_consumed is set (defensive check)
      if (!device.trial_consumed) {
        device.trial_consumed = true;
        await device.save({ transaction });
      }
      return device;
    }

    // SECURITY: Use atomic UPDATE with WHERE clause to prevent race conditions
    // Only update if trial_started_at is NULL (not already set)
    const now = new Date();
    const trialEndDate = this.calculateTrialEndDate(now);

    // Atomic update - only succeeds if trial hasn't been started by another request
    const [affectedRows] = await Device.update(
      {
        trial_started_at: now,
        trial_ended_at: trialEndDate,
        trial_consumed: true
      },
      {
        where: {
          id: device.id,
          trial_started_at: null, // CRITICAL: Only update if not already set
          trial_consumed: false
        },
        transaction
      }
    );

    // Reload device to get updated values
    await device.reload({ transaction });

    // If update didn't affect any rows, another request already started the trial
    if (affectedRows === 0 && !device.trial_started_at) {
      // Another concurrent request started the trial - reload to get their values
      await device.reload({ transaction });
    }

    return device;
  }

  /**
   * Link user to device
   * Idempotent operation - unique constraint prevents duplicates
   * @param {number} userId - User ID
   * @param {number} deviceId - Device ID
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<DeviceUser>} - DeviceUser instance
   */
  static async linkUserToDevice(userId, deviceId, transaction = null) {
    const [deviceUser] = await DeviceUser.findOrCreate({
      where: {
        user_id: userId,
        device_id: deviceId
      },
      defaults: {
        user_id: userId,
        device_id: deviceId
      },
      transaction
    });
    return deviceUser;
  }

  /**
   * Get active subscription for a user
   * @param {number} userId - User ID
   * @returns {Promise<Subscription|null>} - Active subscription or null
   */
  static async getActiveSubscription(userId) {
    const subscription = await Subscription.findOne({
      where: {
        user_id: userId,
        status: 'active'
      },
      order: [['created_at', 'DESC']]
    });
    return subscription;
  }

  /**
   * Check if subscription is currently active (status is active AND period hasn't ended)
   * @param {Subscription} subscription - Subscription instance
   * @returns {boolean} - True if subscription is active
   */
  static isSubscriptionActive(subscription) {
    if (!subscription || subscription.status !== 'active') {
      return false;
    }

    // Check if subscription period has ended
    if (subscription.current_period_end) {
      const now = new Date();
      const periodEnd = new Date(subscription.current_period_end);
      // If period has ended, subscription is no longer active
      if (now > periodEnd) {
        return false;
      }
    }

    // Check if subscription is set to cancel at period end
    if (subscription.cancel_at_period_end && subscription.current_period_end) {
      const now = new Date();
      const periodEnd = new Date(subscription.current_period_end);
      // If we're past the cancellation date, subscription is expired
      if (now > periodEnd) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get license status for a user-device pair
   * Priority: Active subscription > Trial > Expired
   * 
   * SECURITY: Updates last_seen_at to track device activity
   * Checks subscription current_period_end to determine if license is still valid
   * 
   * @param {number} userId - User ID
   * @param {number} deviceId - Device ID
   * @param {Transaction} transaction - Optional transaction for consistency
   * @returns {Promise<Object>} - License status object
   */
  static async getLicenseStatus(userId, deviceId, transaction = null) {
    // Load device with trial information (use transaction if provided for consistency)
    const device = await Device.findByPk(deviceId, { transaction });
    if (!device) {
      throw new Error('Device not found');
    }

    // SECURITY: Update last_seen_at for device activity tracking
    // This helps detect device churn and suspicious patterns
    device.last_seen_at = new Date();
    await device.save({ transaction });

    // Check for active subscription first
    const subscription = await this.getActiveSubscription(userId);
    if (subscription && this.isSubscriptionActive(subscription)) {
      // Calculate days until expiration if period_end is set
      let expiresAt = null;
      let daysLeft = null;
      
      if (subscription.current_period_end) {
        expiresAt = subscription.current_period_end;
        const now = new Date();
        const periodEnd = new Date(subscription.current_period_end);
        const days = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24));
        daysLeft = Math.max(0, days);
      }

      return {
        status: 'active',
        expires_at: expiresAt,
        days_left: daysLeft,
        trial_expired: false
      };
    }

    // Check trial status
    if (this.isTrialActive(device)) {
      const now = new Date();
      const trialEnd = new Date(device.trial_ended_at);
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

      return {
        status: 'trial',
        expires_at: device.trial_ended_at,
        days_left: Math.max(0, daysLeft),
        trial_expired: false
      };
    }

    // Trial expired or no trial
    return {
      status: 'expired',
      expires_at: device.trial_ended_at || null,
      days_left: 0,
      trial_expired: true
    };
  }

  /**
   * Register a new user-device pair
   * Handles trial eligibility automatically
   * 
   * SECURITY: Entire operation wrapped in transaction to ensure atomicity
   * Uses row-level locking to prevent race conditions on concurrent registrations
   * Includes abuse detection (device caps, rate limiting)
   * 
   * @param {string} email - User email
   * @param {string} deviceHash - Hashed device identifier
   * @param {string} ipAddress - Client IP address (for rate limiting)
   * @returns {Promise<Object>} - Registration result with license status
   * @throws {Error} - If abuse detection fails (with reason in error.message)
   */
  static async registerUserDevice(email, deviceHash, ipAddress = null) {
    // CRITICAL: Wrap entire registration in transaction for atomicity
    return await db.sequelize.transaction(async (transaction) => {
      // Get or create user (idempotent operation)
      const user = await this.getOrCreateUser(email, transaction);

      // SECURITY: Validate device registration (abuse detection)
      // This checks device caps, rate limits, and logs suspicious patterns
      if (ipAddress) {
        const validation = await AbuseDetectionService.validateDeviceRegistration(
          user.id,
          ipAddress,
          transaction
        );

        if (!validation.allowed) {
          // Create error with structured details for proper HTTP status codes
          const error = new Error(validation.details.message || 'Device registration denied');
          error.code = validation.reason;
          error.details = validation.details;
          throw error;
        }
      }

      // Get or create device with row-level lock to prevent race conditions
      // This ensures only one request can start a trial for a device
      const device = await this.getOrCreateDevice(deviceHash, transaction);

      // Check if this is a new device-user link (not just re-linking existing)
      const existingLink = await DeviceUser.findOne({
        where: {
          user_id: user.id,
          device_id: device.id
        },
        transaction
      });

      const isNewDeviceLink = !existingLink;

      // Start trial if device is eligible (atomic, race-condition safe)
      await this.startTrialIfEligible(device, transaction);

      // Link user to device (idempotent - unique constraint prevents duplicates)
      await this.linkUserToDevice(user.id, device.id, transaction);

      // SECURITY: Increment rate limit counters only if this is a new device link
      if (isNewDeviceLink && ipAddress) {
        await AbuseDetectionService.incrementDeviceCreation(
          ipAddress,
          'ip',
          transaction
        );
        await AbuseDetectionService.incrementDeviceCreation(
          user.id.toString(),
          'user',
          transaction
        );
      }

      // Get license status (reads from transaction - device was just created/updated)
      const licenseStatus = await this.getLicenseStatus(user.id, device.id, transaction);

      return {
        user_id: user.id,
        device_id: device.id,
        license_status: licenseStatus.status,
        trial_expires_at: licenseStatus.expires_at,
        days_left: licenseStatus.days_left
      };
    });
  }
}

module.exports = LicenseService;
