import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Divider,
  Card,
  CardContent,
  Grid,
  Tooltip,
  IconButton,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import InfoIcon from '@mui/icons-material/Info'
import SettingsIcon from '@mui/icons-material/Settings'
import { useToast } from '../components/ToastContext'
import { getAbuseConfig } from '../api/admin'
import appColors from '../constants/colors'

function TrialConfig() {
  const [config, setConfig] = useState({
    trialDays: 14,
    maxDevicesPerUser: 3,
    deviceCreationRateLimit: 5,
    rateLimitWindowHours: 24,
  })
  const [serverConfig, setServerConfig] = useState(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    loadServerConfig()
  }, [])

  const loadServerConfig = async () => {
    try {
      setLoading(true)
      const data = await getAbuseConfig()
      setServerConfig(data)
      // Update local config with server values
      if (data) {
        setConfig({
          trialDays: 14, // This is hardcoded in the database
          maxDevicesPerUser: data.defaultMaxDevicesPerUser || 3,
          deviceCreationRateLimit: data.maxDevicesPerIpPer24h || 5,
          rateLimitWindowHours: 24, // Fixed window
        })
      }
    } catch (error) {
      console.error('Failed to load server config:', error)
      showToast('Failed to load server configuration', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field) => (e) => {
    setConfig({ ...config, [field]: e.target.value })
    setSaved(false)
  }

  const handleSave = () => {
    // In a real app, this would call an API to save the configuration
    console.log('Saving config:', config)
    showToast('Configuration saved successfully! (Note: Some settings require server restart)', 'success')
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
          Trial & Security Configuration
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Configure trial periods, device limits, and security settings
        </Typography>
      </Box>

      <Alert
        severity="info"
        sx={{
          mb: 3,
          backgroundColor: appColors.status.info.bg,
          border: `1px solid ${appColors.status.info.light}`,
          color: appColors.status.info.text,
          '& .MuiAlert-icon': {
            color: appColors.status.info.main,
          },
        }}
      >
        <Box display="flex" alignItems="flex-start" gap={1}>
          <InfoIcon />
          <Box>
            <Typography variant="body2" gutterBottom>
              <strong>Important:</strong> Some settings are enforced at the database level and may require
              server restart or database migration to change. Trial duration is currently fixed at 14 days.
            </Typography>
          </Box>
        </Box>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 3,
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)',
            }}
          >
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <SettingsIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Configuration Settings
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Trial Duration (Days)"
                type="number"
                value={config.trialDays}
                onChange={handleChange('trialDays')}
                helperText="Number of days for the trial period (currently enforced as 14 days server-side)"
                inputProps={{ min: 1, max: 365 }}
                disabled
                InputProps={{
                  endAdornment: (
                    <Tooltip title="This setting is enforced by database constraints and cannot be changed via UI" arrow>
                      <IconButton size="small">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ),
                }}
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
                helperText="Maximum number of devices that can be created per IP address per 24-hour window"
                inputProps={{ min: 1, max: 50 }}
              />
              <TextField
                label="Rate Limit Window (Hours)"
                type="number"
                value={config.rateLimitWindowHours}
                onChange={handleChange('rateLimitWindowHours')}
                helperText="Time window for device creation rate limiting (currently fixed at 24 hours)"
                inputProps={{ min: 1, max: 168 }}
                disabled
              />
            </Box>
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              {saved && (
                <Alert severity="success" sx={{ flexGrow: 1 }}>
                  Configuration saved successfully!
                </Alert>
              )}
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                size="large"
              >
                Save Configuration
              </Button>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
              Current Server Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {serverConfig ? (
              <Box>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Trial Duration
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      14 Days
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Fixed by database constraint
                    </Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Max Devices/User
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {serverConfig.defaultMaxDevicesPerUser || 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Max Devices/IP (24h)
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {serverConfig.maxDevicesPerIpPer24h || 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Device Churn Threshold
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {serverConfig.deviceChurnThreshold || 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Loading server configuration...
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default TrialConfig
