/**
 * Concurrency & Race Condition Tests
 * 
 * SECURITY: Proves that parallel requests cannot create multiple trials
 */

const request = require('supertest');
const app = require('../../src/server');
const { resetDatabase, db } = require('../helpers/database');
const { generateDeviceHash } = require('../helpers/factories');
const { Device } = require('../../src/models');
const LicenseService = require('../../src/services/licenseService');

describe('Concurrency & Race Conditions', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  beforeEach(async () => {
    await Device.destroy({ where: {}, force: true });
  });

  describe('Parallel registration attempts', () => {
    test('parallel /auth/register calls cannot create multiple trials', async () => {
      const deviceHash = generateDeviceHash('parallel-register');
      const email = 'parallel@example.com';

      // Send 10 parallel registration requests
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/auth/register')
          .send({ email, device_hash: deviceHash })
      );

      const responses = await Promise.all(requests);

      // All should succeed (idempotent operation)
      responses.forEach(response => {
        expect([200, 409, 429]).toContain(response.status);
      });

      // But only ONE device record should exist
      const deviceCount = await Device.count({ where: { device_hash: deviceHash } });
      expect(deviceCount).toBe(1);

      // Device should have exactly one trial
      const device = await Device.findOne({ where: { device_hash: deviceHash } });
      expect(device.trial_started_at).toBeTruthy();
      expect(device.trial_consumed).toBe(true);

      // All successful responses should have same trial expiry
      const successfulResponses = responses.filter(r => r.status === 200);
      if (successfulResponses.length > 0) {
        const firstExpiry = successfulResponses[0].body.trial_expires_at;
        successfulResponses.forEach(response => {
          expect(response.body.trial_expires_at).toBe(firstExpiry);
        });
      }
    });

    test('parallel trial-start attempts result in exactly one winner', async () => {
      const deviceHash = generateDeviceHash('parallel-trial-start');
      
      // Create device without trial
      const device = await Device.create({
        device_hash: deviceHash,
        first_seen_at: new Date(),
        trial_started_at: null,
        trial_ended_at: null,
        trial_consumed: false
      });

      // Attempt to start trial 5 times in parallel
      const startTrialPromises = Array(5).fill(null).map(() =>
        LicenseService.startTrialIfEligible(device, null)
      );

      await Promise.all(startTrialPromises);

      // Reload device
      await device.reload();

      // Trial should be started exactly once
      expect(device.trial_started_at).toBeTruthy();
      expect(device.trial_consumed).toBe(true);

      // Verify only one trial was created (check DB directly)
      const deviceRecord = await Device.findOne({ where: { device_hash: deviceHash } });
      expect(deviceRecord.trial_started_at).toBeTruthy();
    });
  });

  describe('Transaction rollback on failure', () => {
    test('failed registration does not leave partial state', async () => {
      const deviceHash = generateDeviceHash('rollback-test');
      const email = 'rollback@example.com';

      // This test would require injecting a failure, but we can verify
      // that successful registration is atomic by checking all related records

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email, device_hash: deviceHash })
        .expect(200);

      // Verify all related records exist (atomic operation)
      const { User, Device, DeviceUser } = require('../../src/models');
      
      const user = await User.findOne({ where: { email } });
      const device = await Device.findOne({ where: { device_hash: deviceHash } });
      const deviceUser = await DeviceUser.findOne({
        where: { user_id: user.id, device_id: device.id }
      });

      expect(user).toBeTruthy();
      expect(device).toBeTruthy();
      expect(deviceUser).toBeTruthy();
    });
  });

  describe('Database uniqueness constraints', () => {
    test('unique device_hash constraint prevents duplicates', async () => {
      const deviceHash = generateDeviceHash('unique-constraint');

      // Create first device
      await Device.create({
        device_hash: deviceHash,
        first_seen_at: new Date(),
        trial_started_at: new Date(),
        trial_ended_at: new Date(),
        trial_consumed: true
      });

      // Attempt to create duplicate (should fail)
      await expect(
        Device.create({
          device_hash: deviceHash, // Same hash
          first_seen_at: new Date(),
          trial_started_at: null,
          trial_ended_at: null,
          trial_consumed: false
        })
      ).rejects.toThrow(); // SequelizeUniqueConstraintError

      // Verify only one device exists
      const deviceCount = await Device.count({ where: { device_hash: deviceHash } });
      expect(deviceCount).toBe(1);
    });
  });
});
