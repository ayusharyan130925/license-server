const express = require('express');
const StripeService = require('../services/stripeService');

const router = express.Router();

/**
 * POST /stripe/webhook
 * 
 * Handle Stripe webhook events.
 * 
 * Events handled:
 *   - checkout.session.completed: Subscription created
 *   - customer.subscription.updated: Subscription status changed
 *   - customer.subscription.deleted: Subscription cancelled
 * 
 * Security:
 *   - Verifies webhook signature using Stripe secret
 *   - Raw body required for signature verification
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // Raw body for signature verification
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing Stripe signature'
      });
    }

    try {
      // Verify webhook signature
      const event = StripeService.verifyWebhookSignature(req.body, signature);

      // SECURITY: Extract event ID for idempotency tracking
      const eventId = event.id;

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          
          // Retrieve the subscription
          const stripe = require('stripe')(require('../config').stripe.secretKey);
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          
          // Pass event ID for idempotency
          await StripeService.handleSubscriptionCreated(subscription, eventId);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          // Pass event ID for idempotency
          await StripeService.handleSubscriptionUpdated(subscription, eventId);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          // Pass event ID for idempotency
          await StripeService.handleSubscriptionDeleted(subscription, eventId);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          // Store payment details and update subscription period
          await StripeService.handleInvoicePaymentSucceeded(invoice, eventId);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          // Record failed payment attempt
          await StripeService.handleInvoicePaymentFailed(invoice, eventId);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
          // Still mark as processed to prevent reprocessing
          await StripeService.markWebhookProcessed(eventId, event.type);
      }

      // Acknowledge receipt of webhook
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({
        error: 'Webhook Error',
        message: error.message
      });
    }
  }
);

module.exports = router;
