/**
 * Admin Routes
 * 
 * Administrative endpoints for managing app versions
 * 
 * SECURITY: All endpoints require admin authentication
 */

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { requireAdmin } = require('../middleware/adminAuth');
const UpdateService = require('../services/updateService');

const router = express.Router();

// All admin routes require admin authentication
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

module.exports = router;
