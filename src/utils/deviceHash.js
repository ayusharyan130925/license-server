const crypto = require('crypto');

/**
 * Device Hash Utility
 * 
 * Helper functions for hashing device identifiers.
 * 
 * Note: This is a reference implementation. In production, the client
 * (Electron app) should generate the device hash using a stable identifier
 * like machine ID, MAC address, or hardware serial number.
 */

/**
 * Hash a device identifier string
 * @param {string} deviceId - Raw device identifier
 * @returns {string} - SHA-256 hash of the device identifier
 */
function hashDeviceId(deviceId) {
  if (!deviceId || typeof deviceId !== 'string') {
    throw new Error('Device ID must be a non-empty string');
  }
  
  return crypto.createHash('sha256').update(deviceId).digest('hex');
}

/**
 * Validate device hash format
 * @param {string} hash - Device hash to validate
 * @returns {boolean} - True if hash is valid format
 */
function isValidDeviceHash(hash) {
  if (!hash || typeof hash !== 'string') {
    return false;
  }
  
  // SHA-256 produces 64-character hex string
  return /^[a-f0-9]{64}$/i.test(hash);
}

module.exports = {
  hashDeviceId,
  isValidDeviceHash
};
