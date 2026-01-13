# Environment Configuration

## Required .env File Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=visionai_desktop_license
DB_USER=root
DB_PASSWORD=your_mysql_password_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_LEASE_EXPIRY_HOURS=24

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_ID=price_your_stripe_price_id

# Application URLs
FRONTEND_URL=http://localhost:3001
STRIPE_SUCCESS_URL=http://localhost:3001/success
STRIPE_CANCEL_URL=http://localhost:3001/cancel
```

## Database Name

The database name is configured as: **`visionai_desktop_license`**

Make sure:
1. MySQL is running
2. Database `visionai_desktop_license` exists
3. User has proper permissions on the database
4. All environment variables are set correctly

## Quick Setup

1. Copy this configuration to your `.env` file
2. Update `DB_PASSWORD` with your MySQL root password
3. Generate a secure `JWT_SECRET` (use `openssl rand -hex 32`)
4. Configure Stripe keys from your Stripe Dashboard
5. Run migrations: `npm run migrate`
