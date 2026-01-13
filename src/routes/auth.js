const express = require('express');
const { body, validationResult } = require('express-validator');
const LicenseService = require('../services/licenseService');
const JWTService = require('../services/jwtService');
const AbuseDetectionService = require('../services/abuseDetectionService');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * POST /auth/register
 * 
 * Register a new user-device pair and start trial if eligible.
 * 
 * Input:
 *   - email: User email address
 *   - device_hash: Hashed device identifier
 * 
 * Behavior:
 *   - Creates user if not exists
 *   - Registers device if not exists
 *   - Starts 14-day trial if device is eligible (never consumed trial)
 *   - Links user to device
 * 
 * Response:
 *   - license_status: "trial" | "active" | "expired"
 *   - trial_expires_at: ISO date string (if trial)
 *   - days_left: Number of days remaining (if trial)
 *   - lease_token: JWT token for license validation
 */
router.post(
  '/register',
  authLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('device_hash')
      .notEmpty()
      .trim()
      .isLength({ min: 32, max: 255 })
      .withMessage('Device hash is required and must be at least 32 characters')
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          details: errors.array()
        });
      }

      const { email, device_hash } = req.body;

      // Extract IP address for abuse detection
      const ipAddress = AbuseDetectionService.extractIpAddress(req);

      // Register user-device pair and handle trial
      // SECURITY: IP address passed for rate limiting and abuse detection
      const registration = await LicenseService.registerUserDevice(email, device_hash, ipAddress);

      // Get full license status
      const licenseStatus = await LicenseService.getLicenseStatus(
        registration.user_id,
        registration.device_id
      );

      // Generate lease token
      const leaseToken = JWTService.generateLeaseToken({
        device_id: registration.device_id,
        license_status: licenseStatus.status,
        expires_at: licenseStatus.expires_at
      });

      res.status(200).json({
        success: true,
        license_status: licenseStatus.status,
        trial_expires_at: licenseStatus.expires_at,
        days_left: licenseStatus.days_left,
        lease_token: leaseToken
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      // SECURITY: Return appropriate HTTP status codes for expected errors
      // 409 Conflict: Device cap exceeded
      // 429 Too Many Requests: Rate limit exceeded
      // 500: Unexpected errors
      if (error.code === 'DEVICE_CAP_EXCEEDED') {
        return res.status(409).json({
          error: 'Device Cap Exceeded',
          message: error.details?.message || 'Maximum devices allowed per user',
          code: error.code,
          details: error.details
        });
      }

      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        return res.status(429).json({
          error: 'Rate Limit Exceeded',
          message: error.details?.message || 'Too many device registrations',
          code: error.code,
          details: error.details
        });
      }

      // Generic error for unexpected cases
      const isDevelopment = process.env.NODE_ENV === 'development';
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to register user-device pair',
        ...(isDevelopment && { details: error.message, stack: error.stack })
      });
    }
  }
);

module.exports = router;
