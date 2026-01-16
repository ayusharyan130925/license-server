const stripe = require('stripe');
const { Op } = require('sequelize');
const config = require('../config');
const { User, Subscription, WebhookEvent, Plan, Payment } = require('../models');
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
 * - Payment tracking
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

      // Determine plan based on subscription (default to 'basic' for active subscriptions)
      // In production, you might map Stripe price IDs to plans
      const plan = await Plan.findOne({
        where: { name: 'basic' },
        transaction
      });

      // Extract subscription period dates from Stripe subscription
      const currentPeriodStart = subscription.current_period_start 
        ? new Date(subscription.current_period_start * 1000) 
        : null;
      const currentPeriodEnd = subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000) 
        : null;
      const trialEnd = subscription.trial_end 
        ? new Date(subscription.trial_end * 1000) 
        : null;
      const cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
      const canceledAt = subscription.canceled_at 
        ? new Date(subscription.canceled_at * 1000) 
        : null;

      // Create or update subscription record
      const [dbSubscription] = await Subscription.findOrCreate({
        where: { stripe_subscription_id: subscriptionId },
        defaults: {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: 'active',
          plan_id: plan ? plan.id : null,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          trial_end: trialEnd,
          cancel_at_period_end: cancelAtPeriodEnd,
          canceled_at: canceledAt
        },
        transaction
      });

      // Update if exists (shouldn't happen due to idempotency check, but defensive)
      if (!dbSubscription.isNewRecord) {
        dbSubscription.stripe_customer_id = customerId;
        dbSubscription.status = 'active';
        if (plan && !dbSubscription.plan_id) {
          dbSubscription.plan_id = plan.id;
        }
        // Update period dates
        if (currentPeriodStart) dbSubscription.current_period_start = currentPeriodStart;
        if (currentPeriodEnd) dbSubscription.current_period_end = currentPeriodEnd;
        if (trialEnd) dbSubscription.trial_end = trialEnd;
        dbSubscription.cancel_at_period_end = cancelAtPeriodEnd;
        if (canceledAt) dbSubscription.canceled_at = canceledAt;
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

      // Update subscription period dates
      const currentPeriodStart = subscription.current_period_start 
        ? new Date(subscription.current_period_start * 1000) 
        : null;
      const currentPeriodEnd = subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000) 
        : null;
      const trialEnd = subscription.trial_end 
        ? new Date(subscription.trial_end * 1000) 
        : null;
      const cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
      const canceledAt = subscription.canceled_at 
        ? new Date(subscription.canceled_at * 1000) 
        : null;

      dbSubscription.status = dbStatus;
      if (currentPeriodStart) dbSubscription.current_period_start = currentPeriodStart;
      if (currentPeriodEnd) dbSubscription.current_period_end = currentPeriodEnd;
      if (trialEnd) dbSubscription.trial_end = trialEnd;
      dbSubscription.cancel_at_period_end = cancelAtPeriodEnd;
      if (canceledAt) dbSubscription.canceled_at = canceledAt;
      
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

      // Update cancellation details
      const canceledAt = subscription.canceled_at 
        ? new Date(subscription.canceled_at * 1000) 
        : new Date();
      
      dbSubscription.status = 'expired';
      dbSubscription.canceled_at = canceledAt;
      dbSubscription.cancel_at_period_end = false; // Already canceled
      
      await dbSubscription.save({ transaction });

      // Mark webhook as processed
      await this.markWebhookProcessed(eventId, 'customer.subscription.deleted', transaction);

      return dbSubscription;
    });
  }

  /**
   * Handle invoice payment succeeded event
   * Stores payment details and updates subscription period
   * 
   * @param {Object} invoice - Stripe invoice object
   * @param {string} eventId - Stripe event ID for idempotency
   * @returns {Promise<Payment>} - Payment record
   */
  static async handleInvoicePaymentSucceeded(invoice, eventId) {
    return await db.sequelize.transaction(async (transaction) => {
      // SECURITY: Check idempotency
      if (await this.isWebhookProcessed(eventId, transaction)) {
        const existing = await Payment.findOne({
          where: { stripe_invoice_id: invoice.id },
          transaction
        });
        if (existing) {
          return existing;
        }
      }

      const customerId = invoice.customer;
      const subscriptionId = invoice.subscription;

      // Find subscription to get user_id
      const subscription = await Subscription.findOne({
        where: { stripe_subscription_id: subscriptionId },
        transaction
      });

      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found for invoice ${invoice.id}`);
      }

      // Extract payment details
      const paymentIntentId = invoice.payment_intent;
      const chargeId = invoice.charge;
      const amount = invoice.amount_paid / 100; // Convert from cents
      const currency = invoice.currency;
      const periodStart = invoice.period_start 
        ? new Date(invoice.period_start * 1000) 
        : null;
      const periodEnd = invoice.period_end 
        ? new Date(invoice.period_end * 1000) 
        : null;
      const paidAt = invoice.status_transitions?.paid_at 
        ? new Date(invoice.status_transitions.paid_at * 1000) 
        : new Date();

      // Create payment record
      const [payment] = await Payment.findOrCreate({
        where: { stripe_invoice_id: invoice.id },
        defaults: {
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          stripe_invoice_id: invoice.id,
          stripe_payment_intent_id: paymentIntentId,
          stripe_charge_id: chargeId,
          amount: amount,
          currency: currency,
          status: 'succeeded',
          payment_method: invoice.payment_method_types?.[0] || 'card',
          description: invoice.description || `Subscription payment for ${currency.toUpperCase()} ${amount}`,
          billing_period_start: periodStart,
          billing_period_end: periodEnd,
          paid_at: paidAt,
          metadata: {
            invoice_number: invoice.number,
            hosted_invoice_url: invoice.hosted_invoice_url,
            invoice_pdf: invoice.invoice_pdf
          }
        },
        transaction
      });

      // Update subscription period dates if this is a renewal
      if (subscription && periodEnd) {
        subscription.current_period_end = periodEnd;
        if (periodStart) {
          subscription.current_period_start = periodStart;
        }
        // Ensure subscription is active if payment succeeded
        if (subscription.status !== 'active') {
          subscription.status = 'active';
        }
        await subscription.save({ transaction });
      }

      // Mark webhook as processed
      await this.markWebhookProcessed(eventId, 'invoice.payment_succeeded', transaction);

      return payment;
    });
  }

  /**
   * Handle invoice payment failed event
   * Records failed payment attempt
   * 
   * @param {Object} invoice - Stripe invoice object
   * @param {string} eventId - Stripe event ID for idempotency
   * @returns {Promise<Payment>} - Payment record
   */
  static async handleInvoicePaymentFailed(invoice, eventId) {
    return await db.sequelize.transaction(async (transaction) => {
      // SECURITY: Check idempotency
      if (await this.isWebhookProcessed(eventId, transaction)) {
        const existing = await Payment.findOne({
          where: { stripe_invoice_id: invoice.id },
          transaction
        });
        if (existing) {
          return existing;
        }
      }

      const subscriptionId = invoice.subscription;

      // Find subscription to get user_id
      const subscription = await Subscription.findOne({
        where: { stripe_subscription_id: subscriptionId },
        transaction
      });

      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found for invoice ${invoice.id}`);
      }

      // Extract payment details
      const amount = invoice.amount_due / 100; // Convert from cents
      const currency = invoice.currency;
      const periodStart = invoice.period_start 
        ? new Date(invoice.period_start * 1000) 
        : null;
      const periodEnd = invoice.period_end 
        ? new Date(invoice.period_end * 1000) 
        : null;
      const failureReason = invoice.last_payment_error?.message || 'Payment failed';

      // Create or update payment record with failed status
      const [payment] = await Payment.findOrCreate({
        where: { stripe_invoice_id: invoice.id },
        defaults: {
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          stripe_invoice_id: invoice.id,
          amount: amount,
          currency: currency,
          status: 'failed',
          payment_method: invoice.payment_method_types?.[0] || 'card',
          description: invoice.description || `Failed payment for ${currency.toUpperCase()} ${amount}`,
          billing_period_start: periodStart,
          billing_period_end: periodEnd,
          failure_reason: failureReason,
          metadata: {
            invoice_number: invoice.number,
            attempt_count: invoice.attempt_count
          }
        },
        transaction
      });

      // Update payment status if it already exists
      if (!payment.isNewRecord) {
        payment.status = 'failed';
        payment.failure_reason = failureReason;
        await payment.save({ transaction });
      }

      // Mark webhook as processed
      await this.markWebhookProcessed(eventId, 'invoice.payment_failed', transaction);

      return payment;
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
