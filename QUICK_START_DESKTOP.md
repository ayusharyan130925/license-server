# Quick Start - Desktop App Integration

## Server Information

**Base URL:** `http://localhost:3000/api`  
**Health Check:** `http://localhost:3000/api/health`

---

## Step 1: Copy Configuration File

Copy `desktop-app-config.json` to your desktop app project and rename as needed (e.g., `config.json`).

**Key Settings:**
```json
{
  "server": {
    "baseUrl": "http://localhost:3000/api"  // Change to production URL
  },
  "license": {
    "leaseTokenRefreshInterval": 3600000,  // Refresh token every hour
    "updateCheckInterval": 86400000         // Check updates once per day
  }
}
```

---

## Step 2: Install Dependencies

```bash
npm install axios
# or
npm install node-machine-id  # For device identification
```

---

## Step 3: Generate Device Hash

```javascript
const crypto = require('crypto');
const { machineIdSync } = require('node-machine-id');

function getDeviceHash() {
  const machineId = machineIdSync();
  return crypto.createHash('sha256')
    .update(machineId)
    .digest('hex');
}
```

**Important:** Device hash must be consistent across app installs/uninstalls.

---

## Step 4: Register Device

```javascript
const axios = require('axios');

async function registerDevice(email, deviceHash) {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/register', {
      email: email,
      device_hash: deviceHash
    });
    
    return {
      leaseToken: response.data.lease_token,
      licenseStatus: response.data.license_status,
      daysLeft: response.data.days_left
    };
  } catch (error) {
    console.error('Registration failed:', error.response?.data || error.message);
    throw error;
  }
}
```

---

## Step 5: Check License Status

```javascript
async function checkLicenseStatus(leaseToken, deviceHash) {
  try {
    const response = await axios.get('http://localhost:3000/api/license/status', {
      headers: {
        'Authorization': `Bearer ${leaseToken}`,
        'X-Device-Id': deviceHash
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('License check failed:', error.response?.data || error.message);
    throw error;
  }
}
```

---

## Step 6: Check for Updates

```javascript
async function checkForUpdate(leaseToken, deviceHash, currentVersion, currentBuild) {
  try {
    const platform = process.platform === 'darwin' ? 'mac' : 
                     process.platform === 'win32' ? 'windows' : 'linux';
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
    
    const response = await axios.post('http://localhost:3000/api/update/check', {
      currentVersion: currentVersion,
      currentBuild: currentBuild,
      platform: platform,
      arch: arch,
      channel: 'stable',
      deviceId: deviceHash
    }, {
      headers: {
        'Authorization': `Bearer ${leaseToken}`,
        'X-Device-Id': deviceHash
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Update check failed:', error.response?.data || error.message);
    return { updateAvailable: false };
  }
}
```

---

## Step 7: Complete Example

```javascript
const axios = require('axios');
const { machineIdSync } = require('node-machine-id');
const crypto = require('crypto');

const API_BASE_URL = 'http://localhost:3000/api';

class LicenseClient {
  constructor() {
    this.deviceHash = this.getDeviceHash();
    this.leaseToken = null;
  }

  getDeviceHash() {
    const machineId = machineIdSync();
    return crypto.createHash('sha256')
      .update(machineId)
      .digest('hex');
  }

  async register(email) {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      email,
      device_hash: this.deviceHash
    });
    
    this.leaseToken = response.data.lease_token;
    return response.data;
  }

  async getLicenseStatus() {
    if (!this.leaseToken) {
      throw new Error('Not registered. Call register() first.');
    }

    const response = await axios.get(`${API_BASE_URL}/license/status`, {
      headers: {
        'Authorization': `Bearer ${this.leaseToken}`,
        'X-Device-Id': this.deviceHash
      }
    });
    
    this.leaseToken = response.data.lease_token; // Update token
    return response.data;
  }

  async checkForUpdate(currentVersion, currentBuild) {
    if (!this.leaseToken) {
      throw new Error('Not registered. Call register() first.');
    }

    const platform = process.platform === 'darwin' ? 'mac' : 
                     process.platform === 'win32' ? 'windows' : 'linux';
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64';

    const response = await axios.post(`${API_BASE_URL}/update/check`, {
      currentVersion,
      currentBuild,
      platform,
      arch,
      channel: 'stable',
      deviceId: this.deviceHash
    }, {
      headers: {
        'Authorization': `Bearer ${this.leaseToken}`,
        'X-Device-Id': this.deviceHash
      }
    });
    
    return response.data;
  }
}

// Usage
async function main() {
  const client = new LicenseClient();
  
  // Register
  const registration = await client.register('user@example.com');
  console.log('Registered:', registration.license_status);
  
  // Check license
  const status = await client.getLicenseStatus();
  console.log('License status:', status.status, 'Days left:', status.days_left);
  
  // Check for updates
  const update = await client.checkForUpdate('1.2.4', 124);
  if (update.updateAvailable) {
    console.log('Update available:', update.latestVersion);
  }
}

main().catch(console.error);
```

---

## Configuration Reference

### Server Configuration
```json
{
  "server": {
    "baseUrl": "http://localhost:3000/api",  // API base URL
    "timeout": 10000,                         // Request timeout (ms)
    "retryAttempts": 3,                       // Number of retries
    "retryDelay": 1000                        // Delay between retries (ms)
  }
}
```

### License Configuration
```json
{
  "license": {
    "leaseTokenRefreshInterval": 3600000,     // Refresh token every hour
    "updateCheckInterval": 86400000,          // Check updates once per day
    "gracePeriod": 7200000                   // Offline grace period (2 hours)
  }
}
```

### Update Configuration
```json
{
  "update": {
    "enabled": true,                          // Enable update checks
    "checkInterval": 86400000,               // Check interval (24 hours)
    "channel": "stable"                       // Release channel (stable/beta)
  }
}
```

---

## Common Issues

### 1. "Invalid lease token"
- Token expired (refresh every hour)
- Token not set in headers
- **Solution:** Call `getLicenseStatus()` to refresh token

### 2. "Rate Limit Exceeded"
- Too many registration attempts
- **Solution:** Wait 24 hours or use different IP

### 3. "Device not found"
- Device not registered
- **Solution:** Call `register()` first

### 4. Network Errors
- Server not running
- Wrong base URL
- **Solution:** Check server health at `/api/health`

---

## Next Steps

1. Read `DESKTOP_APP_INTEGRATION.md` for detailed implementation
2. Read `API_REFERENCE.md` for complete API documentation
3. Implement token refresh logic
4. Add update download/installation logic
5. Handle offline scenarios
6. Test with production server

---

## Production Checklist

- [ ] Change `baseUrl` to production URL
- [ ] Use HTTPS in production
- [ ] Store lease token securely (keychain)
- [ ] Implement proper error handling
- [ ] Add retry logic
- [ ] Handle offline scenarios
- [ ] Test all API endpoints
- [ ] Set up update CDN
- [ ] Configure logging
