const { Plan, Subscription, Device } = require('../models');
const { Op } = require('sequelize');

/**
 * Entitlements Service
 * 
 * Handles plan resolution and feature entitlement building.
 * 
 * SECURITY:
 * - All plan resolution is server-side
 * - No client can override features
 * - Dates computed server-side only
 * - Transaction-safe operations
 */
class EntitlementsService {
  /**
   * Resolve the effective plan for a user-device pair
   * 
   * Priority:
   * 1. Active subscription → subscription.plan
   * 2. Active trial → trial plan
   * 3. Otherwise → null (expired, no features)
   * 
   * @param {number} userId - User ID
   * @param {number} deviceId - Device ID
   * @param {Transaction} transaction - Optional transaction for consistency
   * @returns {Promise<Plan|null>} - Resolved plan or null if expired
   */
  static async resolveEffectivePlan(userId, deviceId, transaction = null) {
    // Priority 1: Check for active subscription with plan
    const activeSubscription = await Subscription.findOne({
      where: {
        user_id: userId,
        status: 'active'
      },
      include: [{
        model: Plan,
        as: 'plan',
        required: false
      }],
      order: [['created_at', 'DESC']],
      transaction
    });

    if (activeSubscription && activeSubscription.plan) {
      return activeSubscription.plan;
    }

    // Priority 2: Check for active trial
    const device = await Device.findByPk(deviceId, { transaction });
    if (!device) {
      return null;
    }

    if (this.isTrialActive(device)) {
      // Get trial plan
      const trialPlan = await Plan.findOne({
        where: { name: 'trial' },
        transaction
      });
      return trialPlan;
    }

    // Priority 3: Expired or no access
    return null;
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
   * Build entitlements object from plan
   * 
   * Returns feature object used by client:
   * {
   *   max_cameras: number,
   *   pdf_export: boolean,
   *   fps_limit: number,
   *   cloud_backup: boolean
   * }
   * 
   * @param {Plan|null} plan - Plan instance or null
   * @returns {Object} - Features object (all false/0 if plan is null)
   */
  static buildEntitlements(plan) {
    if (!plan) {
      // No plan = no features (expired)
      return {
        max_cameras: 0,
        pdf_export: false,
        fps_limit: 0,
        cloud_backup: false
      };
    }

    return {
      max_cameras: plan.max_cameras || 0,
      pdf_export: plan.pdf_export || false,
      fps_limit: plan.fps_limit || 0,
      cloud_backup: plan.cloud_backup || false
    };
  }

  /**
   * Get plan by name
   * @param {string} planName - Plan name (trial, basic, pro)
   * @param {Transaction} transaction - Optional transaction
   * @returns {Promise<Plan|null>} - Plan instance or null
   */
  static async getPlanByName(planName, transaction = null) {
    return await Plan.findOne({
      where: { name: planName },
      transaction
    });
  }

  /**
   * Get license status with plan information
   * 
   * @param {number} userId - User ID
   * @param {number} deviceId - Device ID
   * @param {Transaction} transaction - Optional transaction
   * @returns {Promise<Object>} - License status with plan info
   */
  static async getLicenseStatusWithPlan(userId, deviceId, transaction = null) {
    const device = await Device.findByPk(deviceId, { transaction });
    if (!device) {
      throw new Error('Device not found');
    }

    // Update last_seen_at
    device.last_seen_at = new Date();
    await device.save({ transaction });

    // Resolve effective plan
    const plan = await this.resolveEffectivePlan(userId, deviceId, transaction);

    // Determine license status
    let status = 'expired';
    let expires_at = null;
    let days_left = 0;

    if (plan) {
      if (plan.name === 'trial') {
        status = 'trial';
        expires_at = device.trial_ended_at;
        if (expires_at) {
          const now = new Date();
          const trialEnd = new Date(expires_at);
          days_left = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
        }
      } else {
        // Active subscription
        status = 'active';
        expires_at = null; // Subscriptions don't expire until cancelled
        days_left = null;
      }
    } else {
      // Expired
      expires_at = device.trial_ended_at || null;
      days_left = 0;
    }

    // Build entitlements
    const features = this.buildEntitlements(plan);

    return {
      status,
      plan: plan ? plan.name : null,
      features,
      expires_at,
      days_left
    };
  }
}

module.exports = EntitlementsService;
