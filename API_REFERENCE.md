# API Reference - License & Update Server

**Base URL:** `http://localhost:3000/api`

---

## Authentication

Most endpoints require a **lease token** (JWT) in the Authorization header:

```
Authorization: Bearer <lease_token>
X-Device-Id: <device_hash>
```

---

## Endpoints

### 1. Health Check

**GET** `/health`

**Description:** Check if server is running

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-13T12:00:00.000Z"
}
```

---

### 2. Register User-Device

**POST** `/auth/register`

**Description:** Register a new user-device pair and get initial license status

**Request Body:**
```json
{
  "email": "user@example.com",
  "device_hash": "hashed-device-identifier-64-chars-minimum"
}
```

**Response (200):**
```json
{
  "user_id": 1,
  "device_id": 1,
  "license_status": "trial",
  "trial_expires_at": "2026-01-27T12:00:00.000Z",
  "days_left": 14,
  "lease_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400` - Bad Request (missing fields, invalid email)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

**Rate Limit:** 5 registrations per IP per 24 hours

---

### 3. Get License Status

**GET** `/license/status`

**Description:** Get current license status and refresh lease token

**Headers:**
```
Authorization: Bearer <lease_token>
X-Device-Id: <device_hash>
```

**Response (200):**
```json
{
  "status": "trial",
  "expires_at": "2026-01-27T12:00:00.000Z",
  "days_left": 10,
  "lease_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Status Values:**
- `trial` - Active trial period
- `active` - Paid subscription active
- `expired` - Trial/subscription expired

**Error Responses:**
- `401` - Unauthorized (invalid/expired token)
- `404` - Not Found (device not found)
- `500` - Internal Server Error

**Token Expiry:** Lease tokens expire after 12-24 hours. Refresh regularly.

---

### 4. Check for Updates

**POST** `/update/check`

**Description:** Check if a newer app version is available

**Headers:**
```
Authorization: Bearer <lease_token>
X-Device-Id: <device_hash>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentVersion": "1.2.4",
  "currentBuild": 124,
  "platform": "mac",
  "arch": "arm64",
  "channel": "stable",
  "deviceId": "hashed-device-identifier"
}
```

**Platform Values:**
- `mac` - macOS
- `windows` - Windows
- `linux` - Linux

**Arch Values:**
- `x64` - 64-bit Intel/AMD
- `arm64` - 64-bit ARM (Apple Silicon, ARM Windows/Linux)

**Channel Values:**
- `stable` - Stable releases
- `beta` - Beta releases

**Response - No Update (200):**
```json
{
  "updateAvailable": false
}
```

**Response - Optional Update (200):**
```json
{
  "updateAvailable": true,
  "mandatory": false,
  "latestVersion": "1.3.0",
  "buildNumber": 130,
  "releaseNotes": "New features and bug fixes",
  "downloadUrl": "https://cdn.example.com/app-1.3.0.dmg"
}
```

**Response - Mandatory Update (200):**
```json
{
  "updateAvailable": true,
  "mandatory": true,
  "latestVersion": "1.4.0",
  "buildNumber": 140,
  "minSupportedBuild": 128,
  "message": "Your version is no longer supported. Please update to continue.",
  "downloadUrl": "https://cdn.example.com/app-1.4.0.dmg",
  "releaseNotes": "Critical security update"
}
```

**Error Responses:**
- `400` - Bad Request (invalid platform/arch/channel)
- `401` - Unauthorized (invalid/expired token)
- `500` - Internal Server Error

**Note:** Check once per day. Server uses build_number (not semver) for comparison.

---

### 5. Create Checkout Session

**POST** `/billing/create-checkout`

**Description:** Create Stripe checkout session for subscription

**Headers:**
```
Authorization: Bearer <lease_token>
X-Device-Id: <device_hash>
```

**Response (200):**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

**Error Responses:**
- `401` - Unauthorized (invalid/expired token)
- `409` - Conflict (subscription already active)
- `500` - Internal Server Error (Stripe/server error)

---

## Admin Endpoints

**Base URL:** `/admin`

**Authentication:** `X-Admin-Token: <admin_token>` header required

### 6. Create App Version

**POST** `/admin/versions`

**Description:** Create a new app version (admin only)

**Headers:**
```
X-Admin-Token: <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "platform": "mac",
  "arch": "arm64",
  "version": "1.3.0",
  "build_number": 130,
  "download_url": "https://cdn.example.com/app-1.3.0.dmg",
  "release_notes": "New features and bug fixes",
  "is_mandatory": false,
  "is_active": true,
  "rollout_percentage": 50,
  "min_supported_build": null,
  "channel": "stable"
}
```

**Response (201):**
```json
{
  "message": "Version created successfully",
  "version": {
    "id": 1,
    "platform": "mac",
    "arch": "arm64",
    "version": "1.3.0",
    "build_number": 130,
    "is_mandatory": false,
    "is_active": true,
    "rollout_percentage": 50,
    "channel": "stable"
  }
}
```

---

### 7. Update App Version

**PATCH** `/admin/versions/:id`

**Description:** Update an existing app version (admin only)

**Headers:**
```
X-Admin-Token: <admin_token>
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "is_active": false,
  "is_mandatory": true,
  "rollout_percentage": 100,
  "min_supported_build": 128,
  "download_url": "https://cdn.example.com/app-1.3.1.dmg"
}
```

**Response (200):**
```json
{
  "message": "Version updated successfully",
  "version": {
    "id": 1,
    "platform": "mac",
    "arch": "arm64",
    "version": "1.3.0",
    "build_number": 130,
    "is_mandatory": true,
    "is_active": false,
    "rollout_percentage": 100,
    "min_supported_build": 128,
    "channel": "stable"
  }
}
```

**Common Use Cases:**
- **Kill Switch:** Set `is_active: false` to disable version
- **Force Update:** Set `is_mandatory: true` and `rollout_percentage: 100`
- **Gradual Rollout:** Increase `rollout_percentage` from 0 to 100
- **Block Old Versions:** Set `min_supported_build` to minimum allowed build

---

### 8. List App Versions

**GET** `/admin/versions`

**Description:** List app versions with optional filters (admin only)

**Headers:**
```
X-Admin-Token: <admin_token>
```

**Query Parameters:**
- `platform` - Filter by platform (mac, windows, linux)
- `channel` - Filter by channel (stable, beta)
- `is_active` - Filter by active status (true, false)
- `arch` - Filter by architecture (x64, arm64)

**Example:**
```
GET /admin/versions?platform=mac&channel=stable&is_active=true
```

**Response (200):**
```json
{
  "versions": [
    {
      "id": 1,
      "platform": "mac",
      "arch": "arm64",
      "version": "1.3.0",
      "build_number": 130,
      "release_notes": "New features",
      "download_url": "https://cdn.example.com/app-1.3.0.dmg",
      "is_mandatory": false,
      "is_active": true,
      "rollout_percentage": 50,
      "min_supported_build": null,
      "channel": "stable",
      "created_at": "2026-01-13T12:00:00.000Z",
      "updated_at": "2026-01-13T12:00:00.000Z"
    }
  ]
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": {
    // Additional error details (optional)
  }
}
```

---

## Rate Limiting

- **Registration:** 5 requests per IP per 24 hours
- **License Status:** 100 requests per IP per minute
- **Update Check:** 10 requests per IP per minute
- **Admin APIs:** No rate limit (protected by admin token)

Rate limit exceeded responses include:
```json
{
  "error": "Rate Limit Exceeded",
  "message": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "type": "ip",
    "current": 5,
    "max": 5,
    "retryAfter": 86400000
  }
}
```

---

## Best Practices

1. **Token Management**
   - Refresh lease token every hour
   - Store token securely (keychain/credential manager)
   - Handle token expiry gracefully

2. **Update Checks**
   - Check once per day (not on every app launch)
   - Respect mandatory update flags
   - Verify download URLs before downloading

3. **Error Handling**
   - Implement retry logic with exponential backoff
   - Cache license status for offline use
   - Show user-friendly error messages

4. **Device Hash**
   - Generate consistent hash across installs
   - Use machine ID or hardware serial
   - Never send raw identifiers

5. **Network**
   - Implement timeout (10 seconds recommended)
   - Handle network failures gracefully
   - Use HTTPS in production

---

## Testing

### Test Server
```bash
# Start server
npm start

# Server runs on http://localhost:3000
```

### Test Endpoints
```bash
# Health check
curl http://localhost:3000/api/health

# Register (replace with real email and device hash)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","device_hash":"test-device-hash-64-chars-minimum"}'
```

---

## Production Configuration

### Server Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=visionai_desktop_license

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=24h

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Admin
ADMIN_TOKEN=your-secure-admin-token

# Server
PORT=3000
NODE_ENV=production
```

### Desktop App Configuration
```json
{
  "server": {
    "baseUrl": "https://api.yourdomain.com/api"
  }
}
```

---

## Support

For issues or questions:
1. Check error messages and status codes
2. Verify configuration is correct
3. Check server logs
4. Ensure database migrations are run
5. Verify environment variables are set
