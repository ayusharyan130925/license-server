const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * JWT Service
 * 
 * Handles generation and verification of license lease tokens.
 * Lease tokens are short-lived (12-24 hours) and must be revalidated.
 * 
 * Security: Never trust client-side dates. All validation is server-side.
 */
class JWTService {
  /**
   * Generate a license lease token
   * @param {Object} payload - Token payload
   * @param {number} payload.device_id - Device ID
   * @param {string} payload.license_status - License status (trial|active|expired)
   * @param {Date|string} payload.expires_at - License expiration date
   * @returns {string} - JWT token
   */
  static generateLeaseToken(payload) {
    const leaseExpiryHours = config.jwt.leaseExpiryHours;
    const expiresIn = `${leaseExpiryHours}h`;

    const tokenPayload = {
      device_id: payload.device_id,
      license_status: payload.license_status,
      expires_at: payload.expires_at ? new Date(payload.expires_at).toISOString() : null,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: expiresIn
    });
  }

  /**
   * Verify and decode a license lease token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded token payload
   * @throws {Error} - If token is invalid or expired
   */
  static verifyLeaseToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Lease token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid lease token');
      }
      throw error;
    }
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} - Token or null
   */
  static extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}

module.exports = JWTService;
