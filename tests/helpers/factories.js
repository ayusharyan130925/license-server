/**
 * Test Data Factories
 * 
 * Creates test users, devices, subscriptions, etc.
 */

const { User, Device, Subscription, DeviceUser } = require('../../src/models');
const crypto = require('crypto');

/**
 * Generate a deterministic device hash for testing
 * @param {string} seed - Seed for hash generation
 * @returns {string} - SHA-256 hash
 */
function generateDeviceHash(seed = 'test-device') {
  return crypto.createHash('sha256').update(seed).digest('hex');
}

/**
 * Create a test user
 * @param {Object} overrides - Override default values
 * @param {Transaction} transaction - Optional transaction
 * @returns {Promise<User>}
 */
async function createUser(overrides = {}, transaction = null) {
  const defaults = {
    email: `test-${Date.now()}-${Math.random()}@example.com`,
    max_devices: null
  };
  
  return await User.create({ ...defaults, ...overrides }, { transaction });
}

/**
 * Create a test device
 * @param {Object} overrides - Override default values
 * @param {Transaction} transaction - Optional transaction
 * @returns {Promise<Device>}
 */
async function createDevice(overrides = {}, transaction = null) {
  const defaults = {
    device_hash: generateDeviceHash(`device-${Date.now()}`),
    first_seen_at: new Date(),
    trial_started_at: null,
    trial_ended_at: null,
    trial_consumed: false,
    last_seen_at: null
  };
  
  return await Device.create({ ...defaults, ...overrides }, { transaction });
}

/**
 * Create a device with an active trial
 * @param {Object} overrides - Override default values
 * @param {Transaction} transaction - Optional transaction
 * @returns {Promise<Device>}
 */
async function createDeviceWithTrial(overrides = {}, transaction = null) {
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 14);
  
  const defaults = {
    device_hash: generateDeviceHash(`trial-device-${Date.now()}`),
    first_seen_at: now,
    trial_started_at: now,
    trial_ended_at: trialEnd,
    trial_consumed: true,
    last_seen_at: now
  };
  
  return await Device.create({ ...defaults, ...overrides }, { transaction });
}

/**
 * Create a device with expired trial
 * @param {Object} overrides - Override default values
 * @param {Transaction} transaction - Optional transaction
 * @returns {Promise<Device>}
 */
async function createDeviceWithExpiredTrial(overrides = {}, transaction = null) {
  const now = new Date();
  const trialStart = new Date(now);
  trialStart.setDate(trialStart.getDate() - 15); // 15 days ago
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + 14);
  
  const defaults = {
    device_hash: generateDeviceHash(`expired-device-${Date.now()}`),
    first_seen_at: trialStart,
    trial_started_at: trialStart,
    trial_ended_at: trialEnd,
    trial_consumed: true,
    last_seen_at: now
  };
  
  return await Device.create({ ...defaults, ...overrides }, { transaction });
}

/**
 * Link user to device
 * @param {number} userId - User ID
 * @param {number} deviceId - Device ID
 * @param {Transaction} transaction - Optional transaction
 * @returns {Promise<DeviceUser>}
 */
async function linkUserToDevice(userId, deviceId, transaction = null) {
  return await DeviceUser.create({
    user_id: userId,
    device_id: deviceId
  }, { transaction });
}

/**
 * Create a subscription
 * @param {Object} overrides - Override default values
 * @param {Transaction} transaction - Optional transaction
 * @returns {Promise<Subscription>}
 */
async function createSubscription(overrides = {}, transaction = null) {
  const defaults = {
    user_id: null, // Must be provided
    stripe_customer_id: `cus_test_${Date.now()}`,
    stripe_subscription_id: `sub_test_${Date.now()}`,
    status: 'trial'
  };
  
  return await Subscription.create({ ...defaults, ...overrides }, { transaction });
}

/**
 * Create a complete user-device pair with trial
 * @param {Object} options - Options
 * @param {Transaction} transaction - Optional transaction
 * @returns {Promise<{user: User, device: Device, deviceUser: DeviceUser}>}
 */
async function createUserDevicePair(options = {}, transaction = null) {
  const user = await createUser(options.user || {}, transaction);
  const device = await createDeviceWithTrial(options.device || {}, transaction);
  const deviceUser = await linkUserToDevice(user.id, device.id, transaction);
  
  return { user, device, deviceUser };
}

/**
 * Create a mock Stripe subscription object (for tests)
 * @param {Object} overrides - Override default values
 * @returns {Object} - Mock subscription
 */
function createMockSubscription(overrides = {}) {
  return {
    id: `sub_test_${Date.now()}`,
    customer: 'cus_test_123',
    status: 'active',
    ...overrides
  };
}

/**
 * Create a mock Stripe webhook event (for tests)
 * @param {string} type - Event type
 * @param {Object} data - Event data
 * @returns {Object} - Mock event
 */
function createMockWebhookEvent(type, data) {
  return {
    id: `evt_test_${Date.now()}`,
    type,
    data: {
      object: data
    }
  };
}

module.exports = {
  generateDeviceHash,
  createUser,
  createDevice,
  createDeviceWithTrial,
  createDeviceWithExpiredTrial,
  linkUserToDevice,
  createSubscription,
  createUserDevicePair,
  createMockSubscription,
  createMockWebhookEvent
};
