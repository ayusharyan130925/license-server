/**
 * Abuse Detection & Mitigation Tests
 * 
 * SECURITY: Proves that device hash forging is mitigated (not eliminated)
 */

const request = require('supertest');
const app = require('../../src/server');
const { resetDatabase, db } = require('../helpers/database');
const { createUser, createDevice, generateDeviceHash, linkUserToDevice } = require('../helpers/factories');
const { User, Device, DeviceUser, RiskEvent } = require('../../src/models');
const AbuseDetectionService = require('../../src/services/abuseDetectionService');

describe('Abuse Detection & Mitigation', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  beforeEach(async () => {
    await RiskEvent.destroy({ where: {}, force: true });
    await Device.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  describe('Per-user device cap enforcement', () => {
    test('should enforce default device cap (2 devices per user)', async () => {
      const email = 'cap-test@example.com';
      const ipAddress = '192.168.1.1';

      // Register first device (should succeed)
      const response1 = await request(app)
        .post('/api/auth/register')
        .send({ 
          email, 
          device_hash: generateDeviceHash('device-1') 
        })
        .expect(200);

      expect(response1.body.license_status).toBe('trial');

      // Register second device (should succeed)
      const response2 = await request(app)
        .post('/api/auth/register')
        .send({ 
          email, 
          device_hash: generateDeviceHash('device-2') 
        })
        .expect(200);

      expect(response2.body.license_status).toBe('trial');

      // Register third device (should fail - cap exceeded)
      const response3 = await request(app)
        .post('/api/auth/register')
        .send({ 
          email, 
          device_hash: generateDeviceHash('device-3') 
        })
        .expect(409); // Conflict

      expect(response3.body.error).toBe('Device Cap Exceeded');
      expect(response3.body.code).toBe('DEVICE_CAP_EXCEEDED');
      expect(response3.body.details.current).toBe(2);
      expect(response3.body.details.max).toBe(2);

      // Verify risk event was logged
      const riskEvent = await RiskEvent.findOne({
        where: { event_type: 'DEVICE_CAP_EXCEEDED' }
      });
      expect(riskEvent).toBeTruthy();
      expect(riskEvent.metadata.current).toBe(2);
    });

    test('paid users respect higher device caps', async () => {
      const email = 'paid-user@example.com';
      const user = await createUser({ email, max_devices: 10 });

      // Should be able to register up to 10 devices
      for (let i = 1; i <= 10; i++) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ 
            email, 
            device_hash: generateDeviceHash(`paid-device-${i}`) 
          })
          .expect(200);
        
        expect(response.body.license_status).toBe('trial');
      }

      // 11th device should fail
      const response11 = await request(app)
        .post('/api/auth/register')
        .send({ 
          email, 
          device_hash: generateDeviceHash('paid-device-11') 
        })
        .expect(409);

      expect(response11.body.code).toBe('DEVICE_CAP_EXCEEDED');
      expect(response11.body.details.max).toBe(10);
    });
  });

  describe('Device creation rate limiting', () => {
    test('should enforce per-IP rate limit (5 devices per 24h)', async () => {
      const ipAddress = '10.0.0.1';

      // Register 5 devices from same IP (should succeed)
      for (let i = 1; i <= 5; i++) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ 
            email: `rate-test-${i}@example.com`, 
            device_hash: generateDeviceHash(`ip-device-${i}`) 
          })
          .set('X-Forwarded-For', ipAddress)
          .expect(200);
      }

      // 6th device from same IP should fail
      const response6 = await request(app)
        .post('/api/auth/register')
        .send({ 
          email: 'rate-test-6@example.com', 
          device_hash: generateDeviceHash('ip-device-6') 
        })
        .set('X-Forwarded-For', ipAddress)
        .expect(429); // Too Many Requests

      expect(response6.body.error).toBe('Rate Limit Exceeded');
      expect(response6.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response6.body.details.type).toBe('ip');
      expect(response6.body.details.max).toBe(5);
    });

    test('should enforce per-user rate limit (3 devices per 24h)', async () => {
      const email = 'user-rate-test@example.com';

      // Register 3 devices for same user (should succeed)
      for (let i = 1; i <= 3; i++) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ 
            email, 
            device_hash: generateDeviceHash(`user-device-${i}`) 
          })
          .expect(200);
      }

      // 4th device for same user should fail
      const response4 = await request(app)
        .post('/api/auth/register')
        .send({ 
          email, 
          device_hash: generateDeviceHash('user-device-4') 
        })
        .expect(429);

      expect(response4.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response4.body.details.type).toBe('user');
      expect(response4.body.details.max).toBe(3);
    });
  });

  describe('Device churn detection', () => {
    test('should log rapid device creation as suspicious', async () => {
      const email = 'churn-test@example.com';
      const ipAddress = '192.168.1.100';

      // Create 5 devices rapidly (within 1 hour)
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/api/auth/register')
          .send({ 
            email, 
            device_hash: generateDeviceHash(`churn-device-${i}`) 
          })
          .set('X-Forwarded-For', ipAddress)
          .expect(200);
      }

      // Should have logged device churn event
      const churnEvents = await RiskEvent.findAll({
        where: { event_type: 'DEVICE_CHURN_DETECTED' }
      });

      expect(churnEvents.length).toBeGreaterThan(0);
      const event = churnEvents[0];
      expect(event.metadata.deviceCount).toBeGreaterThanOrEqual(5);
      expect(event.metadata.timeWindow).toBe(3600); // 1 hour
    });

    test('device churn detection does NOT block registration (detection only)', async () => {
      const email = 'churn-no-block@example.com';

      // Even with rapid creation, registration should succeed
      // (churn is logged but doesn't block)
      for (let i = 1; i <= 5; i++) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ 
            email, 
            device_hash: generateDeviceHash(`churn-no-block-${i}`) 
          })
          .expect(200); // Should still succeed

        expect(response.body.license_status).toBe('trial');
      }
    });
  });
});
