const stripe = require('stripe');
const { Op } = require('sequelize');
const config = require('../config');
const { User, Subscription, WebhookEvent } = require('../models');
const db = require('../models');

// Initialize Stripe with secret key
const stripeClient = stripe(config.stripe.secretKey);

/**
 * Stripe Service
 * 
 * Handles Stripe integration for subscriptions:
 * - Creating checkout sessions
 * - Managing customer and subscription records
 * - Webhook event processing
 */
class StripeService {
  /**
   * Create a Stripe Checkout Session for subscription
   * SECURITY: Blocks checkout if user already has active subscription
   * 
   * @param {number} userId - User ID
   * @param {string} email - User email
   * @returns {Promise<Object>} - Checkout session with URL
   * @throws {Error} - If user already has active subscription
   */
  static async createCheckoutSession(userId, email) {
    // SECURITY: Check if user already has active subscription
    const activeSubscription = await Subscription.findOne({
      where: {
        user_id: userId,
        status: 'active'
      }
    });

    if (activeSubscription) {
      throw new Error('User already has an active subscription');
    }
    // Get or create Stripe customer
    let customer;
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already has a Stripe customer ID
    const existingSubscription = await Subscription.findOne({
      where: { user_id: userId, stripe_customer_id: { [Op.ne]: null } },
      order: [['created_at', 'DESC']]
    });

    if (existingSubscription && existingSubscription.stripe_customer_id) {
      // Retrieve existing customer
      customer = await stripeClient.customers.retrieve(existingSubscription.stripe_customer_id);
    } else {
      // Create new Stripe customer
      customer = await stripeClient.customers.create({
        email: email,
        metadata: {
          user_id: userId.toString()
        }
      });
    }

    // Create checkout session
    const session = await stripeClient.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: config.stripe.priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${config.urls.stripeSuccess}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: config.urls.stripeCancel,
      metadata: {
        user_id: userId.toString()
      }
    });

    return {
      session_id: session.id,
      url: session.url
    };
  }

  /**
   * Check if webhook event has already been processed (idempotency)
   * @param {string} eventId - Stripe event ID
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<boolean>} - True if already processed
   */
  static async isWebhookProcessed(eventId, transaction = null) {
    const existing = await WebhookEvent.findOne({
      where: { stripe_event_id: eventId },
      transaction
    });
    return !!existing;
  }

  /**
   * Mark webhook event as processed (idempotency)
   * @param {string} eventId - Stripe event ID
   * @param {string} eventType - Event type
   * @param {Transaction} transaction - Database transaction
   * @returns {Promise<WebhookEvent>} - Webhook event record
   */
  static async markWebhookProcessed(eventId, eventType, transaction = null) {
    const [webhookEvent] = await WebhookEvent.findOrCreate({
      where: { stripe_event_id: eventId },
      defaults: {
        stripe_event_id: eventId,
        event_type: eventType,
        processed_at: new Date()
      },
      transaction
    });
    return webhookEvent;
  }

  /**
   * Handle successful subscription creation from webhook
   * SECURITY: Idempotent - checks if webhook already processed
   * 
   * @param {Object} subscription - Stripe subscription object
   * @param {string} eventId - Stripe event ID for idempotency
   * @returns {Promise<Subscription>} - Updated subscription record
   */
  static async handleSubscriptionCreated(subscription, eventId) {
    return await db.sequelize.transaction(async (transaction) => {
      // SECURITY: Check idempotency - prevent duplicate processing
      if (await this.isWebhookProcessed(eventId, transaction)) {
        // Already processed - return existing subscription
        const existing = await Subscription.findOne({
          where: { stripe_subscription_id: subscription.id },
          transaction
        });
        if (existing) {
          return existing;
        }
      }

      const customerId = subscription.customer;
      const subscriptionId = subscription.id;

      // Get customer to find user_id from metadata
      const customer = await stripeClient.customers.retrieve(customerId);
      const userId = parseInt(customer.metadata.user_id, 10);

      if (!userId) {
        throw new Error('User ID not found in customer metadata');
      }

      // Create or update subscription record
      const [dbSubscription] = await Subscription.findOrCreate({
        where: { stripe_subscription_id: subscriptionId },
        defaults: {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: 'active'
        },
        transaction
      });

      // Update if exists (shouldn't happen due to idempotency check, but defensive)
      if (!dbSubscription.isNewRecord) {
        dbSubscription.stripe_customer_id = customerId;
        dbSubscription.status = 'active';
        await dbSubscription.save({ transaction });
      }

      // Mark webhook as processed
      await this.markWebhookProcessed(eventId, 'checkout.session.completed', transaction);

      return dbSubscription;
    });
  }

  /**
   * Handle subscription update from webhook
   * SECURITY: Idempotent - checks if webhook already processed
   * 
   * @param {Object} subscription - Stripe subscription object
   * @param {string} eventId - Stripe event ID for idempotency
   * @returns {Promise<Subscription>} - Updated subscription record
   */
  static async handleSubscriptionUpdated(subscription, eventId) {
    return await db.sequelize.transaction(async (transaction) => {
      // SECURITY: Check idempotency
      if (await this.isWebhookProcessed(eventId, transaction)) {
        // Already processed - return existing subscription
        const existing = await Subscription.findOne({
          where: { stripe_subscription_id: subscription.id },
          transaction
        });
        if (existing) {
          return existing;
        }
      }

      const subscriptionId = subscription.id;
      const status = subscription.status;

      // Map Stripe status to our status
      let dbStatus = 'expired';
      if (status === 'active' || status === 'trialing') {
        dbStatus = 'active';
      } else if (status === 'past_due' || status === 'unpaid') {
        dbStatus = 'expired';
      }

      const dbSubscription = await Subscription.findOne({
        where: { stripe_subscription_id: subscriptionId },
        transaction
      });

      if (!dbSubscription) {
        throw new Error(`Subscription ${subscriptionId} not found in database`);
      }

      dbSubscription.status = dbStatus;
      await dbSubscription.save({ transaction });

      // Mark webhook as processed
      await this.markWebhookProcessed(eventId, 'customer.subscription.updated', transaction);

      return dbSubscription;
    });
  }

  /**
   * Handle subscription cancellation from webhook
   * SECURITY: Idempotent - checks if webhook already processed
   * 
   * @param {Object} subscription - Stripe subscription object
   * @param {string} eventId - Stripe event ID for idempotency
   * @returns {Promise<Subscription>} - Updated subscription record
   */
  static async handleSubscriptionDeleted(subscription, eventId) {
    return await db.sequelize.transaction(async (transaction) => {
      // SECURITY: Check idempotency
      if (await this.isWebhookProcessed(eventId, transaction)) {
        // Already processed - return existing subscription
        const existing = await Subscription.findOne({
          where: { stripe_subscription_id: subscription.id },
          transaction
        });
        if (existing) {
          return existing;
        }
      }

      const subscriptionId = subscription.id;

      const dbSubscription = await Subscription.findOne({
        where: { stripe_subscription_id: subscriptionId },
        transaction
      });

      if (!dbSubscription) {
        throw new Error(`Subscription ${subscriptionId} not found in database`);
      }

      dbSubscription.status = 'expired';
      await dbSubscription.save({ transaction });

      // Mark webhook as processed
      await this.markWebhookProcessed(eventId, 'customer.subscription.deleted', transaction);

      return dbSubscription;
    });
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Raw request body
   * @param {string} signature - Stripe signature header
   * @returns {Object} - Verified event object
   * @throws {Error} - If signature is invalid
   */
  static verifyWebhookSignature(payload, signature) {
    try {
      const event = stripeClient.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret
      );
      return event;
    } catch (error) {
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }
}

module.exports = StripeService;
