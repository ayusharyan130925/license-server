/**
 * Device Identity & Uninstall/Reinstall Tests
 * 
 * SECURITY: Proves that device-based licensing persists across reinstalls
 */

const request = require('supertest');
const app = require('../../src/server');
const { resetDatabase, db } = require('../helpers/database');
const { createUser, createDevice, createDeviceWithTrial, generateDeviceHash, linkUserToDevice } = require('../helpers/factories');
const { Device, User, DeviceUser } = require('../../src/models');
const LicenseService = require('../../src/services/licenseService');

describe('Device Identity & Reinstall Scenarios', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  beforeEach(async () => {
    await Device.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  describe('Uninstall / Reinstall scenarios', () => {
    test('same device_hash + same email → trial continues (not reset)', async () => {
      const deviceHash = generateDeviceHash('persistent-device');
      const email = 'reinstall@example.com';

      // First registration (simulates initial install)
      const response1 = await request(app)
        .post('/api/auth/register')
        .send({ email, device_hash: deviceHash })
        .expect(200);

      expect(response1.body.license_status).toBe('trial');
      const firstTrialExpiry = response1.body.trial_expires_at;
      const firstDaysLeft = response1.body.days_left;

      // Simulate app uninstall (local storage cleared, but device_hash persists)
      // Re-register with same device_hash and email
      const response2 = await request(app)
        .post('/api/auth/register')
        .send({ email, device_hash: deviceHash })
        .expect(200);

      // Trial should continue (same expiry, same days left)
      expect(response2.body.license_status).toBe('trial');
      expect(response2.body.trial_expires_at).toBe(firstTrialExpiry);
      expect(response2.body.days_left).toBe(firstDaysLeft);

      // Database: same device record, trial not restarted
      const device = await Device.findOne({ where: { device_hash: deviceHash } });
      expect(device.trial_started_at).toBeTruthy();
      expect(device.trial_consumed).toBe(true);
    });

    test('same device_hash + different email → trial continues (device-based, not user-based)', async () => {
      const deviceHash = generateDeviceHash('device-persists');
      
      // First registration with email1
      const response1 = await request(app)
        .post('/api/auth/register')
        .send({ 
          email: 'user1@example.com', 
          device_hash: deviceHash 
        })
        .expect(200);

      expect(response1.body.license_status).toBe('trial');
      const firstTrialExpiry = response1.body.trial_expires_at;

      // Simulate user changing email (or creating new account on same device)
      const response2 = await request(app)
        .post('/api/auth/register')
        .send({ 
          email: 'user2@example.com', 
          device_hash: deviceHash 
        })
        .expect(200);

      // Trial should continue (same expiry) - device-based, not user-based
      expect(response2.body.license_status).toBe('trial');
      expect(response2.body.trial_expires_at).toBe(firstTrialExpiry);

      // Database: same device, but two different users linked
      const device = await Device.findOne({ where: { device_hash: deviceHash } });
      const userCount = await DeviceUser.count({ where: { device_id: device.id } });
      expect(userCount).toBe(2); // Two users, one device
    });

    test('app reinstall with cleared local storage does NOT reset trial', async () => {
      const deviceHash = generateDeviceHash('reinstall-test');
      
      // Initial registration
      await request(app)
        .post('/api/auth/register')
        .send({ 
          email: 'initial@example.com', 
          device_hash: deviceHash 
        })
        .expect(200);

      const device = await Device.findOne({ where: { device_hash: deviceHash } });
      const originalTrialStart = device.trial_started_at;

      // Simulate reinstall: app clears local storage but device_hash regenerates same value
      // (In real Electron app, device_hash would be based on stable hardware identifiers)
      await request(app)
        .post('/api/auth/register')
        .send({ 
          email: 'reinstalled@example.com', 
          device_hash: deviceHash // Same hash = same device
        })
        .expect(200);

      // Reload device
      await device.reload();
      
      // Trial start date must be unchanged
      expect(new Date(device.trial_started_at).getTime()).toBe(
        new Date(originalTrialStart).getTime()
      );
      expect(device.trial_consumed).toBe(true);
    });
  });

  describe('Device reassignment', () => {
    test('device reassigned to new user still respects trial state', async () => {
      const deviceHash = generateDeviceHash('reassignment-test');
      
      // User 1 registers device and starts trial
      const user1 = await createUser({ email: 'user1@example.com' });
      const device = await createDeviceWithTrial({ device_hash: deviceHash });
      await linkUserToDevice(user1.id, device.id);

      const status1 = await LicenseService.getLicenseStatus(user1.id, device.id);
      expect(status1.status).toBe('trial');

      // User 2 links to same device (simulating device transfer)
      const user2 = await createUser({ email: 'user2@example.com' });
      await linkUserToDevice(user2.id, device.id);

      const status2 = await LicenseService.getLicenseStatus(user2.id, device.id);
      
      // Device trial state persists (trial already consumed)
      expect(status2.status).toBe('trial'); // Still in trial period
      expect(device.trial_consumed).toBe(true); // But cannot get new trial
    });

    test('deleting user record does NOT reset device trial', async () => {
      const deviceHash = generateDeviceHash('user-deletion-test');
      
      // Create user and device with trial
      const user = await createUser({ email: 'todelete@example.com' });
      const device = await createDeviceWithTrial({ device_hash: deviceHash });
      await linkUserToDevice(user.id, device.id);

      const trialStart = device.trial_started_at;
      const trialConsumed = device.trial_consumed;

      // Delete user (simulating account deletion)
      await User.destroy({ where: { id: user.id } });

      // Device trial state must persist
      await device.reload();
      expect(new Date(device.trial_started_at).getTime()).toBe(
        new Date(trialStart).getTime()
      );
      expect(device.trial_consumed).toBe(trialConsumed);
    });
  });

  describe('Multiple users on same device', () => {
    test('multiple users on same device → no new trial', async () => {
      const deviceHash = generateDeviceHash('multi-user-device');
      
      // User 1 registers device
      const response1 = await request(app)
        .post('/api/auth/register')
        .send({ 
          email: 'user1@example.com', 
          device_hash: deviceHash 
        })
        .expect(200);

      expect(response1.body.license_status).toBe('trial');
      const firstTrialExpiry = response1.body.trial_expires_at;

      // User 2 registers same device
      const response2 = await request(app)
        .post('/api/auth/register')
        .send({ 
          email: 'user2@example.com', 
          device_hash: deviceHash 
        })
        .expect(200);

      // User 2 should see same trial (device already consumed trial)
      expect(response2.body.license_status).toBe('trial');
      expect(response2.body.trial_expires_at).toBe(firstTrialExpiry);

      // Database: one device, two users
      const device = await Device.findOne({ where: { device_hash: deviceHash } });
      const userCount = await DeviceUser.count({ where: { device_id: device.id } });
      expect(userCount).toBe(2);
      expect(device.trial_consumed).toBe(true);
    });
  });
});
