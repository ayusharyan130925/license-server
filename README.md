# VisionAI License & Billing Server

Production-grade license and billing server for Electron desktop applications. Enforces device-based 14-day trials, manages Stripe subscriptions, and provides secure license validation via JWT lease tokens.

## Features

- **Device-Based Trial System**: 14-day trials enforced per device (not per user)
- **Stripe Integration**: Full subscription management with webhook support
- **JWT Lease Tokens**: Short-lived tokens (12-24 hours) for license validation
- **Security First**: Server-side date validation, rate limiting, and secure authentication
- **Production Ready**: Sequelize migrations, proper error handling, and comprehensive logging

## Architecture

```
src/
├── config/          # Configuration files
├── models/          # Sequelize models
├── migrations/      # Database migrations
├── routes/          # Express route handlers
├── services/        # Business logic services
├── middleware/      # Express middleware
└── server.js        # Main server file
```

## Prerequisites

- Node.js 16+ 
- MySQL 8.0+
- Stripe account with API keys

## Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - MySQL connection
  - `DB_NAME` should be set to `visionai_desktop_license`
- `JWT_SECRET` - Secret key for JWT token signing
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `STRIPE_PRICE_ID` - Stripe price ID for subscription

3. **Run database migrations:**

```bash
npm run migrate
```

This will create all required tables:
- `users` - User accounts
- `devices` - Device records with trial information
- `subscriptions` - Stripe subscription records
- `device_users` - User-device associations

## Usage

### Start the server:

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:3000` by default.

## API Endpoints

### POST /api/auth/register

Register a new user-device pair and start trial if eligible.

**Request:**
```json
{
  "email": "user@example.com",
  "device_hash": "hashed_device_identifier_here"
}
```

**Response:**
```json
{
  "success": true,
  "license_status": "trial",
  "trial_expires_at": "2024-01-15T00:00:00.000Z",
  "days_left": 14,
  "lease_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### GET /api/license/status

Get current license status for authenticated device.

**Headers:**
- `Authorization: Bearer <lease_token>`
- `X-Device-Id: <device_hash>`

**Response:**
```json
{
  "status": "trial",
  "expires_at": "2024-01-15T00:00:00.000Z",
  "days_left": 10,
  "lease_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /api/billing/create-checkout

Create a Stripe Checkout Session for subscription.

**Headers:**
- `Authorization: Bearer <lease_token>`
- `X-Device-Id: <device_hash>`

**Response:**
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_test_..."
}
```

### POST /api/stripe/webhook

Stripe webhook endpoint for subscription events.

**Note:** Configure this URL in your Stripe Dashboard webhook settings.

## Trial Rules

- **Duration**: Exactly 14 days from registration
- **Eligibility**: One trial per device (device_hash), not per user
- **Enforcement**: All date calculations are server-side
- **Persistence**: Changing email does NOT reset trial

## Security Features

1. **JWT Lease Tokens**: Short-lived tokens (12-24 hours) that must be refreshed
2. **Device Validation**: Token device_id must match X-Device-Id header
3. **Rate Limiting**: Authentication endpoints protected from abuse
4. **Server-Side Validation**: All date calculations and license checks are server-side
5. **Webhook Signature Verification**: Stripe webhooks are cryptographically verified

## Database Migrations

All schema changes are managed via Sequelize migrations:

```bash
# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:undo

# Rollback all migrations
npm run migrate:undo:all
```

**Important**: Never use `sequelize.sync()` in production. Always use migrations.

## Stripe Setup

1. **Create a Product and Price** in Stripe Dashboard
2. **Copy the Price ID** to `STRIPE_PRICE_ID` in `.env`
3. **Configure Webhook**:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. **Copy Webhook Signing Secret** to `STRIPE_WEBHOOK_SECRET` in `.env`

## Client Integration (Electron App)

### Device Hash Generation

Generate a unique, stable device identifier on the client:

```javascript
// Example: Hash of machine ID, MAC address, etc.
const crypto = require('crypto');
const os = require('os');

function generateDeviceHash() {
  const machineId = os.hostname() + os.platform() + os.arch();
  return crypto.createHash('sha256').update(machineId).digest('hex');
}
```

### Registering User-Device Pair

```javascript
const response = await fetch('http://your-server.com/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    device_hash: generateDeviceHash()
  })
});

const { lease_token, license_status, days_left } = await response.json();
// Store lease_token securely
```

### Checking License Status

```javascript
const response = await fetch('http://your-server.com/api/license/status', {
  headers: {
    'Authorization': `Bearer ${lease_token}`,
    'X-Device-Id': generateDeviceHash()
  }
});

const { status, expires_at, days_left, lease_token: newToken } = await response.json();
// Update stored lease_token
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (device mismatch)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Production Deployment

1. **Set `NODE_ENV=production`** in `.env`
2. **Use strong `JWT_SECRET`** (generate with `openssl rand -hex 32`)
3. **Enable HTTPS** (use reverse proxy like nginx)
4. **Configure MySQL** with proper connection pooling
5. **Set up monitoring** and logging
6. **Configure Stripe webhook** with production URL
7. **Use environment-specific database** credentials

## License

ISC
