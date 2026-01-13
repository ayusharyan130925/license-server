const express = require('express');
const authRoutes = require('./auth');
const licenseRoutes = require('./license');
const billingRoutes = require('./billing');
const stripeRoutes = require('./stripe');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/license', licenseRoutes);
router.use('/billing', billingRoutes);
router.use('/stripe', stripeRoutes);

module.exports = router;
