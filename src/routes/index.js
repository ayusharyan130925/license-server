const express = require('express');
const authRoutes = require('./auth');
const licenseRoutes = require('./license');
const billingRoutes = require('./billing');
const stripeRoutes = require('./stripe');
const updateRoutes = require('./update');
const adminRoutes = require('./admin');

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
router.use('/update', updateRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
