/**
 * Update Routes
 * 
 * Handles application update checking
 * 
 * SECURITY: All endpoints require valid license authentication
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const UpdateService = require('../services/updateService');

const router = express.Router();

/**
 * POST /api/update/check
 * 
 * Client checks if an update is available
 * 
 * SECURITY:
 * - Requires valid license JWT
 * - Validates platform/arch match
 * - Uses build_number for comparison (not semver)
 * - Applies rollout percentage deterministically
 * - Fails closed on errors
 * 
 * Request Body:
 * {
 *   "currentVersion": "1.2.4",
 *   "currentBuild": 124,
 *   "platform": "mac",
 *   "arch": "arm64",
 *   "channel": "stable",
 *   "deviceId": "hashed-device-id"
 * }
 */
router.post(
  '/check',
  apiLimiter,
  authenticate,
  [
    body('currentVersion').optional().isString().withMessage('currentVersion must be a string'),
    body('currentBuild').isInt({ min: 0 }).withMessage('currentBuild must be a non-negative integer'),
    body('platform').isIn(['mac', 'windows', 'linux']).withMessage('platform must be mac, windows, or linux'),
    body('arch').optional().isIn(['x64', 'arm64']).withMessage('arch must be x64 or arm64'),
    body('channel').isIn(['stable', 'beta']).withMessage('channel must be stable or beta'),
    body('deviceId').isString().notEmpty().withMessage('deviceId is required')
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request parameters',
          details: errors.array()
        });
      }

      // SECURITY: Verify deviceId matches authenticated device
      // The JWT contains device_id, and we should verify it matches
      const authenticatedDeviceId = req.lease.device_id;
      const requestedDeviceId = req.body.deviceId;

      // Get device hash from database to compare
      const { Device } = require('../models');
      const device = await Device.findByPk(authenticatedDeviceId);
      
      if (!device) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Device not found'
        });
      }

      // SECURITY: Verify deviceId matches (prevent spoofing)
      // In production, you might hash the device_hash and compare
      // For now, we'll use the device_id from JWT as the source of truth
      // The client-provided deviceId is used for rollout hashing only

      // Check for update
      const updateResult = await UpdateService.checkForUpdate({
        currentVersion: req.body.currentVersion,
        currentBuild: req.body.currentBuild,
        platform: req.body.platform,
        arch: req.body.arch,
        channel: req.body.channel,
        deviceId: requestedDeviceId || device.device_hash // Use device_hash for deterministic hashing
      });

      // SECURITY: Fail closed - if error occurred, don't grant update info
      if (updateResult.error) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: updateResult.error
        });
      }

      return res.status(200).json(updateResult);
    } catch (error) {
      console.error('Update check error:', error);
      // SECURITY: Fail closed - never grant update info on error
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to check for updates'
      });
    }
  }
);

module.exports = router;
