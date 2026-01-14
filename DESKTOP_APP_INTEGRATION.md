# Desktop App Integration Guide

## Server Configuration

**Base URL:** `http://localhost:3000/api` (development)  
**Production URL:** `https://your-domain.com/api`

---

## Configuration File

Create a configuration file in your desktop app (e.g., `config.json` or `config.js`):

### Example: `config.json`

```json
{
  "server": {
    "baseUrl": "http://localhost:3000/api",
    "timeout": 10000,
    "retryAttempts": 3,
    "retryDelay": 1000
  },
  "license": {
    "leaseTokenRefreshInterval": 3600000,
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

## API Endpoints

### 1. Authentication & Registration

#### POST `/api/auth/register`

**Purpose:** Register user-device pair and get initial license status

**Request:**
```json
{
  "email": "user@example.com",
  "device_hash": "hashed-device-identifier"
}
```

**Response:**
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
- `400` - Invalid input (missing email/device_hash, invalid email format)
- `429` - Rate limit exceeded
- `500` - Server error

---

### 2. License Status

#### GET `/api/license/status`

**Purpose:** Get current license status and refresh lease token

**Headers:**
```
Authorization: Bearer <lease_token>
X-Device-Id: <device_hash>
```

**Response:**
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
- `401` - Invalid or expired token
- `404` - Device not found
- `500` - Server error

---

### 3. Update Check

#### POST `/api/update/check`

**Purpose:** Check if a newer app version is available

**Headers:**
```
Authorization: Bearer <lease_token>
X-Device-Id: <device_hash>
Content-Type: application/json
```

**Request:**
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

**Response (No Update):**
```json
{
  "updateAvailable": false
}
```

**Response (Optional Update):**
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

**Response (Mandatory Update):**
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
- `400` - Invalid request (invalid platform/arch/channel)
- `401` - Invalid or expired token
- `500` - Server error

---

### 4. Billing

#### POST `/api/billing/create-checkout`

**Purpose:** Create Stripe checkout session for subscription

**Headers:**
```
Authorization: Bearer <lease_token>
X-Device-Id: <device_hash>
```

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

**Error Responses:**
- `401` - Invalid or expired token
- `409` - Subscription already active
- `500` - Server/Stripe error

---

## Desktop App Implementation

### 1. Device Identification

**CRITICAL:** Device hash must be consistent across app installs/uninstalls.

**Example (Node.js/Electron):**
```javascript
const crypto = require('crypto');
const os = require('os');
const { machineIdSync } = require('node-machine-id');

function generateDeviceHash() {
  // Get machine-specific identifiers
  const identifiers = [
    machineIdSync(), // Machine ID (consistent across installs)
    os.hostname(),
    os.platform(),
    os.arch()
  ].join('|');

  // Hash the identifiers
  return crypto.createHash('sha256')
    .update(identifiers)
    .digest('hex');
}
```

**Important:**
- Use machine ID or hardware serial number
- Hash must be consistent (same device = same hash)
- Never store raw identifiers in client
- Hash should be 64+ characters

---

### 2. Configuration Management

**Example: `config.js`**
```javascript
const path = require('path');
const fs = require('fs');

class AppConfig {
  constructor() {
    this.configPath = path.join(
      app.getPath('userData'),
      'config.json'
    );
    this.config = this.loadConfig();
  }

  loadConfig() {
    const defaults = {
      server: {
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
        timeout: 10000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      license: {
        leaseTokenRefreshInterval: 3600000, // 1 hour
        updateCheckInterval: 86400000, // 24 hours
        gracePeriod: 7200000 // 2 hours
      },
      update: {
        enabled: true,
        checkInterval: 86400000, // 24 hours
        channel: 'stable'
      },
      device: {
        hashAlgorithm: 'sha256'
      },
      logging: {
        level: 'info',
        logApiCalls: true
      }
    };

    try {
      if (fs.existsSync(this.configPath)) {
        const fileData = fs.readFileSync(this.configPath, 'utf8');
        return { ...defaults, ...JSON.parse(fileData) };
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }

    return defaults;
  }

  saveConfig() {
    try {
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  get(key) {
    return key.split('.').reduce((obj, k) => obj?.[k], this.config);
  }

  set(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, k) => {
      if (!obj[k]) obj[k] = {};
      return obj[k];
    }, this.config);
    target[lastKey] = value;
    this.saveConfig();
  }
}

module.exports = new AppConfig();
```

---

### 3. API Client

**Example: `apiClient.js`**
```javascript
const axios = require('axios');
const config = require('./config');

class ApiClient {
  constructor() {
    this.baseURL = config.get('server.baseUrl');
    this.timeout = config.get('server.timeout');
    this.retryAttempts = config.get('server.retryAttempts');
    this.retryDelay = config.get('server.retryDelay');
    this.leaseToken = null;
    this.deviceHash = null;
  }

  setCredentials(leaseToken, deviceHash) {
    this.leaseToken = leaseToken;
    this.deviceHash = deviceHash;
  }

  async request(method, endpoint, data = null, retryCount = 0) {
    const headers = {
      'Content-Type': 'application/json'
    };

    // Add authentication if available
    if (this.leaseToken) {
      headers['Authorization'] = `Bearer ${this.leaseToken}`;
    }

    if (this.deviceHash) {
      headers['X-Device-Id'] = this.deviceHash;
    }

    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
        headers,
        data,
        timeout: this.timeout
      });

      return response.data;
    } catch (error) {
      // Retry logic
      if (retryCount < this.retryAttempts && this.shouldRetry(error)) {
        await this.delay(this.retryDelay);
        return this.request(method, endpoint, data, retryCount + 1);
      }

      throw this.handleError(error);
    }
  }

  shouldRetry(error) {
    // Retry on network errors or 5xx errors
    return !error.response || 
           (error.response.status >= 500 && error.response.status < 600);
  }

  handleError(error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.data?.message || error.message,
        data: error.response.data
      };
    }

    return {
      status: 0,
      message: error.message || 'Network error',
      data: null
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // API Methods
  async register(email, deviceHash) {
    return this.request('POST', '/auth/register', {
      email,
      device_hash: deviceHash
    });
  }

  async getLicenseStatus() {
    return this.request('GET', '/license/status');
  }

  async checkForUpdate(currentVersion, currentBuild, platform, arch, channel) {
    return this.request('POST', '/update/check', {
      currentVersion,
      currentBuild,
      platform,
      arch,
      channel,
      deviceId: this.deviceHash
    });
  }

  async createCheckout() {
    return this.request('POST', '/billing/create-checkout');
  }
}

module.exports = new ApiClient();
```

---

### 4. License Manager

**Example: `licenseManager.js`**
```javascript
const apiClient = require('./apiClient');
const config = require('./config');
const { generateDeviceHash } = require('./device');

class LicenseManager {
  constructor() {
    this.deviceHash = generateDeviceHash();
    this.leaseToken = null;
    this.licenseStatus = null;
    this.refreshInterval = null;
    this.updateCheckInterval = null;
  }

  async initialize(email) {
    try {
      // Register device
      const registration = await apiClient.register(email, this.deviceHash);
      
      this.leaseToken = registration.lease_token;
      this.licenseStatus = registration.license_status;
      
      apiClient.setCredentials(this.leaseToken, this.deviceHash);

      // Start token refresh
      this.startTokenRefresh();

      // Start update checks
      if (config.get('update.enabled')) {
        this.startUpdateChecks();
      }

      return {
        success: true,
        status: this.licenseStatus,
        trialExpiresAt: registration.trial_expires_at,
        daysLeft: registration.days_left
      };
    } catch (error) {
      console.error('License initialization failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async refreshToken() {
    try {
      const status = await apiClient.getLicenseStatus();
      this.leaseToken = status.lease_token;
      this.licenseStatus = status.status;
      apiClient.setCredentials(this.leaseToken, this.deviceHash);
      return status;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If token is invalid, may need to re-register
      if (error.status === 401) {
        // Handle re-authentication
      }
      throw error;
    }
  }

  startTokenRefresh() {
    const interval = config.get('license.leaseTokenRefreshInterval');
    
    this.refreshInterval = setInterval(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Token refresh error:', error);
      }
    }, interval);
  }

  async checkForUpdate() {
    try {
      const appVersion = require('./package.json').version;
      const buildNumber = parseInt(process.env.BUILD_NUMBER || '0');
      const platform = process.platform === 'darwin' ? 'mac' : 
                      process.platform === 'win32' ? 'windows' : 'linux';
      const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
      const channel = config.get('update.channel');

      const updateInfo = await apiClient.checkForUpdate(
        appVersion,
        buildNumber,
        platform,
        arch,
        channel
      );

      return updateInfo;
    } catch (error) {
      console.error('Update check failed:', error);
      return { updateAvailable: false };
    }
  }

  startUpdateChecks() {
    const interval = config.get('update.checkInterval');
    
    this.updateCheckInterval = setInterval(async () => {
      const updateInfo = await this.checkForUpdate();
      
      if (updateInfo.updateAvailable) {
        if (updateInfo.mandatory) {
          // Block app usage, force update
          this.handleMandatoryUpdate(updateInfo);
        } else {
          // Show optional update notification
          this.handleOptionalUpdate(updateInfo);
        }
      }
    }, interval);

    // Check immediately on startup
    this.checkForUpdate();
  }

  handleMandatoryUpdate(updateInfo) {
    // Show modal blocking app usage
    // Force user to download and install update
    console.log('Mandatory update required:', updateInfo);
    // Emit event or show UI
  }

  handleOptionalUpdate(updateInfo) {
    // Show notification about available update
    console.log('Optional update available:', updateInfo);
    // Emit event or show UI
  }

  isLicenseValid() {
    if (!this.licenseStatus) return false;
    
    if (this.licenseStatus === 'active') return true;
    if (this.licenseStatus === 'trial') {
      // Check if trial is still valid (server validates, but client can check too)
      return true;
    }
    
    return false;
  }

  stop() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }
  }
}

module.exports = new LicenseManager();
```

---

### 5. Usage Example

**Example: `main.js` (Electron)**
```javascript
const { app, BrowserWindow } = require('electron');
const licenseManager = require('./licenseManager');
const config = require('./config');

let mainWindow;

async function initializeApp() {
  // Load saved email or prompt user
  const email = config.get('user.email') || await promptForEmail();
  
  // Initialize license
  const licenseResult = await licenseManager.initialize(email);
  
  if (!licenseResult.success) {
    console.error('Failed to initialize license:', licenseResult.error);
    // Show error to user
    return;
  }

  // Check license status
  if (!licenseManager.isLicenseValid()) {
    console.error('License is not valid');
    // Show license expired message
    return;
  }

  // Create window
  createWindow();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  licenseManager.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

---

## Environment Variables

Create a `.env` file or set environment variables:

```bash
# API Configuration
API_BASE_URL=http://localhost:3000/api

# App Configuration
BUILD_NUMBER=124
APP_CHANNEL=stable

# Logging
LOG_LEVEL=info
```

---

## Error Handling

### Common Error Codes

- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (admin access required)
- `404` - Not Found
- `409` - Conflict (e.g., subscription already active)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Error Handling Strategy

```javascript
try {
  const result = await apiClient.getLicenseStatus();
} catch (error) {
  switch (error.status) {
    case 401:
      // Token expired, refresh or re-register
      await licenseManager.refreshToken();
      break;
    case 429:
      // Rate limited, wait and retry
      await delay(error.data?.retryAfter || 60000);
      break;
    case 500:
      // Server error, use cached license if available
      useCachedLicense();
      break;
    default:
      // Handle other errors
      showErrorToUser(error.message);
  }
}
```

---

## Security Best Practices

1. **Never store lease tokens in plain text**
   - Use secure storage (keychain/credential manager)
   - Encrypt sensitive data

2. **Validate server responses**
   - Check response structure
   - Verify download URLs are from trusted domains

3. **Handle network failures gracefully**
   - Cache license status locally
   - Implement grace period for offline usage

4. **Rate limiting**
   - Don't spam API endpoints
   - Respect retry-after headers

5. **Device hash security**
   - Never send raw device identifiers
   - Always hash before transmission

---

## Testing

### Test Configuration

```json
{
  "server": {
    "baseUrl": "http://localhost:3000/api",
    "timeout": 5000
  },
  "license": {
    "leaseTokenRefreshInterval": 60000,
    "updateCheckInterval": 60000
  },
  "update": {
    "enabled": true,
    "channel": "beta"
  }
}
```

### Test Checklist

- [ ] Registration with valid email
- [ ] Registration with invalid email (should fail)
- [ ] License status check
- [ ] Token refresh
- [ ] Update check (no update)
- [ ] Update check (optional update)
- [ ] Update check (mandatory update)
- [ ] Offline handling
- [ ] Error recovery
- [ ] Rate limiting handling

---

## Production Checklist

- [ ] Update `baseUrl` to production server
- [ ] Set secure `ADMIN_TOKEN` on server
- [ ] Configure SSL/TLS certificates
- [ ] Set up proper logging
- [ ] Configure error reporting
- [ ] Test all API endpoints
- [ ] Implement offline grace period
- [ ] Set up update CDN
- [ ] Configure rate limiting
- [ ] Test mandatory update flow
- [ ] Test kill switch functionality
