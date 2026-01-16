# Payment & License Tracking System

This document explains how the system stores purchase details from Stripe and maintains active/expired license status.

## 📊 Database Schema

### 1. **Subscriptions Table** (Enhanced)

Stores subscription information with period tracking:

```sql
subscriptions
├── id (PK)
├── user_id (FK → users)
├── stripe_customer_id (unique)
├── stripe_subscription_id (unique)
├── status (ENUM: 'trial', 'active', 'expired')
├── plan_id (FK → plans)
├── current_period_start (DATE)      -- NEW: Start of billing period
├── current_period_end (DATE)        -- NEW: End of billing period (determines expiration)
├── cancel_at_period_end (BOOLEAN)   -- NEW: Will cancel at period end
├── canceled_at (DATE)               -- NEW: When subscription was canceled
├── trial_end (DATE)                  -- NEW: End of trial period (if applicable)
├── created_at
└── updated_at
```

**Key Fields:**
- `current_period_end`: **Critical** - This determines when the license expires
- `status`: Current subscription status (active/expired)
- `cancel_at_period_end`: If true, subscription will expire at `current_period_end`

### 2. **Payments Table** (New)

Stores all payment transactions from Stripe:

```sql
payments
├── id (PK)
├── user_id (FK → users)
├── subscription_id (FK → subscriptions)
├── stripe_invoice_id (unique)       -- For idempotency
├── stripe_payment_intent_id
├── stripe_charge_id
├── amount (DECIMAL)                  -- Payment amount
├── currency (STRING)                  -- Currency code (USD, EUR, etc.)
├── status (ENUM: 'pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')
├── payment_method (STRING)           -- Payment method type
├── description (TEXT)                -- Payment description
├── billing_period_start (DATE)       -- Period this payment covers
├── billing_period_end (DATE)         -- Period this payment covers
├── paid_at (DATE)                    -- When payment was completed
├── failure_reason (TEXT)              -- Reason for failure (if applicable)
├── metadata (JSON)                   -- Additional Stripe metadata
├── created_at
└── updated_at
```

**Key Features:**
- **Idempotency**: `stripe_invoice_id` is unique, preventing duplicate payment records
- **Audit Trail**: Complete history of all payments (succeeded, failed, refunded)
- **Billing Period Tracking**: Links payments to subscription periods

## 🔄 How It Works

### 1. **Subscription Creation Flow**

```
User clicks "Subscribe" 
  → Stripe Checkout Session created
  → User completes payment
  → Stripe sends webhook: checkout.session.completed
  → System:
     1. Creates/updates Subscription record
     2. Sets status = 'active'
     3. Stores current_period_start and current_period_end from Stripe
     4. Links to Plan (basic/pro)
```

### 2. **Payment Tracking Flow**

```
Stripe sends invoice.payment_succeeded webhook
  → System:
     1. Creates Payment record with:
        - Invoice details
        - Amount, currency, payment method
        - Billing period dates
        - Status = 'succeeded'
     2. Updates Subscription:
        - Updates current_period_start/end (for renewals)
        - Ensures status = 'active'
```

### 3. **License Expiration Flow**

**Automatic Expiration (Scheduled Job):**
```
Every hour, LicenseExpirationService runs:
  1. Finds all subscriptions where:
     - status = 'active'
     - current_period_end < NOW
  2. Updates status = 'expired'
  3. License is now inactive
```

**Real-time Expiration (On License Check):**
```
User requests license status
  → LicenseService.getLicenseStatus()
  → Checks:
     1. Is subscription.status = 'active'?
     2. Is current_period_end > NOW?
     3. Is cancel_at_period_end = false?
  → If any check fails → License is expired
```

### 4. **Subscription Renewal Flow**

```
Stripe automatically charges user at period end
  → Stripe sends invoice.payment_succeeded
  → System:
     1. Creates new Payment record
     2. Updates Subscription:
        - current_period_start = new period start
        - current_period_end = new period end (extended)
        - status = 'active' (if it was active)
```

### 5. **Subscription Cancellation Flow**

```
User cancels subscription
  → Stripe sends customer.subscription.updated
  → System:
     1. Sets cancel_at_period_end = true
     2. Sets canceled_at = current timestamp
     3. Status remains 'active' until period_end
  → At period_end:
     - Status automatically changes to 'expired'
     - License becomes inactive
```

## 🔐 Security & Reliability

### Idempotency

All webhook handlers are **idempotent**:
- Check `webhook_events` table before processing
- Use unique constraints (`stripe_invoice_id`, `stripe_subscription_id`)
- Prevents duplicate processing if webhook is retried

### Data Integrity

1. **Transaction Safety**: All operations wrapped in database transactions
2. **Period Validation**: License checks validate `current_period_end` server-side
3. **Reconciliation**: Scheduled job syncs DB with Stripe (handles webhook failures)

### Automatic Expiration

**Scheduled Job** (`LicenseExpirationService`):
- Runs every 60 minutes (configurable)
- Finds and expires subscriptions past their `current_period_end`
- Ensures licenses expire even if webhooks fail

## 📝 Webhook Events Handled

| Event | Action | Updates |
|-------|--------|---------|
| `checkout.session.completed` | Subscription created | Creates subscription, sets period dates |
| `customer.subscription.updated` | Subscription changed | Updates status, period dates, cancellation flags |
| `customer.subscription.deleted` | Subscription canceled | Sets status = 'expired', canceled_at |
| `invoice.payment_succeeded` | Payment successful | Creates payment record, updates subscription period |
| `invoice.payment_failed` | Payment failed | Creates failed payment record, logs failure reason |

## 🎯 License Status Determination

The system determines license status using this priority:

1. **Active Subscription** (if all true):
   - `subscription.status = 'active'`
   - `current_period_end > NOW` (period hasn't ended)
   - `cancel_at_period_end = false` OR period hasn't ended yet

2. **Active Trial** (if subscription not active):
   - Device has `trial_started_at` and `trial_ended_at`
   - `NOW` is between trial start and end dates

3. **Expired** (otherwise):
   - No active subscription or trial
   - License has no access

## 📊 Payment History

All payments are stored in the `payments` table:

**Query Examples:**

```sql
-- Get all payments for a user
SELECT * FROM payments WHERE user_id = ? ORDER BY paid_at DESC;

-- Get successful payments
SELECT * FROM payments WHERE status = 'succeeded' AND user_id = ?;

-- Get failed payments
SELECT * FROM payments WHERE status = 'failed' AND user_id = ?;

-- Get payments for a subscription
SELECT * FROM payments WHERE subscription_id = ? ORDER BY paid_at DESC;
```

## 🔄 Reconciliation

The `ReconciliationService` periodically:
1. Queries Stripe for current subscription status
2. Compares with database status
3. Updates database to match Stripe (source of truth)
4. Never downgrades active subscription without Stripe confirmation

## ⚙️ Configuration

**Environment Variables:**
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `STRIPE_WEBHOOK_SECRET`: Webhook signature verification secret
- `STRIPE_PRICE_ID`: Stripe price ID for subscriptions

**Scheduled Jobs:**
- **License Expiration**: Runs every 60 minutes (configurable)
- **Reconciliation**: Runs every 6-24 hours (configurable)
- **Cleanup**: Runs every 24 hours (cleans old records)

## 📈 Benefits

1. **Complete Audit Trail**: All payments stored with full details
2. **Automatic Expiration**: Licenses expire automatically when period ends
3. **Payment History**: Users can see all their payment transactions
4. **Reliability**: Multiple mechanisms ensure licenses expire correctly:
   - Webhook updates
   - Scheduled expiration job
   - Real-time validation on license checks
5. **Idempotency**: Webhook retries won't cause duplicate records
6. **Reconciliation**: Handles webhook failures and syncs with Stripe

## 🚀 Usage

### Check License Status

```javascript
const licenseStatus = await LicenseService.getLicenseStatus(userId, deviceId);
// Returns: { status: 'active'|'trial'|'expired', expires_at, days_left }
```

### Get Payment History

```javascript
const payments = await Payment.findAll({
  where: { user_id: userId },
  order: [['paid_at', 'DESC']]
});
```

### Get Expiring Subscriptions

```javascript
const expiring = await LicenseExpirationService.getExpiringSoon(7); // Next 7 days
```

## 🔍 Monitoring

**Key Metrics to Monitor:**
- Number of active subscriptions
- Number of expiring subscriptions (next 7 days)
- Failed payment rate
- Webhook processing success rate
- Reconciliation discrepancies

**Admin Dashboard:**
- View all payments for a user
- See subscription period dates
- Monitor expiring licenses
- View payment failures
