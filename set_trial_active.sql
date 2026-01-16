-- SQL Script to Set Device Trial to Active
-- Replace @device_id with your actual device ID

SET @device_id = 1;  -- CHANGE THIS to your device ID

-- Step 1: Find user associated with device
SET @user_id = (SELECT user_id FROM device_users WHERE device_id = @device_id LIMIT 1);

-- Step 2: Expire any active subscriptions (so trial can show)
UPDATE subscriptions
SET status = 'expired',
    updated_at = NOW()
WHERE user_id = @user_id
  AND status = 'active';

-- Step 3: Set trial dates (extend to 3 days from now to ensure it's active)
UPDATE devices
SET 
  trial_started_at = COALESCE(trial_started_at, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  trial_ended_at = DATE_ADD(NOW(), INTERVAL 3 DAY),  -- 3 days from now
  trial_consumed = 1,
  updated_at = NOW()
WHERE id = @device_id;

-- Step 4: Verify the result
SELECT 
  d.id,
  d.device_hash,
  d.trial_started_at,
  d.trial_ended_at,
  d.trial_consumed,
  NOW() as current_time,
  CASE 
    WHEN d.trial_started_at IS NULL OR d.trial_ended_at IS NULL THEN 'NO TRIAL DATES'
    WHEN NOW() < d.trial_started_at THEN 'TRIAL NOT STARTED YET'
    WHEN NOW() > d.trial_ended_at THEN 'TRIAL EXPIRED'
    WHEN NOW() >= d.trial_started_at AND NOW() <= d.trial_ended_at THEN 'TRIAL ACTIVE ✓'
    ELSE 'UNKNOWN STATUS'
  END as trial_status,
  DATEDIFF(d.trial_ended_at, NOW()) as days_remaining,
  u.email as user_email,
  (SELECT COUNT(*) FROM subscriptions WHERE user_id = u.id AND status = 'active') as active_subscriptions_count
FROM devices d
LEFT JOIN device_users du ON d.id = du.device_id
LEFT JOIN users u ON du.user_id = u.id
WHERE d.id = @device_id;
