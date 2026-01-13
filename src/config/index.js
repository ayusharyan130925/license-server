const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    leaseExpiryHours: parseInt(process.env.JWT_LEASE_EXPIRY_HOURS || '24', 10)
  },
  
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    priceId: process.env.STRIPE_PRICE_ID
  },
  
  urls: {
    frontend: process.env.FRONTEND_URL || 'http://localhost:3001',
    stripeSuccess: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3001/success',
    stripeCancel: process.env.STRIPE_CANCEL_URL || 'http://localhost:3001/cancel'
  },
  
  // Abuse detection configuration
  abuseDetection: {
    defaultMaxDevicesPerUser: parseInt(process.env.DEFAULT_MAX_DEVICES_PER_USER || '2', 10),
    maxDevicesPerIpPer24h: parseInt(process.env.MAX_DEVICES_PER_IP_PER_24H || '5', 10),
    maxDevicesPerUserPer24h: parseInt(process.env.MAX_DEVICES_PER_USER_PER_24H || '3', 10),
    deviceChurnThreshold: parseInt(process.env.DEVICE_CHURN_THRESHOLD || '5', 10)
  }
};
