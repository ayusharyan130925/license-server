const request = require('supertest');
const app = require('../../src/server');
const { resetDatabase } = require('../helpers/database');
const { User, Device, Subscription, Plan, DeviceUser } = require('../../src/models');
const EntitlementsService = require('../../src/services/entitlementsService');
const JWTService = require('../../src/services/jwtService');
const crypto = require('crypto');

// Helper to generate device hash
function generateDeviceHash(seed) {
  return crypto.createHash('sha256').update(seed).digest('hex');
}

describe('Feature Entitlements System', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  beforeEach(async () => {
    // Clean up before each test
    await DeviceUser.destroy({ where: {}, force: true });
    await Subscription.destroy({ where: {}, force: true });
    await Device.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  describe('Plan Resolution', () => {
    test('should resolve trial plan for device with active trial', async () => {
      // Create user and device
      const user = await User.create({ email: 'test@example.com' });
      const deviceHash = generateDeviceHash('test-device-1');
      const device = await Device.create({
        device_hash: deviceHash,
        trial_started_at: new Date(),
        trial_ended_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        trial_consumed: true
      });
      await DeviceUser.create({ user_id: user.id, device_id: device.id });

      // Resolve plan
      const plan = await EntitlementsService.resolveEffectivePlan(user.id, device.id);

      expect(plan).not.toBeNull();
      expect(plan.name).toBe('trial');
      expect(plan.max_cameras).toBe(2);
      expect(plan.pdf_export).toBe(false);
    });

    test('should resolve subscription plan when user has active subscription', async () => {
      // Create user, device, and subscription
      const user = await User.create({ email: 'test@example.com' });
      const deviceHash = generateDeviceHash('test-device-2');
      const device = await Device.create({ device_hash: deviceHash });
      await DeviceUser.create({ user_id: user.id, device_id: device.id });

      // Get basic plan
      const basicPlan = await Plan.findOne({ where: { name: 'basic' } });

      // Create active subscription with plan
      const subscription = await Subscription.create({
        user_id: user.id,
        stripe_customer_id: 'cus_test',
        stripe_subscription_id: 'sub_test',
        status: 'active',
        plan_id: basicPlan.id
      });

      // Resolve plan
      const plan = await EntitlementsService.resolveEffectivePlan(user.id, device.id);

      expect(plan).not.toBeNull();
      expect(plan.name).toBe('basic');
      expect(plan.max_cameras).toBe(4);
      expect(plan.pdf_export).toBe(true);
    });

    test('should return null for expired trial', async () => {
      // Create user and device with expired trial
      const user = await User.create({ email: 'test@example.com' });
      const deviceHash = generateDeviceHash('test-device-3');
      const device = await Device.create({
        device_hash: deviceHash,
        trial_started_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        trial_ended_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (expired)
        trial_consumed: true
      });
      await DeviceUser.create({ user_id: user.id, device_id: device.id });

      // Resolve plan
      const plan = await EntitlementsService.resolveEffectivePlan(user.id, device.id);

      expect(plan).toBeNull();
    });

    test('should prioritize active subscription over trial', async () => {
      // Create user and device with active trial
      const user = await User.create({ email: 'test@example.com' });
      const deviceHash = generateDeviceHash('test-device-4');
      const device = await Device.create({
        device_hash: deviceHash,
        trial_started_at: new Date(),
        trial_ended_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        trial_consumed: true
      });
      await DeviceUser.create({ user_id: user.id, device_id: device.id });

      // Get pro plan
      const proPlan = await Plan.findOne({ where: { name: 'pro' } });

      // Create active subscription (should take priority)
      await Subscription.create({
        user_id: user.id,
        stripe_customer_id: 'cus_test2',
        stripe_subscription_id: 'sub_test2',
        status: 'active',
        plan_id: proPlan.id
      });

      // Resolve plan
      const plan = await EntitlementsService.resolveEffectivePlan(user.id, device.id);

      expect(plan).not.toBeNull();
      expect(plan.name).toBe('pro'); // Subscription plan, not trial
      expect(plan.cloud_backup).toBe(true);
    });
  });

  describe('Feature Entitlements Building', () => {
    test('should build entitlements from trial plan', async () => {
      const trialPlan = await Plan.findOne({ where: { name: 'trial' } });
      const features = EntitlementsService.buildEntitlements(trialPlan);

      expect(features.max_cameras).toBe(2);
      expect(features.pdf_export).toBe(false);
      expect(features.fps_limit).toBe(30);
      expect(features.cloud_backup).toBe(false);
    });

    test('should build entitlements from basic plan', async () => {
      const basicPlan = await Plan.findOne({ where: { name: 'basic' } });
      const features = EntitlementsService.buildEntitlements(basicPlan);

      expect(features.max_cameras).toBe(4);
      expect(features.pdf_export).toBe(true);
      expect(features.fps_limit).toBe(60);
      expect(features.cloud_backup).toBe(false);
    });

    test('should build entitlements from pro plan', async () => {
      const proPlan = await Plan.findOne({ where: { name: 'pro' } });
      const features = EntitlementsService.buildEntitlements(proPlan);

      expect(features.max_cameras).toBe(999);
      expect(features.pdf_export).toBe(true);
      expect(features.fps_limit).toBe(120);
      expect(features.cloud_backup).toBe(true);
    });

    test('should return no features for null plan (expired)', () => {
      const features = EntitlementsService.buildEntitlements(null);

      expect(features.max_cameras).toBe(0);
      expect(features.pdf_export).toBe(false);
      expect(features.fps_limit).toBe(0);
      expect(features.cloud_backup).toBe(false);
    });
  });

  describe('JWT Token with Plan and Features', () => {
    test('should embed plan and features in JWT token', () => {
      const trialPlan = { name: 'trial', max_cameras: 2, pdf_export: false, fps_limit: 30, cloud_backup: false };
      const features = EntitlementsService.buildEntitlements(trialPlan);

      const token = JWTService.generateLeaseToken({
        device_id: 1,
        license_status: 'trial',
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        plan: 'trial',
        features: features
      });

      const decoded = JWTService.verifyLeaseToken(token);

      expect(decoded.plan).toBe('trial');
      expect(decoded.features).toEqual(features);
      expect(decoded.license_status).toBe('trial');
      expect(decoded.device_id).toBe(1);
    });

    test('should reject tampered JWT token', () => {
      const token = JWTService.generateLeaseToken({
        device_id: 1,
        license_status: 'trial',
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        plan: 'trial',
        features: { max_cameras: 2, pdf_export: false, fps_limit: 30, cloud_backup: false }
      });

      // Tamper with token
      const tamperedToken = token.slice(0, -5) + 'XXXXX';

      expect(() => {
        JWTService.verifyLeaseToken(tamperedToken);
      }).toThrow();
    });
  });

  describe('License Lease API Endpoint', () => {
    test('should return lease with plan and features for trial user', async () => {
      // Register user-device
      const email = 'lease-test@example.com';
      const deviceHash = generateDeviceHash('lease-device-1');

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({ email, device_hash: deviceHash })
        .expect(200);

      const leaseToken = registerResponse.body.lease_token;

      // Get lease
      const leaseResponse = await request(app)
        .get('/api/license/lease')
        .set('Authorization', `Bearer ${leaseToken}`)
        .set('X-Device-Id', deviceHash)
        .expect(200);

      expect(leaseResponse.body.license_status).toBe('trial');
      expect(leaseResponse.body.plan).toBe('trial');
      expect(leaseResponse.body.features).toBeDefined();
      expect(leaseResponse.body.features.max_cameras).toBe(2);
      expect(leaseResponse.body.features.pdf_export).toBe(false);
      expect(leaseResponse.body.token).toBeDefined();
    });

    test('should return lease with no features for expired user', async () => {
      // Create user and device with expired trial
      const user = await User.create({ email: 'expired@example.com' });
      const deviceHash = generateDeviceHash('expired-device');
      const device = await Device.create({
        device_hash: deviceHash,
        trial_started_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        trial_ended_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        trial_consumed: true
      });
      await DeviceUser.create({ user_id: user.id, device_id: device.id });

      // Generate token
      const token = JWTService.generateLeaseToken({
        device_id: device.id,
        license_status: 'expired',
        expires_at: null,
        plan: null,
        features: { max_cameras: 0, pdf_export: false, fps_limit: 0, cloud_backup: false }
      });

      // Get lease
      const leaseResponse = await request(app)
        .get('/api/license/lease')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Device-Id', deviceHash)
        .expect(200);

      expect(leaseResponse.body.license_status).toBe('expired');
      expect(leaseResponse.body.plan).toBeNull();
      expect(leaseResponse.body.features.max_cameras).toBe(0);
      expect(leaseResponse.body.features.pdf_export).toBe(false);
    });
  });

  describe('Status Transitions', () => {
    test('should transition from trial to active when subscription created', async () => {
      const user = await User.create({ email: 'transition@example.com' });
      const deviceHash = generateDeviceHash('transition-device');
      const device = await Device.create({
        device_hash: deviceHash,
        trial_started_at: new Date(),
        trial_ended_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        trial_consumed: true
      });
      await DeviceUser.create({ user_id: user.id, device_id: device.id });

      // Initially trial
      let plan = await EntitlementsService.resolveEffectivePlan(user.id, device.id);
      expect(plan.name).toBe('trial');

      // Create active subscription
      const basicPlan = await Plan.findOne({ where: { name: 'basic' } });
      await Subscription.create({
        user_id: user.id,
        stripe_customer_id: 'cus_transition',
        stripe_subscription_id: 'sub_transition',
        status: 'active',
        plan_id: basicPlan.id
      });

      // Now should be active with basic plan
      plan = await EntitlementsService.resolveEffectivePlan(user.id, device.id);
      expect(plan.name).toBe('basic');
    });

    test('should transition from active to expired when subscription cancelled', async () => {
      const user = await User.create({ email: 'cancel@example.com' });
      const deviceHash = generateDeviceHash('cancel-device');
      const device = await Device.create({ device_hash: deviceHash });
      await DeviceUser.create({ user_id: user.id, device_id: device.id });

      const basicPlan = await Plan.findOne({ where: { name: 'basic' } });
      const subscription = await Subscription.create({
        user_id: user.id,
        stripe_customer_id: 'cus_cancel',
        stripe_subscription_id: 'sub_cancel',
        status: 'active',
        plan_id: basicPlan.id
      });

      // Initially active
      let plan = await EntitlementsService.resolveEffectivePlan(user.id, device.id);
      expect(plan.name).toBe('basic');

      // Cancel subscription
      subscription.status = 'expired';
      await subscription.save();

      // Now should be expired (no plan)
      plan = await EntitlementsService.resolveEffectivePlan(user.id, device.id);
      expect(plan).toBeNull();
    });
  });
});
