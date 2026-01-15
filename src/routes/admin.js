/**
 * Admin Routes
 * 
 * Administrative endpoints for managing app versions
 * 
 * SECURITY: All endpoints require admin authentication
 */

const express = require('express');
const { body, validationResult, query, param } = require('express-validator');
const { requireAdmin } = require('../middleware/adminAuth');
const UpdateService = require('../services/updateService');
const AbuseMetricsService = require('../services/abuseMetricsService');
const CleanupService = require('../services/cleanupService');
const { User, Device, Subscription, DeviceUser, Plan } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

/**
 * POST /api/admin/login
 *
 * Simple admin login endpoint.
 *
 * For now, this validates a single hardcoded admin user:
 * - email: visionai-desktop@gmail.com
 * - password: Demo@123
 *
 * On success, it returns a token that must be sent as X-Admin-Token
 * for all subsequent admin requests.
 *
 * SECURITY: In production, replace this with a proper admin auth system
 * (hashed passwords in DB, JWTs, etc.).
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isString().notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid credentials',
          details: errors.array()
        });
      }

      const { email, password } = req.body;

      // TEMPORARY: Hardcoded admin credentials
      const ADMIN_EMAIL = 'visionai-desktop@gmail.com';
      const ADMIN_PASSWORD = 'Demo@123';

      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password'
        });
      }

      // Use the same token that middleware expects
      const token = process.env.ADMIN_TOKEN || 'test-admin-token';

      return res.status(200).json({
        token,
        email
      });
    } catch (error) {
      console.error('Admin login error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to login'
      });
    }
  }
);

// All routes below this line require admin authentication
router.use(requireAdmin);

/**
 * POST /api/admin/versions
 * 
 * Create a new app version
 * 
 * Request Body:
 * {
 *   "platform": "mac",
 *   "arch": "arm64",
 *   "version": "1.3.0",
 *   "build_number": 130,
 *   "release_notes": "...",
 *   "download_url": "https://...",
 *   "is_mandatory": false,
 *   "is_active": true,
 *   "rollout_percentage": 50,
 *   "min_supported_build": null,
 *   "channel": "stable"
 * }
 */
router.post(
  '/versions',
  [
    body('platform').isIn(['mac', 'windows', 'linux']).withMessage('platform must be mac, windows, or linux'),
    body('arch').optional().isIn(['x64', 'arm64']).withMessage('arch must be x64 or arm64'),
    body('version').isString().notEmpty().withMessage('version is required'),
    body('build_number').isInt({ min: 0 }).withMessage('build_number must be a non-negative integer'),
    body('download_url').isURL().withMessage('download_url must be a valid URL'),
    body('is_mandatory').optional().isBoolean().withMessage('is_mandatory must be a boolean'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
    body('rollout_percentage').optional().isInt({ min: 0, max: 100 }).withMessage('rollout_percentage must be 0-100'),
    body('min_supported_build').optional().isInt({ min: 0 }).withMessage('min_supported_build must be a non-negative integer'),
    body('channel').optional().isIn(['stable', 'beta']).withMessage('channel must be stable or beta'),
    body('release_notes').optional().isString().withMessage('release_notes must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request parameters',
          details: errors.array()
        });
      }

      const version = await UpdateService.createVersion(req.body);

      return res.status(201).json({
        message: 'Version created successfully',
        version: {
          id: version.id,
          platform: version.platform,
          arch: version.arch,
          version: version.version,
          build_number: version.build_number,
          is_mandatory: version.is_mandatory,
          is_active: version.is_active,
          rollout_percentage: version.rollout_percentage,
          channel: version.channel
        }
      });
    } catch (error) {
      console.error('Create version error:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }
  }
);

/**
 * PATCH /api/admin/versions/:id
 * 
 * Update an existing app version
 * 
 * Can update:
 * - is_active (kill switch)
 * - is_mandatory (force update)
 * - rollout_percentage (gradual rollout)
 * - download_url (update URL)
 * - min_supported_build (block old versions)
 * - Other fields
 */
router.patch(
  '/versions/:id',
  [
    body('platform').optional().isIn(['mac', 'windows', 'linux']).withMessage('platform must be mac, windows, or linux'),
    body('arch').optional().isIn(['x64', 'arm64']).withMessage('arch must be x64 or arm64'),
    body('version').optional().isString().notEmpty().withMessage('version must be a string'),
    body('build_number').optional().isInt({ min: 0 }).withMessage('build_number must be a non-negative integer'),
    body('download_url').optional().isURL().withMessage('download_url must be a valid URL'),
    body('is_mandatory').optional().isBoolean().withMessage('is_mandatory must be a boolean'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
    body('rollout_percentage').optional().isInt({ min: 0, max: 100 }).withMessage('rollout_percentage must be 0-100'),
    body('min_supported_build').optional().isInt({ min: 0 }).withMessage('min_supported_build must be a non-negative integer'),
    body('channel').optional().isIn(['stable', 'beta']).withMessage('channel must be stable or beta'),
    body('release_notes').optional().isString().withMessage('release_notes must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request parameters',
          details: errors.array()
        });
      }

      const versionId = parseInt(req.params.id);
      if (isNaN(versionId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid version ID'
        });
      }

      const version = await UpdateService.updateVersion(versionId, req.body);

      return res.status(200).json({
        message: 'Version updated successfully',
        version: {
          id: version.id,
          platform: version.platform,
          arch: version.arch,
          version: version.version,
          build_number: version.build_number,
          is_mandatory: version.is_mandatory,
          is_active: version.is_active,
          rollout_percentage: version.rollout_percentage,
          min_supported_build: version.min_supported_build,
          channel: version.channel
        }
      });
    } catch (error) {
      console.error('Update version error:', error);
      if (error.message === 'Version not found') {
        return res.status(404).json({
          error: 'Not Found',
          message: error.message
        });
      }
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/admin/versions
 * 
 * List app versions with optional filters
 * 
 * Query Parameters:
 * - platform: Filter by platform
 * - channel: Filter by channel
 * - is_active: Filter by active status
 * - arch: Filter by architecture
 */
router.get(
  '/versions',
  [
    query('platform').optional().isIn(['mac', 'windows', 'linux']).withMessage('platform must be mac, windows, or linux'),
    query('channel').optional().isIn(['stable', 'beta']).withMessage('channel must be stable or beta'),
    query('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
    query('arch').optional().isIn(['x64', 'arm64']).withMessage('arch must be x64 or arm64')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: errors.array()
        });
      }

      const filters = {};
      if (req.query.platform) filters.platform = req.query.platform;
      if (req.query.channel) filters.channel = req.query.channel;
      if (req.query.is_active !== undefined) {
        filters.is_active = req.query.is_active === 'true';
      }
      if (req.query.arch) filters.arch = req.query.arch;

      const versions = await UpdateService.listVersions(filters);

      return res.status(200).json({
        versions: versions.map(v => ({
          id: v.id,
          platform: v.platform,
          arch: v.arch,
          version: v.version,
          build_number: v.build_number,
          release_notes: v.release_notes,
          download_url: v.download_url,
          is_mandatory: v.is_mandatory,
          is_active: v.is_active,
          rollout_percentage: v.rollout_percentage,
          min_supported_build: v.min_supported_build,
          channel: v.channel,
          created_at: v.created_at,
          updated_at: v.updated_at
        }))
      });
    } catch (error) {
      console.error('List versions error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to list versions'
      });
    }
  }
);

/**
 * GET /api/admin/users
 * 
 * List all users
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['created_at', 'DESC']],
      attributes: ['id', 'email', 'max_devices', 'created_at', 'updated_at']
    });

    return res.status(200).json({ users });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list users'
    });
  }
});

/**
 * GET /api/admin/users/:id
 * 
 * Get user details
 */
router.get('/users/:id', [
  param('id').isInt().withMessage('User ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request parameters',
        details: errors.array()
      });
    }

    const userId = parseInt(req.params.id);
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'max_devices', 'created_at', 'updated_at']
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user'
    });
  }
});

/**
 * GET /api/admin/users/:id/devices
 * 
 * Get devices for a user
 */
router.get('/users/:id/devices', [
  param('id').isInt().withMessage('User ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request parameters',
        details: errors.array()
      });
    }

    const userId = parseInt(req.params.id);
    const deviceUsers = await DeviceUser.findAll({
      where: { user_id: userId },
      include: [{
        model: Device,
        as: 'device',
        attributes: ['id', 'device_hash', 'trial_started_at', 'trial_ended_at', 'trial_consumed', 'first_seen_at', 'last_seen_at']
      }]
    });

    const devices = deviceUsers.map(du => du.device).filter(Boolean);

    return res.status(200).json({ devices });
  } catch (error) {
    console.error('Get user devices error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user devices'
    });
  }
});

/**
 * GET /api/admin/users/:id/subscriptions
 * 
 * Get subscriptions for a user
 */
router.get('/users/:id/subscriptions', [
  param('id').isInt().withMessage('User ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request parameters',
        details: errors.array()
      });
    }

    const userId = parseInt(req.params.id);
    const subscriptions = await Subscription.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'user_id', 'stripe_customer_id', 'stripe_subscription_id', 'status', 'created_at', 'updated_at']
    });

    return res.status(200).json({ subscriptions });
  } catch (error) {
    console.error('Get user subscriptions error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user subscriptions'
    });
  }
});

/**
 * GET /api/admin/devices
 * 
 * List all devices
 */
router.get('/devices', async (req, res) => {
  try {
    const devices = await Device.findAll({
      order: [['created_at', 'DESC']],
      attributes: ['id', 'device_hash', 'trial_started_at', 'trial_ended_at', 'trial_consumed', 'first_seen_at', 'last_seen_at', 'created_at', 'updated_at']
    });

    return res.status(200).json({ devices });
  } catch (error) {
    console.error('List devices error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list devices'
    });
  }
});

/**
 * GET /api/admin/devices/:id
 * 
 * Get device details
 */
router.get('/devices/:id', [
  param('id').isInt().withMessage('Device ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request parameters',
        details: errors.array()
      });
    }

    const deviceId = parseInt(req.params.id);
    const device = await Device.findByPk(deviceId);

    if (!device) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Device not found'
      });
    }

    return res.status(200).json({ device });
  } catch (error) {
    console.error('Get device error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get device'
    });
  }
});

/**
 * GET /api/admin/subscriptions
 * 
 * List all subscriptions
 */
router.get('/subscriptions', async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      order: [['created_at', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email'],
        required: false // LEFT JOIN - include subscriptions even if user doesn't exist
      }]
    });

    return res.status(200).json({
      subscriptions: subscriptions.map(sub => {
        // Safely access user email
        const userEmail = sub.user ? sub.user.email : null;
        
        return {
          id: sub.id,
          user_id: sub.user_id,
          user_email: userEmail,
          stripe_customer_id: sub.stripe_customer_id || null,
          stripe_subscription_id: sub.stripe_subscription_id || null,
          status: sub.status,
          created_at: sub.created_at,
          updated_at: sub.updated_at
        };
      })
    });
  } catch (error) {
    console.error('List subscriptions error:', error);
    console.error('Error details:', error.stack);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list subscriptions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/stats
 * 
 * Get dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalDevices, activeSubscriptions, activeTrials] = await Promise.all([
      User.count(),
      Device.count(),
      Subscription.count({ where: { status: 'active' } }),
      Device.count({
        where: {
          trial_started_at: { [Op.ne]: null },
          trial_ended_at: { [Op.gte]: new Date() }
        }
      })
    ]);

    return res.status(200).json({
      totalUsers,
      totalDevices,
      activeSubscriptions,
      activeTrials
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get statistics'
    });
  }
});

/**
 * GET /api/admin/abuse/metrics
 * 
 * Get abuse detection metrics and statistics
 */
router.get('/abuse/metrics', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
    const eventType = req.query.eventType || null;

    const summary = await AbuseMetricsService.getAbuseSummary({
      startDate,
      endDate,
      eventType
    });

    return res.status(200).json(summary);
  } catch (error) {
    console.error('Get abuse metrics error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get abuse metrics'
    });
  }
});

/**
 * GET /api/admin/abuse/risk-events
 * 
 * Get recent risk events
 */
router.get('/abuse/risk-events', [
  query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be between 1 and 500')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid query parameters',
        details: errors.array()
      });
    }

    const limit = parseInt(req.query.limit || '50', 10);
    const events = await AbuseMetricsService.getRecentRiskEvents(limit);

    return res.status(200).json({ events });
  } catch (error) {
    console.error('Get risk events error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get risk events'
    });
  }
});

/**
 * POST /api/admin/abuse/cleanup
 * 
 * Manually trigger cleanup job
 */
router.post('/abuse/cleanup', async (req, res) => {
  try {
    const {
      rateLimitRetentionDays = 7,
      riskEventRetentionDays = 90
    } = req.body;

    const result = await CleanupService.runCleanup({
      rateLimitRetentionDays,
      riskEventRetentionDays
    });

    return res.status(200).json({
      message: 'Cleanup completed successfully',
      result
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to run cleanup'
    });
  }
});

/**
 * GET /api/admin/abuse/config
 * 
 * Get current abuse detection configuration
 */
router.get('/abuse/config', async (req, res) => {
  try {
    const config = require('../config');
    
    return res.status(200).json({
      defaultMaxDevicesPerUser: config.abuseDetection.defaultMaxDevicesPerUser,
      maxDevicesPerIpPer24h: config.abuseDetection.maxDevicesPerIpPer24h,
      maxDevicesPerUserPer24h: config.abuseDetection.maxDevicesPerUserPer24h,
      deviceChurnThreshold: config.abuseDetection.deviceChurnThreshold,
      rateLimitRetentionDays: config.abuseDetection.rateLimitRetentionDays,
      riskEventRetentionDays: config.abuseDetection.riskEventRetentionDays,
      cleanupIntervalHours: config.abuseDetection.cleanupIntervalHours
    });
  } catch (error) {
    console.error('Get abuse config error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get abuse configuration'
    });
  }
});

/**
 * GET /api/admin/leads
 * 
 * Get user leads with conversion tracking and subscription status
 * 
 * Query Parameters:
 * - status: Filter by status (trial_ending, trial_expired, active, expired, converted, churned)
 * - sortBy: Sort field (email, created_at, trial_ends_at, subscription_status)
 * - sortOrder: asc or desc
 * - search: Search by email
 * - daysUntilExpiry: Filter by days until trial/license expires (e.g., 3 for 3 days or less)
 */
router.get('/leads', async (req, res) => {
  try {
    const { status, sortBy = 'created_at', sortOrder = 'desc', search, daysUntilExpiry } = req.query;

    // Get all users with their subscriptions
    // Note: Plan include is optional in case plans table or plan_id column doesn't exist
    let users;
    try {
      // First try with plan include (if plan_id column exists)
      users = await User.findAll({
        include: [
          {
            model: Subscription,
            as: 'subscriptions',
            include: [{
              model: Plan,
              as: 'plan',
              required: false
            }],
            required: false
          }
        ],
        order: [[sortBy, sortOrder.toUpperCase()]]
      });
    } catch (planError) {
      // If plans table or plan_id column doesn't exist, fetch without plan include
      // Explicitly list attributes to avoid plan_id column reference
      const errorMsg = planError.message || '';
      const parentErrorMsg = planError.parent?.message || '';
      const fullErrorMsg = `${errorMsg} ${parentErrorMsg}`;
      
      if (fullErrorMsg.includes('plans') || fullErrorMsg.includes('plan_id') || fullErrorMsg.includes('Unknown column')) {
        console.log('Plans table or plan_id column not found, fetching subscriptions without plan include');
        users = await User.findAll({
          include: [
            {
              model: Subscription,
              as: 'subscriptions',
              required: false,
              attributes: ['id', 'user_id', 'stripe_customer_id', 'stripe_subscription_id', 'status', 'created_at', 'updated_at']
            }
          ],
          order: [[sortBy, sortOrder.toUpperCase()]]
        });
      } else {
        throw planError;
      }
    }

    // Get devices for all users
    const userIds = users.map(u => u.id);
    const deviceUsers = await DeviceUser.findAll({
      where: { user_id: { [Op.in]: userIds } },
      include: [{ model: Device, as: 'device' }]
    });

    // Group devices by user
    const devicesByUser = {};
    deviceUsers.forEach(du => {
      if (!devicesByUser[du.user_id]) {
        devicesByUser[du.user_id] = [];
      }
      if (du.device) {
        devicesByUser[du.user_id].push(du.device);
      }
    });

    const now = new Date();
    const leads = users.map(user => {
      // Get subscriptions
      const activeSubscription = user.subscriptions?.find(sub => sub.status === 'active');
      const trialSubscription = user.subscriptions?.find(sub => sub.status === 'trial');
      const expiredSubscription = user.subscriptions?.find(sub => sub.status === 'expired');

      // Get user's devices with trial info
      const userDevices = devicesByUser[user.id] || [];
      
      // Find devices with trial info (has trial_started_at and trial_ended_at)
      const devicesWithTrial = userDevices.filter(device => 
        device.trial_started_at && device.trial_ended_at
      );
      
      // Find active trial device (trial hasn't ended yet)
      const activeTrialDevice = devicesWithTrial.find(device => {
        const trialEnd = new Date(device.trial_ended_at);
        return trialEnd >= now;
      });
      
      // Find expired trial device (trial has ended by date)
      const expiredTrialDevice = devicesWithTrial.find(device => {
        const trialEnd = new Date(device.trial_ended_at);
        return trialEnd < now;
      });
      
      // Check if any device has consumed trial (trial_consumed = true)
      // This is the definitive flag that a trial was used
      const hasConsumedTrial = userDevices.some(device => device.trial_consumed === true);
      
      // Find the most recent expired trial device for date calculations
      const mostRecentExpiredTrial = devicesWithTrial
        .filter(device => {
          const trialEnd = new Date(device.trial_ended_at);
          return trialEnd < now;
        })
        .sort((a, b) => new Date(b.trial_ended_at) - new Date(a.trial_ended_at))[0];
      
      // Check if user has an expired trial
      // Either: trial_ended_at < now, OR trial_consumed = true (and no active trial/subscription)
      const hasExpiredTrial = expiredTrialDevice !== undefined || 
                              mostRecentExpiredTrial !== undefined ||
                              (hasConsumedTrial && !activeTrialDevice && !activeSubscription);

      // Calculate days until expiry
      let daysUntilExpiryCalc = null;
      let expiryDate = null;
      if (activeTrialDevice && activeTrialDevice.trial_ended_at) {
        expiryDate = new Date(activeTrialDevice.trial_ended_at);
        daysUntilExpiryCalc = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      }

      // Determine lead status
      let leadStatus = 'unknown';
      
      // Priority 1: Active subscription (paid)
      if (activeSubscription) {
        // Check if converted from trial (had trial before getting active subscription)
        if (expiredTrialDevice || hasConsumedTrial || trialSubscription) {
          leadStatus = 'converted';
        } else {
          leadStatus = 'active';
        }
      }
      // Priority 2: Currently in trial
      else if (activeTrialDevice) {
        if (daysUntilExpiryCalc !== null && daysUntilExpiryCalc <= 3 && daysUntilExpiryCalc >= 0) {
          leadStatus = 'trial_ending';
        } else {
          leadStatus = 'trial_active';
        }
      }
      // Priority 3: Trial expired but no active subscription
      else if (hasExpiredTrial) {
        // Check if they had a paid subscription that expired (churned)
        if (expiredSubscription) {
          leadStatus = 'churned';
        } else {
          // Trial expired and never converted to paid
          leadStatus = 'trial_expired';
        }
      }
      // Priority 4: Only expired subscription (no trial history)
      else if (expiredSubscription) {
        leadStatus = 'expired';
      }
      // Priority 5: No subscription or trial at all
      else if (userDevices.length === 0) {
        leadStatus = 'no_activity';
      }

      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        max_devices: user.max_devices,
        subscription_status: activeSubscription ? 'active' : (trialSubscription ? 'trial' : (expiredSubscription ? 'expired' : 'none')),
        plan: (activeSubscription?.plan?.name || trialSubscription?.plan?.name || 'none'),
        trial_started_at: activeTrialDevice?.trial_started_at || mostRecentExpiredTrial?.trial_started_at || expiredTrialDevice?.trial_started_at,
        trial_ended_at: activeTrialDevice?.trial_ended_at || mostRecentExpiredTrial?.trial_ended_at || expiredTrialDevice?.trial_ended_at,
        days_until_expiry: daysUntilExpiryCalc,
        expiry_date: expiryDate,
        lead_status: leadStatus,
        converted_from_trial: !!(activeSubscription && (trialSubscription || expiredTrialDevice)),
        has_active_subscription: !!activeSubscription,
        device_count: userDevices.length,
        last_seen_at: userDevices.length > 0 ? 
          new Date(Math.max(...userDevices.map(d => d.last_seen_at ? new Date(d.last_seen_at).getTime() : 0))) : null
      };
    });

    // Apply filters
    let filteredLeads = leads;
    
    if (status) {
      filteredLeads = filteredLeads.filter(lead => lead.lead_status === status);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredLeads = filteredLeads.filter(lead => 
        lead.email.toLowerCase().includes(searchLower)
      );
    }

    if (daysUntilExpiry !== undefined) {
      const days = parseInt(daysUntilExpiry, 10);
      filteredLeads = filteredLeads.filter(lead => 
        lead.days_until_expiry !== null && lead.days_until_expiry <= days
      );
    }

    // Calculate summary stats
    const stats = {
      total: leads.length,
      trial_active: leads.filter(l => l.lead_status === 'trial_active').length,
      trial_ending: leads.filter(l => l.lead_status === 'trial_ending').length,
      trial_expired: leads.filter(l => l.lead_status === 'trial_expired').length,
      converted: leads.filter(l => l.lead_status === 'converted').length,
      active: leads.filter(l => l.lead_status === 'active').length,
      churned: leads.filter(l => l.lead_status === 'churned').length,
      expired: leads.filter(l => l.lead_status === 'expired').length,
      no_activity: leads.filter(l => l.lead_status === 'no_activity').length
    };

    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Leads query: Found ${leads.length} total leads`);
      console.log(`Status breakdown:`, {
        trial_expired: leads.filter(l => l.lead_status === 'trial_expired').length,
        trial_active: leads.filter(l => l.lead_status === 'trial_active').length,
        converted: leads.filter(l => l.lead_status === 'converted').length,
        churned: leads.filter(l => l.lead_status === 'churned').length,
      });
    }

    return res.status(200).json({
      leads: filteredLeads,
      stats,
      total: filteredLeads.length
    });
  } catch (error) {
    console.error('Get leads error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get leads',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
