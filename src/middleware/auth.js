const JWTService = require('../services/jwtService');
const { User, Device } = require('../models');

/**
 * Authentication Middleware
 * 
 * Validates JWT lease tokens and extracts user/device information.
 * Ensures device_id from token matches X-Device-Id header.
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = JWTService.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header'
      });
    }

    // Verify token
    const decoded = JWTService.verifyLeaseToken(token);

    // Verify device_id matches header
    const deviceHash = req.headers['x-device-id'];
    if (!deviceHash) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'X-Device-Id header is required'
      });
    }

    // Load device to verify hash matches
    const device = await Device.findByPk(decoded.device_id);
    if (!device || device.device_hash !== deviceHash) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Device ID mismatch'
      });
    }

    // Attach decoded token to request
    req.lease = decoded;
    req.device = device;

    next();
  } catch (error) {
    if (error.message.includes('expired') || error.message.includes('Invalid')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};

module.exports = {
  authenticate
};
