# Quick Start Guide

## 🚀 Server is Running!

Your server is now running at: **http://localhost:3000**

## 📋 Available APIs

### 1. **Health Check** (Test if server is running)
```
GET http://localhost:3000/api/health
```

### 2. **Register User-Device** (Start here!)
```
POST http://localhost:3000/api/auth/register
```

### 3. **Check License Status**
```
GET http://localhost:3000/api/license/status
```

### 4. **Create Stripe Checkout**
```
POST http://localhost:3000/api/billing/create-checkout
```

---

## 🧪 Quick Test

### Option 1: Use the Test Script (Easiest)

```bash
npm run test-api
```

This will automatically test all endpoints!

### Option 2: Manual Testing with cURL

**Step 1: Register a user-device pair**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "device_hash": "test_device_hash_1234567890123456789012345678901234567890123456789012345678901234"
  }'
```

**Save the `lease_token` from the response!**

**Step 2: Check license status**
```bash
curl -X GET http://localhost:3000/api/license/status \
  -H "Authorization: Bearer YOUR_LEASE_TOKEN_HERE" \
  -H "X-Device-Id: test_device_hash_1234567890123456789012345678901234567890123456789012345678901234"
```

### Option 3: Use the Shell Script

```bash
./test-api.sh
```

(Requires `jq` for JSON formatting: `brew install jq`)

---

## 📝 Typical Workflow

1. **First Time User:**
   - Call `/api/auth/register` with email and device_hash
   - Server automatically starts 14-day trial
   - Returns `lease_token`

2. **Check License:**
   - Call `/api/license/status` with `lease_token` and `device_hash`
   - Returns current status (trial/active/expired) and days remaining

3. **Subscribe (when trial expires):**
   - Call `/api/billing/create-checkout` to get Stripe checkout URL
   - User completes payment in Stripe
   - Webhook updates subscription status automatically

---

## 🔧 Before Running Migrations

Make sure you've run the database migrations:

```bash
npm run migrate
```

This creates all the required tables in your database.

---

## 📚 Full Documentation

See `API_DOCUMENTATION.md` for complete API reference with all request/response examples.

---

## 🐛 Troubleshooting

**Server won't start?**
- Check `.env` file has all required variables
- Verify MySQL is running
- Ensure database `visionai_desktop_license` exists

**API returns 401 Unauthorized?**
- Make sure you're sending the `lease_token` in Authorization header
- Token might be expired (tokens last 24 hours by default)

**API returns 400 Bad Request?**
- Check request body format matches examples
- Verify `device_hash` is at least 32 characters
