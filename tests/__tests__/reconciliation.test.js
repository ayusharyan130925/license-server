/**
 * Stripe ↔ Database Reconciliation Tests
 * 
 * SECURITY: Proves reconciliation fixes state without granting unauthorized access
 */

// Mock Stripe before importing services that use it
jest.mock('stripe', () => {
  const mockStripeClient = require('../helpers/stripe-mock').mockStripeClient;
  return jest.fn(() => mockStripeClient);
});

const { resetDatabase, db } = require('../helpers/database');
const { createUser, createSubscription } = require('../helpers/factories');
const { setupDefaultStripeMocks, mockStripeClient, resetStripeMocks } = require('../helpers/stripe-mock');
const { User, Subscription } = require('../../src/models');
const ReconciliationService = require('../../src/services/reconciliationService');

describe('Stripe ↔ Database Reconciliation', () => {
  beforeAll(async () => {
    await resetDatabase();
    setupDefaultStripeMocks();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  beforeEach(async () => {
    resetStripeMocks();
    setupDefaultStripeMocks();
    await Subscription.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  describe('Missed webhook recovery', () => {
    test('missed webhook → reconciliation fixes DB (Stripe active, DB expired)', async () => {
      const user = await createUser({ email: 'missed-webhook@example.com' });
      const subscription = await createSubscription({
        user_id: user.id,
        stripe_customer_id: 'cus_test_missed',
        stripe_subscription_id: 'sub_test_missed',
        status: 'expired' // DB says expired
      });

      // Stripe says active (webhook was missed)
      mockStripeClient.customers.retrieve.mockResolvedValue({
        id: 'cus_test_missed',
        email: user.email,
        metadata: { user_id: user.id.toString() }
      });

      mockStripeClient.subscriptions.list.mockResolvedValue({
        data: [{
          id: 'sub_test_missed',
          customer: 'cus_test_missed',
          status: 'active'
        }]
      });

      // Reconcile
      const result = await ReconciliationService.reconcileUserSubscription(user);

      expect(result.reconciled).toBe(true);
      expect(result.action).toBe('UPDATED');
      expect(result.details.new_status).toBe('active');

      await subscription.reload();
      expect(subscription.status).toBe('active');
    });

    test('Stripe canceled but DB active → DB expired (downgrade)', async () => {
      const user = await createUser({ email: 'canceled-test@example.com' });
      const subscription = await createSubscription({
        user_id: user.id,
        stripe_customer_id: 'cus_test_canceled',
        stripe_subscription_id: 'sub_test_canceled',
        status: 'active' // DB says active
      });

      // Stripe says canceled
      mockStripeClient.customers.retrieve.mockResolvedValue({
        id: 'cus_test_canceled',
        email: user.email,
        metadata: { user_id: user.id.toString() }
      });

      mockStripeClient.subscriptions.list.mockResolvedValue({
        data: [{
          id: 'sub_test_canceled',
          customer: 'cus_test_canceled',
          status: 'canceled'
        }]
      });

      const result = await ReconciliationService.reconcileUserSubscription(user);

      expect(result.reconciled).toBe(true);
      expect(result.details.new_status).toBe('expired');

      await subscription.reload();
      expect(subscription.status).toBe('expired');
    });
  });

  describe('Reconciliation safety rules', () => {
    test('reconciliation never grants access without Stripe proof', async () => {
      const user = await createUser({ email: 'no-proof@example.com' });
      const subscription = await createSubscription({
        user_id: user.id,
        stripe_customer_id: 'cus_test_no_proof',
        stripe_subscription_id: 'sub_test_no_proof',
        status: 'expired'
      });

      // Stripe has no active subscription
      mockStripeClient.customers.retrieve.mockResolvedValue({
        id: 'cus_test_no_proof',
        email: user.email,
        metadata: { user_id: user.id.toString() }
      });

      mockStripeClient.subscriptions.list.mockResolvedValue({
        data: [] // No subscriptions
      });

      const result = await ReconciliationService.reconcileUserSubscription(user);

      // Should not upgrade without Stripe proof
      await subscription.reload();
      expect(subscription.status).toBe('expired');
    });

    test('reconciliation logs all actions for audit', async () => {
      const { RiskEvent } = require('../../src/models');
      await RiskEvent.destroy({ where: {}, force: true });

      const user = await createUser({ email: 'audit-test@example.com' });
      await createSubscription({
        user_id: user.id,
        stripe_customer_id: 'cus_test_audit',
        stripe_subscription_id: 'sub_test_audit',
        status: 'expired'
      });

      mockStripeClient.customers.retrieve.mockResolvedValue({
        id: 'cus_test_audit',
        email: user.email,
        metadata: { user_id: user.id.toString() }
      });

      mockStripeClient.subscriptions.list.mockResolvedValue({
        data: [{
          id: 'sub_test_audit',
          customer: 'cus_test_audit',
          status: 'active'
        }]
      });

      await ReconciliationService.reconcileUserSubscription(user);

      // Verify reconciliation was logged
      const riskEvent = await RiskEvent.findOne({
        where: { 
          user_id: user.id,
          event_type: 'RECONCILIATION_PERFORMED'
        }
      });

      expect(riskEvent).toBeTruthy();
      expect(riskEvent.metadata.previous_status).toBe('expired');
      expect(riskEvent.metadata.new_status).toBe('active');
    });
  });

  describe('Bulk reconciliation', () => {
    test('reconcileAll processes all users with mismatches', async () => {
      // Create users with potential mismatches
      const user1 = await createUser({ email: 'bulk1@example.com' });
      await createSubscription({
        user_id: user1.id,
        stripe_customer_id: 'cus_bulk_1',
        status: 'expired'
      });

      const user2 = await createUser({ email: 'bulk2@example.com' });
      await createSubscription({
        user_id: user2.id,
        stripe_customer_id: 'cus_bulk_2',
        status: 'trial'
      });

      // Setup Stripe mocks
      mockStripeClient.customers.retrieve
        .mockResolvedValueOnce({
          id: 'cus_bulk_1',
          email: user1.email,
          metadata: { user_id: user1.id.toString() }
        })
        .mockResolvedValueOnce({
          id: 'cus_bulk_2',
          email: user2.email,
          metadata: { user_id: user2.id.toString() }
        });

      mockStripeClient.subscriptions.list
        .mockResolvedValueOnce({
          data: [{ id: 'sub_bulk_1', customer: 'cus_bulk_1', status: 'active' }]
        })
        .mockResolvedValueOnce({
          data: []
        });

      const result = await ReconciliationService.reconcileAll();

      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.reconciled).toBeGreaterThanOrEqual(1);
    });
  });
});
