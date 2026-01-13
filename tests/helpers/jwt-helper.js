/**
 * JWT Test Helpers
 * 
 * Utilities for generating and manipulating JWT tokens in tests
 */

const jwt = require('jsonwebtoken');
const config = require('../../src/config');

/**
 * Generate a valid lease token
 * @param {Object} payload - Token payload
 * @returns {string} - JWT token
 */
function generateLeaseToken(payload = {}) {
  const defaults = {
    device_id: 1,
    license_status: 'trial',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign({ ...defaults, ...payload }, config.jwt.secret, {
    expiresIn: '24h'
  });
}

/**
 * Generate an expired lease token
 * @param {Object} payload - Token payload
 * @returns {string} - Expired JWT token
 */
function generateExpiredLeaseToken(payload = {}) {
  const defaults = {
    device_id: 1,
    license_status: 'trial',
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    iat: Math.floor((Date.now() - 48 * 60 * 60 * 1000) / 1000) // 48 hours ago
  };
  
  // Sign with negative expiration to force expiry
  return jwt.sign({ ...defaults, ...payload }, config.jwt.secret, {
    expiresIn: '-1h' // Already expired
  });
}

/**
 * Generate a tampered/invalid token
 * @returns {string} - Invalid token
 */
function generateInvalidToken() {
  const validToken = generateLeaseToken();
  // Tamper with the token by modifying the payload
  const parts = validToken.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
  payload.device_id = 999; // Change device_id
  const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `${parts[0]}.${tamperedPayload}.${parts[2]}`;
}

module.exports = {
  generateLeaseToken,
  generateExpiredLeaseToken,
  generateInvalidToken
};
