const stripe = require('stripe');
const config = require('../config');
const { User, Subscription, RiskEvent } = require('../models');
const { Op } = require('sequelize');
const db = require('../models');

// Initialize Stripe
const stripeClient = stripe(config.stripe.secretKey);

/**
 * Reconciliation Service
 * 
 * SECURITY: Reconciles Stripe subscription state with database.
 * Handles cases where webhooks are missed or delayed.
 * 
 * Rules:
 * - Stripe is source of truth for subscription status
 * - Never downgrade active DB subscription without Stripe confirmation
 * - Log all reconciliations for audit
 */
class ReconciliationService {
  /**
   * Reconcile a single user's subscription status
   * @param {User} user - User instance
   * @returns {Promise<{reconciled: boolean, action?: string, details?: Object}>}
   */
  static async reconcileUserSubscription(user) {
    try {
      // Find subscription with Stripe customer ID
      const subscription = await Subscription.findOne({
        where: {
          user_id: user.id,
          stripe_customer_id: { [Op.ne]: null }
        },
        order: [['created_at', 'DESC']]
      });

      if (!subscription || !subscription.stripe_customer_id) {
        // No Stripe customer - nothing to reconcile
        return { reconciled: false, reason: 'NO_STRIPE_CUSTOMER' };
      }

      // Query Stripe for current subscription status
      const customer = await stripeClient.customers.retrieve(subscription.stripe_customer_id);
      
      // Find active subscription in Stripe
      const stripeSubscriptions = await stripeClient.subscriptions.list({
        customer: subscription.stripe_customer_id,
        status: 'all',
        limit: 10
      });

      const activeStripeSubscription = stripeSubscriptions.data.find(
        sub => sub.status === 'active' || sub.status === 'trialing'
      );

      // Determine expected DB status based on Stripe
      let expectedDbStatus = 'expired';
      if (activeStripeSubscription) {
        if (activeStripeSubscription.status === 'active' || activeStripeSubscription.status === 'trialing') {
          expectedDbStatus = 'active';
        } else if (activeStripeSubscription.status === 'past_due' || activeStripeSubscription.status === 'unpaid') {
          expectedDbStatus = 'expired';
        }
      }

      // Compare with current DB status
      const currentDbStatus = subscription.status;

      if (currentDbStatus === expectedDbStatus) {
        // Already in sync
        return { reconciled: false, reason: 'ALREADY_IN_SYNC' };
      }

      // Reconciliation needed
      // SECURITY: Never downgrade active without Stripe confirmation
      if (currentDbStatus === 'active' && expectedDbStatus !== 'active') {
        // Double-check with Stripe before downgrading
        if (activeStripeSubscription && 
            (activeStripeSubscription.status === 'active' || activeStripeSubscription.status === 'trialing')) {
          // Stripe says active - keep DB as active (webhook may be delayed)
          return { reconciled: false, reason: 'STRIPE_ACTIVE_KEEP_DB_ACTIVE' };
        }
      }

      // Update DB to match Stripe
      subscription.status = expectedDbStatus;
      if (activeStripeSubscription) {
        subscription.stripe_subscription_id = activeStripeSubscription.id;
      }
      await subscription.save();

      // Log reconciliation event
      await RiskEvent.create({
        user_id: user.id,
        event_type: 'RECONCILIATION_PERFORMED',
        metadata: {
          previous_status: currentDbStatus,
          new_status: expectedDbStatus,
          stripe_subscription_id: activeStripeSubscription?.id || null,
          stripe_status: activeStripeSubscription?.status || 'none'
        }
      });

      return {
        reconciled: true,
        action: 'UPDATED',
        details: {
          previous_status: currentDbStatus,
          new_status: expectedDbStatus,
          stripe_subscription_id: activeStripeSubscription?.id || null
        }
      };
    } catch (error) {
      console.error(`Reconciliation error for user ${user.id}:`, error);
      
      // Log error but don't throw
      await RiskEvent.create({
        user_id: user.id,
        event_type: 'RECONCILIATION_PERFORMED',
        metadata: {
          error: error.message,
          error_type: error.constructor.name
        }
      }).catch(() => {}); // Don't fail if logging fails

      return {
        reconciled: false,
        reason: 'ERROR',
        error: error.message
      };
    }
  }

  /**
   * Reconcile all users with potential mismatches
   * @returns {Promise<{total: number, reconciled: number, errors: number}>}
   */
  static async reconcileAll() {
    // Find subscriptions with:
    // - status = trial OR expired
    // - but have stripe_customer_id (indicating they may have paid)
    const subscriptionsToReconcile = await Subscription.findAll({
      where: {
        status: { [Op.in]: ['trial', 'expired'] },
        stripe_customer_id: { [Op.ne]: null }
      },
      include: [{
        model: User,
        as: 'user',
        required: true
      }]
    });

    const usersToReconcile = subscriptionsToReconcile.map(sub => sub.user);

    let reconciled = 0;
    let errors = 0;

    for (const user of usersToReconcile) {
      const result = await this.reconcileUserSubscription(user);
      if (result.reconciled) {
        reconciled++;
      } else if (result.error) {
        errors++;
      }
    }

    return {
      total: usersToReconcile.length,
      reconciled,
      errors
    };
  }
}

module.exports = ReconciliationService;
