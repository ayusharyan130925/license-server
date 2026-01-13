const express = require('express');
const StripeService = require('../services/stripeService');
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * POST /billing/create-checkout
 * 
 * Create a Stripe Checkout Session for subscription.
 * 
 * Headers:
 *   - Authorization: Bearer <lease_token>
 *   - X-Device-Id: <device_hash>
 * 
 * Response:
 *   - checkout_url: Stripe Checkout Session URL
 *   - session_id: Stripe Checkout Session ID
 */
router.post(
  '/create-checkout',
  apiLimiter,
  authenticate,
  async (req, res) => {
    try {
      const deviceId = req.lease.device_id;

      // Get user associated with this device
      const { DeviceUser, User } = require('../models');
      const deviceUser = await DeviceUser.findOne({
        where: { device_id: deviceId },
        include: [{
          model: User,
          as: 'user'
        }],
        order: [['created_at', 'DESC']]
      });

      if (!deviceUser || !deviceUser.user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found for this device'
        });
      }

      // Create Stripe checkout session
      const checkout = await StripeService.createCheckoutSession(
        deviceUser.user_id,
        deviceUser.user.email
      );

      res.status(200).json({
        checkout_url: checkout.url,
        session_id: checkout.session_id
      });
    } catch (error) {
      console.error('Checkout creation error:', error);
      
      // SECURITY: Return 409 Conflict if user already has active subscription
      if (error.message && error.message.includes('already has an active subscription')) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'User already has an active subscription',
          code: 'SUBSCRIPTION_ALREADY_ACTIVE'
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create checkout session'
      });
    }
  }
);

module.exports = router;
