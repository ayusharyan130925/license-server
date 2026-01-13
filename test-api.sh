#!/bin/bash

# API Testing Script for VisionAI License Server
# Make sure the server is running on http://localhost:3000

BASE_URL="http://localhost:3000/api"
DEVICE_HASH="test_device_hash_1234567890123456789012345678901234567890123456789012345678901234"

echo "=========================================="
echo "VisionAI License Server API Testing"
echo "=========================================="
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
curl -s -X GET "$BASE_URL/health" | jq .
echo ""
echo "---"
echo ""

# Test 2: Register User-Device
echo "2. Registering User-Device Pair..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test@example.com\",
    \"device_hash\": \"$DEVICE_HASH\"
  }")

echo "$REGISTER_RESPONSE" | jq .

# Extract lease token
LEASE_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.lease_token')

if [ "$LEASE_TOKEN" = "null" ] || [ -z "$LEASE_TOKEN" ]; then
  echo "❌ Failed to get lease token. Exiting."
  exit 1
fi

echo ""
echo "✓ Lease Token: ${LEASE_TOKEN:0:50}..."
echo ""
echo "---"
echo ""

# Test 3: Check License Status
echo "3. Checking License Status..."
curl -s -X GET "$BASE_URL/license/status" \
  -H "Authorization: Bearer $LEASE_TOKEN" \
  -H "X-Device-Id: $DEVICE_HASH" | jq .
echo ""
echo "---"
echo ""

# Test 4: Create Checkout (if Stripe is configured)
echo "4. Creating Stripe Checkout Session..."
CHECKOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/billing/create-checkout" \
  -H "Authorization: Bearer $LEASE_TOKEN" \
  -H "X-Device-Id: $DEVICE_HASH")

echo "$CHECKOUT_RESPONSE" | jq .

if echo "$CHECKOUT_RESPONSE" | jq -e '.checkout_url' > /dev/null 2>&1; then
  CHECKOUT_URL=$(echo "$CHECKOUT_RESPONSE" | jq -r '.checkout_url')
  echo ""
  echo "✓ Checkout URL: $CHECKOUT_URL"
else
  echo ""
  echo "⚠ Stripe not configured or error occurred"
fi

echo ""
echo "=========================================="
echo "Testing Complete!"
echo "=========================================="
