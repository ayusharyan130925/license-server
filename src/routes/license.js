const express = require('express');
const LicenseService = require('../services/licenseService');
const EntitlementsService = require('../services/entitlementsService');
const JWTService = require('../services/jwtService');
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * GET /license/status
 * 
 * Get current license status for authenticated device.
 * 
 * Headers:
 *   - Authorization: Bearer <lease_token>
 *   - X-Device-Id: <device_hash>
 * 
 * Response:
 *   - status: "trial" | "active" | "expired"
 *   - expires_at: ISO date string (null for active subscriptions)
 *   - days_left: Number of days remaining (null for active subscriptions)
 *   - lease_token: New JWT token (refreshed)
 * 
 * Security:
 *   - Validates JWT token
 *   - Verifies device_id matches X-Device-Id header
 *   - All date calculations are server-side
 */
router.get(
  '/status',
  apiLimiter,
  authenticate,
  async (req, res) => {
    try {
      const deviceId = req.lease.device_id;

      // Get user associated with this device
      const { DeviceUser } = require('../models');
      const deviceUser = await DeviceUser.findOne({
        where: { device_id: deviceId },
        order: [['created_at', 'DESC']]
      });

      if (!deviceUser) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'No user associated with this device'
        });
      }

      // Get license status
      const licenseStatus = await LicenseService.getLicenseStatus(
        deviceUser.user_id,
        deviceId
      );

      // Get license status with plan and features
      const licenseWithPlan = await EntitlementsService.getLicenseStatusWithPlan(
        deviceUser.user_id,
        deviceId
      );

      // Generate new lease token (refresh) with plan and features
      const leaseToken = JWTService.generateLeaseToken({
        device_id: deviceId,
        license_status: licenseWithPlan.status,
        expires_at: licenseWithPlan.expires_at,
        plan: licenseWithPlan.plan,
        features: licenseWithPlan.features
      });

      res.status(200).json({
        status: licenseWithPlan.status,
        expires_at: licenseWithPlan.expires_at,
        days_left: licenseWithPlan.days_left,
        lease_token: leaseToken
      });
    } catch (error) {
      console.error('License status error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get license status'
      });
    }
  }
);

/**
 * GET /license/lease
 * 
 * Get license lease with plan and feature entitlements.
 * 
 * Headers:
 *   - Authorization: Bearer <lease_token>
 *   - X-Device-Id: <device_hash>
 * 
 * Response:
 *   {
 *     token: "JWT token with embedded plan and features",
 *     license_status: "trial" | "active" | "expired",
 *     plan: "trial" | "basic" | "pro" | null,
 *     features: {
 *       max_cameras: number,
 *       pdf_export: boolean,
 *       fps_limit: number,
 *       cloud_backup: boolean
 *     },
 *     expires_at: ISO date string | null
 *   }
 * 
 * Security:
 *   - Validates JWT token
 *   - Verifies device_id matches X-Device-Id header
 *   - All plan resolution is server-side
 *   - Features computed server-side only
 *   - Token is signed and immutable
 */
router.get(
  '/lease',
  apiLimiter,
  authenticate,
  async (req, res) => {
    try {
      const deviceId = req.lease.device_id;

      // Get user associated with this device
      const { DeviceUser } = require('../models');
      const deviceUser = await DeviceUser.findOne({
        where: { device_id: deviceId },
        order: [['created_at', 'DESC']]
      });

      if (!deviceUser) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'No user associated with this device'
        });
      }

      // Get license status with plan and features
      const licenseWithPlan = await EntitlementsService.getLicenseStatusWithPlan(
        deviceUser.user_id,
        deviceId
      );

      // Generate new lease token with plan and features embedded
      const leaseToken = JWTService.generateLeaseToken({
        device_id: deviceId,
        license_status: licenseWithPlan.status,
        expires_at: licenseWithPlan.expires_at,
        plan: licenseWithPlan.plan,
        features: licenseWithPlan.features
      });

      res.status(200).json({
        token: leaseToken,
        license_status: licenseWithPlan.status,
        plan: licenseWithPlan.plan,
        features: licenseWithPlan.features,
        expires_at: licenseWithPlan.expires_at
      });
    } catch (error) {
      console.error('License lease error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get license lease'
      });
    }
  }
);

module.exports = router;
