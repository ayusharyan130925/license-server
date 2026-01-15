# Configuration Guide - Desktop App

## Overview

This guide explains all configuration options available in the desktop app configuration file (`desktop-app-config.json`).

---

## License Configuration

### `trialDays`

**Type:** `number`  
**Default:** `14`  
**Description:** Number of days for the trial period

**Usage:**
- Used for client-side display (e.g., "14 days remaining")
- Used for client-side validation and UI updates
- **Note:** Server enforces the actual trial duration (currently 14 days server-side)
- This value should match the server's trial duration for accurate display

**Example:**
```json
{
  "license": {
    "trialDays": 14
  }
}
```

---

### `leaseTokenRefreshInterval`

**Type:** `number` (milliseconds)  
**Default:** `3600000` (1 hour)  
**Description:** How often to refresh the JWT lease token

**Usage:**
- Lease tokens expire after 12-24 hours
- Must refresh before expiry to maintain access
- Recommended: 1 hour (3600000 ms)
- Shorter intervals = more frequent refreshes (more server load)
- Longer intervals = risk of token expiry

**Example:**
```json
{
  "license": {
    "leaseTokenRefreshInterval": 3600000  // 1 hour
  }
}
```

**Common Values:**
- `3600000` = 1 hour (recommended)
- `1800000` = 30 minutes (more frequent)
- `7200000` = 2 hours (less frequent)

---

### `licenseCheckInterval`

**Type:** `number` (milliseconds)  
**Default:** `3600000` (1 hour)  
**Description:** How often to check license status (trial vs payment/active)

**Usage:**
- Determines how frequently the app verifies if the user is:
  - Still on trial
  - Has an active paid subscription
  - Has expired (trial or subscription)
- Used to detect status transitions:
  - Trial → Active (user upgraded)
  - Trial → Expired (trial ended)
  - Active → Expired (subscription canceled)
- Triggers UI updates when status changes

**Recommended Settings:**

**Production (Normal Use):**
```json
{
  "license": {
    "licenseCheckInterval": 3600000  // 1 hour - good balance
  }
}
```

**Development/Testing:**
```json
{
  "license": {
    "licenseCheckInterval": 60000  // 1 minute - faster updates for testing
  }
}
```

**Low-Frequency (Reduce Server Load):**
```json
{
  "license": {
    "licenseCheckInterval": 86400000  // 24 hours - check once per day
  }
}
```

**Example Implementation:**
```javascript
// Check license status periodically
setInterval(async () => {
  const status = await apiClient.getLicenseStatus();
  
  if (status.status === 'expired') {
    // Show upgrade prompt
    showUpgradePrompt();
  } else if (status.status === 'active' && previousStatus === 'trial') {
    // User upgraded - show success
    showUpgradeSuccess();
  }
}, config.get('license.licenseCheckInterval'));
```

---

### `updateCheckInterval`

**Type:** `number` (milliseconds)  
**Default:** `86400000` (24 hours)  
**Description:** How often to check for app updates

**Usage:**
- Checks if a newer version is available
- Recommended: Once per day (86400000 ms)
- Can be set to more frequent for beta/testing

**Example:**
```json
{
  "license": {
    "updateCheckInterval": 86400000  // 24 hours
  }
}
```

---

### `gracePeriod`

**Type:** `number` (milliseconds)  
**Default:** `7200000` (2 hours)  
**Description:** Offline grace period when server is unreachable

**Usage:**
- App can continue functioning during this period if last license check was valid
- Prevents app from blocking immediately on network errors
- Should be shorter than `licenseCheckInterval` to ensure timely validation

**Example:**
```json
{
  "license": {
    "gracePeriod": 7200000  // 2 hours
  }
}
```

---

## Complete Configuration Example

```json
{
  "server": {
    "baseUrl": "http://localhost:3000/api",
    "timeout": 10000,
    "retryAttempts": 3,
    "retryDelay": 1000
  },
  "license": {
    "trialDays": 14,
    "leaseTokenRefreshInterval": 3600000,
    "licenseCheckInterval": 3600000,
    "updateCheckInterval": 86400000,
    "gracePeriod": 7200000
  },
  "update": {
    "enabled": true,
    "checkInterval": 86400000,
    "channel": "stable"
  },
  "device": {
    "hashAlgorithm": "sha256",
    "identifierFields": [
      "machineId",
      "serialNumber",
      "macAddress"
    ]
  },
  "logging": {
    "level": "info",
    "logApiCalls": true
  }
}
```

---

## Configuration Scenarios

### Scenario 1: Production App (Standard)

**Goal:** Balance between real-time updates and server load

```json
{
  "license": {
    "trialDays": 14,
    "leaseTokenRefreshInterval": 3600000,    // 1 hour
    "licenseCheckInterval": 3600000,         // 1 hour
    "updateCheckInterval": 86400000,         // 24 hours
    "gracePeriod": 7200000                   // 2 hours
  }
}
```

**Result:**
- License status checked every hour
- Token refreshed every hour
- Updates checked once per day
- 2-hour offline grace period

---

### Scenario 2: Development/Testing

**Goal:** Fast updates for testing and debugging

```json
{
  "license": {
    "trialDays": 14,
    "leaseTokenRefreshInterval": 60000,      // 1 minute
    "licenseCheckInterval": 60000,           // 1 minute
    "updateCheckInterval": 300000,          // 5 minutes
    "gracePeriod": 120000                    // 2 minutes
  }
}
```

**Result:**
- License status checked every minute
- Token refreshed every minute
- Updates checked every 5 minutes
- 2-minute offline grace period

---

### Scenario 3: Low Server Load

**Goal:** Minimize API calls to reduce server load

```json
{
  "license": {
    "trialDays": 14,
    "leaseTokenRefreshInterval": 7200000,    // 2 hours
    "licenseCheckInterval": 86400000,         // 24 hours
    "updateCheckInterval": 172800000,         // 48 hours
    "gracePeriod": 14400000                   // 4 hours
  }
}
```

**Result:**
- License status checked once per day
- Token refreshed every 2 hours
- Updates checked every 2 days
- 4-hour offline grace period

---

## Best Practices

1. **`licenseCheckInterval` should be ≤ `leaseTokenRefreshInterval`**
   - License checks also refresh the token
   - Avoids redundant API calls

2. **`gracePeriod` should be < `licenseCheckInterval`**
   - Ensures timely validation
   - Prevents extended offline usage

3. **Production Settings:**
   - Use 1-hour intervals for good balance
   - Check updates once per day
   - 2-hour grace period is reasonable

4. **Development Settings:**
   - Use shorter intervals (1-5 minutes) for faster testing
   - Can check updates more frequently

5. **Monitor API Usage:**
   - Track how many API calls your app makes
   - Adjust intervals based on server load
   - Consider rate limiting on client side

---

## Time Conversion Reference

| Milliseconds | Time |
|--------------|------|
| 60000 | 1 minute |
| 300000 | 5 minutes |
| 600000 | 10 minutes |
| 1800000 | 30 minutes |
| 3600000 | 1 hour |
| 7200000 | 2 hours |
| 14400000 | 4 hours |
| 43200000 | 12 hours |
| 86400000 | 24 hours (1 day) |
| 172800000 | 48 hours (2 days) |

---

## Troubleshooting

### Issue: License status not updating quickly enough

**Solution:** Reduce `licenseCheckInterval`
```json
{
  "license": {
    "licenseCheckInterval": 60000  // Check every minute
  }
}
```

### Issue: Too many API calls

**Solution:** Increase intervals
```json
{
  "license": {
    "leaseTokenRefreshInterval": 7200000,    // 2 hours
    "licenseCheckInterval": 86400000         // 24 hours
  }
}
```

### Issue: App blocks immediately on network error

**Solution:** Increase `gracePeriod`
```json
{
  "license": {
    "gracePeriod": 14400000  // 4 hours
  }
}
```

---

## Summary

- **`trialDays`**: Display value for trial duration (should match server)
- **`leaseTokenRefreshInterval`**: How often to refresh JWT token (recommended: 1 hour)
- **`licenseCheckInterval`**: How often to check trial/payment status (recommended: 1 hour)
- **`updateCheckInterval`**: How often to check for updates (recommended: 24 hours)
- **`gracePeriod`**: Offline grace period (recommended: 2 hours)

All intervals are in milliseconds. Adjust based on your app's requirements and server capacity.
