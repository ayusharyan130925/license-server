/**
 * Stripe Integration Tests
 * 
 * SECURITY: Proves Stripe webhooks are idempotent and safe
 */

// Mock Stripe before importing services that use it
jest.mock('stripe', () => {
  const mockStripeClient = require('../helpers/stripe-mock').mockStripeClient;
  return jest.fn(() => mockStripeClient);
});

const request = require('supertest');
const app = require('../../src/server');
const { resetDatabase, db } = require('../helpers/database');
const { createUser, createSubscription, createMockWebhookEvent, createMockSubscription } = require('../helpers/factories');
const { setupDefaultStripeMocks, mockStripeClient, resetStripeMocks } = require('../helpers/stripe-mock');
const { User, Subscription, WebhookEvent } = require('../../src/models');
const StripeService = require('../../src/services/stripeService');

describe('Stripe Integration', () => {
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
    await WebhookEvent.destroy({ where: {}, force: true });
    await Subscription.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  describe('Webhook idempotency', () => {
    test('duplicate checkout.session.completed events do NOT mutate state twice', async () => {
      const user = await createUser({ email: 'webhook-test@example.com' });
      
      const subscription = createMockSubscription({
        id: 'sub_test_duplicate',
        customer: 'cus_test_123',
        status: 'active'
      });

      mockStripeClient.customers.retrieve.mockResolvedValue({
        id: 'cus_test_123',
        email: user.email,
        metadata: { user_id: user.id.toString() }
      });

      const event1 = createMockWebhookEvent('checkout.session.completed', {
        subscription: subscription.id
      });

      mockStripeClient.subscriptions.retrieve.mockResolvedValue(subscription);

      // Process first webhook
      await StripeService.handleSubscriptionCreated(subscription, event1.id);

      // Verify subscription created
      const dbSub1 = await Subscription.findOne({
        where: { stripe_subscription_id: subscription.id }
      });
      expect(dbSub1).toBeTruthy();
      expect(dbSub1.status).toBe('active');

      // Process same webhook again (duplicate)
      await StripeService.handleSubscriptionCreated(subscription, event1.id);

      // Verify only one subscription record exists
      const subscriptionCount = await Subscription.count({
        where: { stripe_subscription_id: subscription.id }
      });
      expect(subscriptionCount).toBe(1);

      // Verify webhook event was tracked
      const webhookEvent = await WebhookEvent.findOne({
        where: { stripe_event_id: event1.id }
      });
      expect(webhookEvent).toBeTruthy();
    });

    test('replay attack using same stripe_event_id is ignored', async () => {
      const user = await createUser({ email: 'replay-test@example.com' });
      
      const subscription = createMockSubscription({
        id: 'sub_test_replay',
        customer: 'cus_test_123',
        status: 'active'
      });

      mockStripeClient.customers.retrieve.mockResolvedValue({
        id: 'cus_test_123',
        email: user.email,
        metadata: { user_id: user.id.toString() }
      });

      mockStripeClient.subscriptions.retrieve.mockResolvedValue(subscription);

      const eventId = 'evt_replay_attack_123';

      // First processing
      await StripeService.handleSubscriptionCreated(subscription, eventId);
      
      const dbSub1 = await Subscription.findOne({
        where: { stripe_subscription_id: subscription.id }
      });
      const originalStatus = dbSub1.status;

      // Replay attack (same event ID)
      await StripeService.handleSubscriptionCreated(subscription, eventId);

      // Status should be unchanged
      await dbSub1.reload();
      expect(dbSub1.status).toBe(originalStatus);

      // Only one webhook event record
      const eventCount = await WebhookEvent.count({
        where: { stripe_event_id: eventId }
      });
      expect(eventCount).toBe(1);
    });
  });

  describe('Subscription state updates', () => {
    test('checkout.session.completed activates subscription', async () => {
      const user = await createUser({ email: 'activate-test@example.com' });
      
      const subscription = createMockSubscription({
        id: 'sub_test_activate',
        customer: 'cus_test_123',
        status: 'active'
      });

      mockStripeClient.customers.retrieve.mockResolvedValue({
        id: 'cus_test_123',
        email: user.email,
        metadata: { user_id: user.id.toString() }
      });

      mockStripeClient.subscriptions.retrieve.mockResolvedValue(subscription);

      const event = createMockWebhookEvent('checkout.session.completed', {
        subscription: subscription.id
      });

      await StripeService.handleSubscriptionCreated(subscription, event.id);

      const dbSubscription = await Subscription.findOne({
        where: { stripe_subscription_id: subscription.id }
      });

      expect(dbSubscription).toBeTruthy();
      expect(dbSubscription.status).toBe('active');
      expect(dbSubscription.user_id).toBe(user.id);
    });

    test('customer.subscription.updated updates DB state', async () => {
      const user = await createUser({ email: 'update-test@example.com' });
      const subscription = await createSubscription({
        user_id: user.id,
        stripe_subscription_id: 'sub_test_update',
        status: 'trial'
      });

      const stripeSubscription = createMockSubscription({
        id: 'sub_test_update',
        customer: 'cus_test_123',
        status: 'active'
      });

      const event = createMockWebhookEvent('customer.subscription.updated', stripeSubscription);

      await StripeService.handleSubscriptionUpdated(stripeSubscription, event.id);

      await subscription.reload();
      expect(subscription.status).toBe('active');
    });

    test('customer.subscription.deleted expires license', async () => {
      const user = await createUser({ email: 'delete-test@example.com' });
      const subscription = await createSubscription({
        user_id: user.id,
        stripe_subscription_id: 'sub_test_delete',
        status: 'active'
      });

      const stripeSubscription = createMockSubscription({
        id: 'sub_test_delete',
        customer: 'cus_test_123',
        status: 'canceled'
      });

      const event = createMockWebhookEvent('customer.subscription.deleted', stripeSubscription);

      await StripeService.handleSubscriptionDeleted(stripeSubscription, event.id);

      await subscription.reload();
      expect(subscription.status).toBe('expired');
    });
  });

  describe('Webhook signature verification', () => {
    test('webhook without signature is rejected', async () => {
      const response = await request(app)
        .post('/api/stripe/webhook')
        .send({ type: 'checkout.session.completed' })
        .expect(400);

      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toContain('Missing Stripe signature');
    });

    test('invalid webhook signature is rejected', async () => {
      mockStripeClient.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send(JSON.stringify({ type: 'test.event' }))
        .expect(400);

      expect(response.body.error).toBe('Webhook Error');
    });
  });

  describe('Checkout session creation', () => {
    test('checkout blocked if user already has active subscription', async () => {
      const user = await createUser({ email: 'checkout-block@example.com' });
      await createSubscription({
        user_id: user.id,
        status: 'active'
      });

      // This would require a valid JWT token, but we can test the service directly
      await expect(
        StripeService.createCheckoutSession(user.id, user.email)
      ).rejects.toThrow('already has an active subscription');
    });
  });
});
