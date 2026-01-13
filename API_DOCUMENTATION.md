# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Available Endpoints

### 1. Health Check
**GET** `/api/health`

Check if the server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-13T09:04:00.501Z"
}
```

---

### 2. Register User-Device Pair
**POST** `/api/auth/register`

Register a new user-device pair and start trial if eligible.

**Request Body:**
```json
{
  "email": "user@example.com",
  "device_hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
}
```

**Response (Trial Started):**
```json
{
  "success": true,
  "license_status": "trial",
  "trial_expires_at": "2024-01-27T09:04:00.501Z",
  "days_left": 14,
  "lease_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Trial Already Consumed):**
```json
{
  "success": true,
  "license_status": "expired",
  "trial_expires_at": null,
  "days_left": 0,
  "lease_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "device_hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
  }'
```

---

### 3. Get License Status
**GET** `/api/license/status`

Get current license status for authenticated device.

**Headers:**
- `Authorization: Bearer <lease_token>`
- `X-Device-Id: <device_hash>`

**Response:**
```json
{
  "status": "trial",
  "expires_at": "2024-01-27T09:04:00.501Z",
  "days_left": 10,
  "lease_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/license/status \
  -H "Authorization: Bearer YOUR_LEASE_TOKEN_HERE" \
  -H "X-Device-Id: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
```

---

### 4. Create Stripe Checkout Session
**POST** `/api/billing/create-checkout`

Create a Stripe Checkout Session for subscription.

**Headers:**
- `Authorization: Bearer <lease_token>`
- `X-Device-Id: <device_hash>`

**Response:**
```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "session_id": "cs_test_..."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/billing/create-checkout \
  -H "Authorization: Bearer YOUR_LEASE_TOKEN_HERE" \
  -H "X-Device-Id: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
```

---

### 5. Stripe Webhook
**POST** `/api/stripe/webhook`

Stripe webhook endpoint (configure in Stripe Dashboard).

**Note:** This endpoint requires Stripe signature verification and should be configured in your Stripe Dashboard.

---

## Testing Flow

### Step 1: Register a User-Device Pair
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "device_hash": "test_device_hash_12345678901234567890123456789012"
  }'
```

**Save the `lease_token` from the response.**

### Step 2: Check License Status
```bash
curl -X GET http://localhost:3000/api/license/status \
  -H "Authorization: Bearer YOUR_LEASE_TOKEN_FROM_STEP_1" \
  -H "X-Device-Id: test_device_hash_12345678901234567890123456789012"
```

### Step 3: Create Checkout (if you have Stripe configured)
```bash
curl -X POST http://localhost:3000/api/billing/create-checkout \
  -H "Authorization: Bearer YOUR_LEASE_TOKEN_FROM_STEP_1" \
  -H "X-Device-Id: test_device_hash_12345678901234567890123456789012"
```

---

## Device Hash Format

The `device_hash` should be a SHA-256 hash (64 character hex string). In your Electron app, generate it like:

```javascript
const crypto = require('crypto');
const os = require('os');

function generateDeviceHash() {
  const machineId = os.hostname() + os.platform() + os.arch();
  return crypto.createHash('sha256').update(machineId).digest('hex');
}
```

For testing, you can use any 64-character hex string.

---

## Error Responses

All endpoints return consistent error formats:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

**Common Status Codes:**
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (device mismatch)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
