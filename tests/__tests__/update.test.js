/**
 * Update Management Tests
 * 
 * SECURITY: Proves update system handles all cases correctly
 */

const request = require('supertest');
const app = require('../../src/server');
const { resetDatabase, db } = require('../helpers/database');
const { createUser, createDevice, generateDeviceHash, linkUserToDevice } = require('../helpers/factories');
const { User, Device, AppVersion } = require('../../src/models');
const UpdateService = require('../../src/services/updateService');
const JWTService = require('../../src/services/jwtService');

describe('Update Management', () => {
  let testUser, testDevice, leaseToken, deviceHash;

  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  beforeEach(async () => {
    // Clean up
    await AppVersion.destroy({ where: {}, force: true });
    await Device.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create test user and device
    deviceHash = generateDeviceHash('update-test');
    testUser = await createUser({ email: 'updatetest@example.com' });
    testDevice = await createDevice({ device_hash: deviceHash });
    await linkUserToDevice(testUser.id, testDevice.id);

    // Generate lease token
    leaseToken = JWTService.generateLeaseToken({
      device_id: testDevice.id,
      license_status: 'trial',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
  });

  describe('Update Check API', () => {
    test('should return no update when client is on latest version', async () => {
      // Create version matching client
      await AppVersion.create({
        platform: 'mac',
        arch: 'arm64',
        version: '1.2.4',
        build_number: 124,
        download_url: 'https://example.com/app-1.2.4.dmg',
        channel: 'stable',
        is_active: true,
        rollout_percentage: 100
      });

      const response = await request(app)
        .post('/api/update/check')
        .set('Authorization', `Bearer ${leaseToken}`)
        .set('X-Device-Id', deviceHash)
        .send({
          currentVersion: '1.2.4',
          currentBuild: 124,
          platform: 'mac',
          arch: 'arm64',
          channel: 'stable',
          deviceId: deviceHash
        })
        .expect(200);

      expect(response.body.updateAvailable).toBe(false);
    });

    test('should return optional update when newer version available', async () => {
      // Create newer version
      await AppVersion.create({
        platform: 'mac',
        arch: 'arm64',
        version: '1.3.0',
        build_number: 130,
        release_notes: 'New features',
        download_url: 'https://example.com/app-1.3.0.dmg',
        channel: 'stable',
        is_active: true,
        rollout_percentage: 100,
        is_mandatory: false
      });

      const response = await request(app)
        .post('/api/update/check')
        .set('Authorization', `Bearer ${leaseToken}`)
        .set('X-Device-Id', deviceHash)
        .send({
          currentVersion: '1.2.4',
          currentBuild: 124,
          platform: 'mac',
          arch: 'arm64',
          channel: 'stable',
          deviceId: deviceHash
        })
        .expect(200);

      expect(response.body.updateAvailable).toBe(true);
      expect(response.body.mandatory).toBe(false);
      expect(response.body.latestVersion).toBe('1.3.0');
      expect(response.body.buildNumber).toBe(130);
      expect(response.body.downloadUrl).toBeDefined();
    });

    test('should return mandatory update when is_mandatory is true', async () => {
      await AppVersion.create({
        platform: 'mac',
        arch: 'arm64',
        version: '1.4.0',
        build_number: 140,
        download_url: 'https://example.com/app-1.4.0.dmg',
        channel: 'stable',
        is_active: true,
        rollout_percentage: 100,
        is_mandatory: true
      });

      const response = await request(app)
        .post('/api/update/check')
        .set('Authorization', `Bearer ${leaseToken}`)
        .set('X-Device-Id', deviceHash)
        .send({
          currentVersion: '1.2.4',
          currentBuild: 124,
          platform: 'mac',
          arch: 'arm64',
          channel: 'stable',
          deviceId: deviceHash
        })
        .expect(200);

      expect(response.body.updateAvailable).toBe(true);
      expect(response.body.mandatory).toBe(true);
    });

    test('should block old versions when below min_supported_build', async () => {
      await AppVersion.create({
        platform: 'mac',
        arch: 'arm64',
        version: '1.5.0',
        build_number: 150,
        download_url: 'https://example.com/app-1.5.0.dmg',
        channel: 'stable',
        is_active: true,
        rollout_percentage: 100,
        min_supported_build: 130 // Blocks builds < 130
      });

      const response = await request(app)
        .post('/api/update/check')
        .set('Authorization', `Bearer ${leaseToken}`)
        .set('X-Device-Id', deviceHash)
        .send({
          currentVersion: '1.2.4',
          currentBuild: 124, // Below min_supported_build
          platform: 'mac',
          arch: 'arm64',
          channel: 'stable',
          deviceId: deviceHash
        })
        .expect(200);

      expect(response.body.updateAvailable).toBe(true);
      expect(response.body.mandatory).toBe(true);
      expect(response.body.minSupportedBuild).toBe(130);
      expect(response.body.message).toContain('no longer supported');
    });

    test('should respect rollout percentage', async () => {
      await AppVersion.create({
        platform: 'mac',
        arch: 'arm64',
        version: '1.3.0',
        build_number: 130,
        download_url: 'https://example.com/app-1.3.0.dmg',
        channel: 'stable',
        is_active: true,
        rollout_percentage: 0 // 0% rollout = no one sees it
      });

      const response = await request(app)
        .post('/api/update/check')
        .set('Authorization', `Bearer ${leaseToken}`)
        .set('X-Device-Id', deviceHash)
        .send({
          currentVersion: '1.2.4',
          currentBuild: 124,
          platform: 'mac',
          arch: 'arm64',
          channel: 'stable',
          deviceId: deviceHash
        })
        .expect(200);

      // With 0% rollout, update should not be available
      expect(response.body.updateAvailable).toBe(false);
    });

    test('should reject invalid platform', async () => {
      await request(app)
        .post('/api/update/check')
        .set('Authorization', `Bearer ${leaseToken}`)
        .set('X-Device-Id', deviceHash)
        .send({
          currentVersion: '1.2.4',
          currentBuild: 124,
          platform: 'invalid',
          arch: 'arm64',
          channel: 'stable',
          deviceId: deviceHash
        })
        .expect(400);
    });

    test('should reject request without authentication', async () => {
      await request(app)
        .post('/api/update/check')
        .send({
          currentVersion: '1.2.4',
          currentBuild: 124,
          platform: 'mac',
          arch: 'arm64',
          channel: 'stable',
          deviceId: deviceHash
        })
        .expect(401);
    });

    test('should prevent downgrade (client has newer build)', async () => {
      await AppVersion.create({
        platform: 'mac',
        arch: 'arm64',
        version: '1.2.4',
        build_number: 124,
        download_url: 'https://example.com/app-1.2.4.dmg',
        channel: 'stable',
        is_active: true
      });

      const response = await request(app)
        .post('/api/update/check')
        .set('Authorization', `Bearer ${leaseToken}`)
        .set('X-Device-Id', deviceHash)
        .send({
          currentVersion: '1.3.0',
          currentBuild: 130, // Client has newer build than server
          platform: 'mac',
          arch: 'arm64',
          channel: 'stable',
          deviceId: deviceHash
        })
        .expect(200);

      // Should return no update (prevent downgrade)
      expect(response.body.updateAvailable).toBe(false);
    });

    test('should only return active versions', async () => {
      // Create inactive version
      await AppVersion.create({
        platform: 'mac',
        arch: 'arm64',
        version: '1.3.0',
        build_number: 130,
        download_url: 'https://example.com/app-1.3.0.dmg',
        channel: 'stable',
        is_active: false // Inactive
      });

      const response = await request(app)
        .post('/api/update/check')
        .set('Authorization', `Bearer ${leaseToken}`)
        .set('X-Device-Id', deviceHash)
        .send({
          currentVersion: '1.2.4',
          currentBuild: 124,
          platform: 'mac',
          arch: 'arm64',
          channel: 'stable',
          deviceId: deviceHash
        })
        .expect(200);

      // Inactive version should not be returned
      expect(response.body.updateAvailable).toBe(false);
    });

    test('should match platform and architecture correctly', async () => {
      // Create version for different platform
      await AppVersion.create({
        platform: 'windows',
        arch: 'x64',
        version: '1.3.0',
        build_number: 130,
        download_url: 'https://example.com/app-1.3.0.exe',
        channel: 'stable',
        is_active: true
      });

      const response = await request(app)
        .post('/api/update/check')
        .set('Authorization', `Bearer ${leaseToken}`)
        .set('X-Device-Id', deviceHash)
        .send({
          currentVersion: '1.2.4',
          currentBuild: 124,
          platform: 'mac', // Different platform
          arch: 'arm64',
          channel: 'stable',
          deviceId: deviceHash
        })
        .expect(200);

      // Should not return Windows version for Mac client
      expect(response.body.updateAvailable).toBe(false);
    });
  });

  describe('Rollout Percentage Logic', () => {
    test('should use deterministic hashing for rollout', async () => {
      await AppVersion.create({
        platform: 'mac',
        arch: 'arm64',
        version: '1.3.0',
        build_number: 130,
        download_url: 'https://example.com/app-1.3.0.dmg',
        channel: 'stable',
        is_active: true,
        rollout_percentage: 50
      });

      // Same device should always get same result
      const response1 = await request(app)
        .post('/api/update/check')
        .set('Authorization', `Bearer ${leaseToken}`)
        .set('X-Device-Id', deviceHash)
        .send({
          currentVersion: '1.2.4',
          currentBuild: 124,
          platform: 'mac',
          arch: 'arm64',
          channel: 'stable',
          deviceId: deviceHash
        });

      const response2 = await request(app)
        .post('/api/update/check')
        .set('Authorization', `Bearer ${leaseToken}`)
        .set('X-Device-Id', deviceHash)
        .send({
          currentVersion: '1.2.4',
          currentBuild: 124,
          platform: 'mac',
          arch: 'arm64',
          channel: 'stable',
          deviceId: deviceHash
        });

      // Same device should get consistent result
      expect(response1.body.updateAvailable).toBe(response2.body.updateAvailable);
    });
  });

  describe('Admin APIs', () => {
    const adminToken = process.env.ADMIN_TOKEN || 'test-admin-token';

    beforeEach(() => {
      // Set admin token for tests
      process.env.ADMIN_TOKEN = 'test-admin-token';
    });

    test('should create new version (admin)', async () => {
      const response = await request(app)
        .post('/api/admin/versions')
        .set('X-Admin-Token', adminToken)
        .send({
          platform: 'mac',
          arch: 'arm64',
          version: '1.3.0',
          build_number: 130,
          download_url: 'https://example.com/app-1.3.0.dmg',
          release_notes: 'New features',
          is_mandatory: false,
          is_active: true,
          rollout_percentage: 100,
          channel: 'stable'
        })
        .expect(201);

      expect(response.body.version).toBeDefined();
      expect(response.body.version.platform).toBe('mac');
      expect(response.body.version.version).toBe('1.3.0');
      expect(response.body.version.build_number).toBe(130);

      // Verify in database
      const version = await AppVersion.findByPk(response.body.version.id);
      expect(version).toBeDefined();
      expect(version.is_active).toBe(true);
    });

    test('should reject version creation without admin auth', async () => {
      await request(app)
        .post('/api/admin/versions')
        .send({
          platform: 'mac',
          version: '1.3.0',
          build_number: 130,
          download_url: 'https://example.com/app-1.3.0.dmg'
        })
        .expect(403);
    });

    test('should update version (admin)', async () => {
      const version = await AppVersion.create({
        platform: 'mac',
        arch: 'arm64',
        version: '1.3.0',
        build_number: 130,
        download_url: 'https://example.com/app-1.3.0.dmg',
        channel: 'stable',
        is_active: true,
        is_mandatory: false,
        rollout_percentage: 50
      });

      const response = await request(app)
        .patch(`/api/admin/versions/${version.id}`)
        .set('X-Admin-Token', adminToken)
        .send({
          is_mandatory: true,
          rollout_percentage: 100
        })
        .expect(200);

      expect(response.body.version.is_mandatory).toBe(true);
      expect(response.body.version.rollout_percentage).toBe(100);

      // Verify in database
      await version.reload();
      expect(version.is_mandatory).toBe(true);
      expect(version.rollout_percentage).toBe(100);
    });

    test('should list versions with filters (admin)', async () => {
      await AppVersion.create({
        platform: 'mac',
        arch: 'arm64',
        version: '1.3.0',
        build_number: 130,
        download_url: 'https://example.com/app-1.3.0.dmg',
        channel: 'stable',
        is_active: true
      });

      await AppVersion.create({
        platform: 'windows',
        arch: 'x64',
        version: '1.3.0',
        build_number: 130,
        download_url: 'https://example.com/app-1.3.0.exe',
        channel: 'stable',
        is_active: true
      });

      const response = await request(app)
        .get('/api/admin/versions?platform=mac')
        .set('X-Admin-Token', adminToken)
        .expect(200);

      expect(response.body.versions).toHaveLength(1);
      expect(response.body.versions[0].platform).toBe('mac');
    });

    test('should activate/deactivate version (kill switch)', async () => {
      const version = await AppVersion.create({
        platform: 'mac',
        arch: 'arm64',
        version: '1.3.0',
        build_number: 130,
        download_url: 'https://example.com/app-1.3.0.dmg',
        channel: 'stable',
        is_active: true
      });

      // Deactivate (kill switch)
      await request(app)
        .patch(`/api/admin/versions/${version.id}`)
        .set('X-Admin-Token', adminToken)
        .send({ is_active: false })
        .expect(200);

      await version.reload();
      expect(version.is_active).toBe(false);

      // Verify it's not returned in update check
      const updateResponse = await request(app)
        .post('/api/update/check')
        .set('Authorization', `Bearer ${leaseToken}`)
        .set('X-Device-Id', deviceHash)
        .send({
          currentVersion: '1.2.4',
          currentBuild: 124,
          platform: 'mac',
          arch: 'arm64',
          channel: 'stable',
          deviceId: deviceHash
        })
        .expect(200);

      expect(updateResponse.body.updateAvailable).toBe(false);
    });
  });

  describe('Fail-Closed Behavior', () => {
    test('should fail closed on database error', async () => {
      // Close database connection to simulate error
      await db.sequelize.close();

      const response = await request(app)
        .post('/api/update/check')
        .set('Authorization', `Bearer ${leaseToken}`)
        .set('X-Device-Id', deviceHash)
        .send({
          currentVersion: '1.2.4',
          currentBuild: 124,
          platform: 'mac',
          arch: 'arm64',
          channel: 'stable',
          deviceId: deviceHash
        });

      // Should return error, not grant update
      expect(response.status).toBe(500);
      expect(response.body.updateAvailable).toBeUndefined();

      // Reconnect for other tests
      await db.sequelize.authenticate();
    });
  });
});
