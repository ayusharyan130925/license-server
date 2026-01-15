# Abuse Detection System Improvements

## Summary of Changes

This document outlines the improvements made to the abuse detection system for cleaner database management, better performance, and enhanced monitoring.

---

## 1. ✅ Lazy Creation of Rate Limit Records

**What Changed:**
- Rate limit records are now created **only when the first device is created that day**
- Uses optimized `findOrCreate` with proper locking to prevent race conditions
- Reduces database bloat by not creating empty records

**Implementation:**
- Updated `getOrCreateRateLimit()` in `abuseDetectionService.js`
- First tries to find existing record (fast lookup with index)
- Only creates new record when needed (lazy creation)
- Handles day rollover by resetting old records

**Benefits:**
- Cleaner database (no empty rate limit rows)
- Better performance (fewer rows to scan)
- Same functionality with less storage

---

## 2. ✅ Auto Cleanup Job for Old Windows

**What Changed:**
- Automatic cleanup job runs periodically to remove old records
- Cleans up old rate limit windows (default: 7 days retention)
- Cleans up old risk events (default: 90 days retention)
- Runs on server startup and then on schedule

**Implementation:**
- Created `CleanupService` (`src/services/cleanupService.js`)
- Integrated into server startup (`src/server.js`)
- Configurable retention periods via environment variables

**Configuration:**
```env
# Cleanup retention periods
RATE_LIMIT_RETENTION_DAYS=7
RISK_EVENT_RETENTION_DAYS=90
CLEANUP_INTERVAL_HOURS=24
```

**API Endpoint:**
- `POST /api/admin/abuse/cleanup` - Manually trigger cleanup

**Benefits:**
- Automatic database maintenance
- Prevents unbounded growth
- Configurable retention for compliance

---

## 3. ✅ Additional Indexes for Faster Lookup

**What Changed:**
- Added 6 new indexes for improved query performance
- Optimized for abuse detection queries and metrics

**New Indexes:**
1. `idx_risk_events_created_at` - Time-based risk event queries
2. `idx_risk_events_type_date` - Filter by type and date
3. `idx_device_limits_identifier` - Fast identifier lookups
4. `idx_device_limits_type_window` - Type and window queries
5. `idx_device_users_created_at` - Churn detection queries
6. `idx_device_users_user_created` - User device creation history

**Migration:**
- `20240101000014-add-abuse-indexes.js`
- Run: `npm run migrate`

**Benefits:**
- Faster abuse detection checks
- Faster metrics queries
- Better performance at scale

---

## 4. ✅ Max Device Threshold Tuning

**What Changed:**
- All thresholds are now configurable via environment variables
- Can be adjusted without code changes
- Defaults provided for all settings

**Configurable Thresholds:**
```env
# Device limits
DEFAULT_MAX_DEVICES_PER_USER=2
MAX_DEVICES_PER_IP_PER_24H=5
MAX_DEVICES_PER_USER_PER_24H=3
DEVICE_CHURN_THRESHOLD=5

# Cleanup settings
RATE_LIMIT_RETENTION_DAYS=7
RISK_EVENT_RETENTION_DAYS=90
CLEANUP_INTERVAL_HOURS=24
```

**API Endpoint:**
- `GET /api/admin/abuse/config` - View current configuration

**Benefits:**
- Easy tuning without code changes
- Environment-specific configurations
- A/B testing capabilities

---

## 5. ✅ Abuse Metrics Visualization

**What Changed:**
- New admin UI page for abuse metrics
- API endpoints for metrics data
- Real-time statistics and visualizations

**New API Endpoints:**
- `GET /api/admin/abuse/metrics` - Get comprehensive abuse metrics
- `GET /api/admin/abuse/risk-events` - Get recent risk events
- `GET /api/admin/abuse/config` - Get current configuration
- `POST /api/admin/abuse/cleanup` - Trigger cleanup manually

**New UI Page:**
- `/abuse-metrics` - Full abuse detection dashboard

**Features:**
- Risk event statistics (total, by type)
- Device creation statistics
- Top IPs by risk events
- Top users by risk events
- Recent risk events table
- Configuration display
- Manual cleanup trigger
- Time period filtering (1, 7, 30, 90 days)

**Benefits:**
- Real-time visibility into abuse patterns
- Better decision making
- Proactive threat detection
- Compliance reporting

---

## Database Changes

### New Migration
- `20240101000014-add-abuse-indexes.js` - Adds performance indexes

### Run Migrations
```bash
npm run migrate
```

---

## Environment Variables

Add to your `.env` file:

```env
# Abuse Detection Configuration
DEFAULT_MAX_DEVICES_PER_USER=2
MAX_DEVICES_PER_IP_PER_24H=5
MAX_DEVICES_PER_USER_PER_24H=3
DEVICE_CHURN_THRESHOLD=5

# Cleanup Configuration
RATE_LIMIT_RETENTION_DAYS=7
RISK_EVENT_RETENTION_DAYS=90
CLEANUP_INTERVAL_HOURS=24
```

---

## API Usage Examples

### Get Abuse Metrics
```bash
curl -X GET http://localhost:3000/api/admin/abuse/metrics \
  -H "X-Admin-Token: your-admin-token"
```

### Get Recent Risk Events
```bash
curl -X GET "http://localhost:3000/api/admin/abuse/risk-events?limit=50" \
  -H "X-Admin-Token: your-admin-token"
```

### Trigger Cleanup
```bash
curl -X POST http://localhost:3000/api/admin/abuse/cleanup \
  -H "X-Admin-Token: your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "rateLimitRetentionDays": 7,
    "riskEventRetentionDays": 90
  }'
```

### Get Configuration
```bash
curl -X GET http://localhost:3000/api/admin/abuse/config \
  -H "X-Admin-Token: your-admin-token"
```

---

## UI Access

Navigate to: `http://localhost:5173/abuse-metrics`

Features:
- View risk event statistics
- View device creation patterns
- See top IPs and users by risk events
- Filter by event type and time period
- Trigger manual cleanup
- View current configuration

---

## Performance Improvements

### Before:
- All rate limit records created upfront
- No automatic cleanup
- Limited indexes
- Manual threshold changes

### After:
- Lazy creation (only when needed)
- Automatic cleanup job
- 6 additional indexes
- Configurable thresholds
- Real-time metrics dashboard

---

## Monitoring Recommendations

1. **Monitor Cleanup Job:**
   - Check server logs for cleanup completion
   - Verify records are being deleted as expected

2. **Monitor Metrics:**
   - Review abuse metrics dashboard regularly
   - Watch for unusual patterns in risk events
   - Track device creation rates

3. **Tune Thresholds:**
   - Adjust based on actual usage patterns
   - Balance security vs. user experience
   - Monitor false positive rates

---

## Next Steps

1. Run migrations: `npm run migrate`
2. Set environment variables in `.env`
3. Restart server to enable cleanup job
4. Access abuse metrics UI at `/abuse-metrics`
5. Monitor and tune thresholds as needed

---

## Summary

✅ **Lazy Creation** - Records created only when needed  
✅ **Auto Cleanup** - Periodic cleanup of old records  
✅ **Performance Indexes** - 6 new indexes for faster queries  
✅ **Configurable Thresholds** - All limits tunable via env vars  
✅ **Metrics Dashboard** - Full visualization of abuse patterns  

The system is now production-ready with better performance, cleaner database, and comprehensive monitoring.
