import React, { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Divider,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'

function TrialConfig() {
  const [config, setConfig] = useState({
    trialDays: 14,
    maxDevicesPerUser: 3,
    deviceCreationRateLimit: 5,
    rateLimitWindowHours: 24,
  })
  const [saved, setSaved] = useState(false)

  const handleChange = (field) => (e) => {
    setConfig({ ...config, [field]: e.target.value })
    setSaved(false)
  }

  const handleSave = () => {
    // In a real app, this would call an API to save the configuration
    console.log('Saving config:', config)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Trial Configuration
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        These settings control the trial system behavior. Changes may require
        server restart.
      </Alert>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Trial Settings
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Trial Days"
            type="number"
            value={config.trialDays}
            onChange={handleChange('trialDays')}
            helperText="Number of days for the trial period (currently enforced as 14 days server-side)"
            inputProps={{ min: 1, max: 365 }}
          />
          <TextField
            label="Max Devices Per User"
            type="number"
            value={config.maxDevicesPerUser}
            onChange={handleChange('maxDevicesPerUser')}
            helperText="Maximum number of devices allowed per user (default for free users)"
            inputProps={{ min: 1, max: 100 }}
          />
          <TextField
            label="Device Creation Rate Limit"
            type="number"
            value={config.deviceCreationRateLimit}
            onChange={handleChange('deviceCreationRateLimit')}
            helperText="Maximum number of devices that can be created per rate limit window"
            inputProps={{ min: 1, max: 50 }}
          />
          <TextField
            label="Rate Limit Window (Hours)"
            type="number"
            value={config.rateLimitWindowHours}
            onChange={handleChange('rateLimitWindowHours')}
            helperText="Time window for device creation rate limiting"
            inputProps={{ min: 1, max: 168 }}
          />
        </Box>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          {saved && (
            <Alert severity="success" sx={{ flexGrow: 1 }}>
              Configuration saved successfully!
            </Alert>
          )}
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
          >
            Save Configuration
          </Button>
        </Box>
      </Paper>
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Current Server Configuration
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="textSecondary" paragraph>
          <strong>Trial Duration:</strong> 14 days (enforced by database constraint)
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          <strong>Device Cap:</strong> Configurable per user (default: 2-3 devices)
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          <strong>Rate Limiting:</strong> 5 devices per IP/user per 24 hours
        </Typography>
        <Typography variant="body2" color="textSecondary">
          <strong>Note:</strong> Some settings are enforced at the database level and
          require migration changes to modify.
        </Typography>
      </Paper>
    </Box>
  )
}

export default TrialConfig
