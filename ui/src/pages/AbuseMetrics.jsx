import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  MenuItem,
  Card,
  CardContent,
  Tooltip,
  Alert,
  Divider,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import SecurityIcon from '@mui/icons-material/Security'
import WarningIcon from '@mui/icons-material/Warning'
import BlockIcon from '@mui/icons-material/Block'
import DeleteIcon from '@mui/icons-material/Delete'
import { getAbuseMetrics, getRiskEvents, getAbuseConfig, runCleanup } from '../api/admin'
import { format } from 'date-fns'
import { useToast } from '../components/ToastContext'
import { PageSkeleton } from '../components/LoadingSkeleton'
import appColors from '../constants/colors'

function AbuseMetrics() {
  const [metrics, setMetrics] = useState(null)
  const [riskEvents, setRiskEvents] = useState([])
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cleaning, setCleaning] = useState(false)
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [daysFilter, setDaysFilter] = useState(7)
  const { showToast } = useToast()

  useEffect(() => {
    loadData()
  }, [daysFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      const startDate = new Date(Date.now() - daysFilter * 24 * 60 * 60 * 1000)
      const [metricsData, eventsData, configData] = await Promise.all([
        getAbuseMetrics({ startDate }),
        getRiskEvents(50),
        getAbuseConfig()
      ])
      setMetrics(metricsData)
      setRiskEvents(eventsData.events || [])
      setConfig(configData)
    } catch (error) {
      console.error('Failed to load abuse metrics:', error)
      showToast('Failed to load abuse metrics. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCleanup = async () => {
    if (!window.confirm('Are you sure you want to run cleanup? This will delete old rate limit and risk event records.')) {
      return
    }
    try {
      setCleaning(true)
      await runCleanup({
        rateLimitRetentionDays: 7,
        riskEventRetentionDays: 90
      })
      showToast('Cleanup completed successfully', 'success')
      loadData()
    } catch (error) {
      console.error('Cleanup failed:', error)
      showToast('Cleanup failed: ' + (error.message || 'Unknown error'), 'error')
    } finally {
      setCleaning(false)
    }
  }

  const filteredEvents = riskEvents.filter(event => 
    !eventTypeFilter || event.event_type === eventTypeFilter
  )

  const getEventTypeColor = (type) => {
    switch (type) {
      case 'DEVICE_CAP_EXCEEDED':
        return 'error'
      case 'DEVICE_CREATION_RATE_LIMIT':
        return 'warning'
      case 'DEVICE_CHURN_DETECTED':
        return 'info'
      default:
        return 'default'
    }
  }

  const getEventTypeLabel = (type) => {
    switch (type) {
      case 'DEVICE_CAP_EXCEEDED':
        return 'Device Limit Exceeded'
      case 'DEVICE_CREATION_RATE_LIMIT':
        return 'Rate Limit Hit'
      case 'DEVICE_CHURN_DETECTED':
        return 'Suspicious Activity'
      default:
        return type
    }
  }

  if (loading) {
    return <PageSkeleton />
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
            Abuse Detection & Security
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Monitor suspicious activities and system security metrics
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <TextField
            select
            size="small"
            label="Time Period"
            value={daysFilter}
            onChange={(e) => setDaysFilter(Number(e.target.value))}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value={1}>Last 24 Hours</MenuItem>
            <MenuItem value={7}>Last 7 Days</MenuItem>
            <MenuItem value={30}>Last 30 Days</MenuItem>
            <MenuItem value={90}>Last 90 Days</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {config && (
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
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            Current Security Settings:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            <li>Max Devices per User: <strong>{config.defaultMaxDevicesPerUser}</strong></li>
            <li>Max Devices per IP (24h): <strong>{config.maxDevicesPerIpPer24h}</strong></li>
            <li>Max Devices per User (24h): <strong>{config.maxDevicesPerUserPer24h}</strong></li>
            <li>Device Churn Threshold: <strong>{config.deviceChurnThreshold}</strong></li>
          </Box>
        </Alert>
      )}

      {metrics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${appColors.status.error.bg}, ${appColors.background.paper})`,
                border: `1px solid ${appColors.status.error.light}`,
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <SecurityIcon sx={{ color: appColors.status.error.main }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: appColors.text.primary }}>
                    Risk Events Summary
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: appColors.status.error.main }}>
                  {metrics.riskEvents?.total || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }} gutterBottom>
                  Total risk events detected in the last {daysFilter} days
                </Typography>
                {metrics.riskEvents?.byType && metrics.riskEvents.byType.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      Breakdown by Type:
                    </Typography>
                    {metrics.riskEvents.byType.map((item) => (
                      <Box
                        key={item.event_type}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 1.5, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}
                      >
                        <Typography variant="body2">{getEventTypeLabel(item.event_type)}</Typography>
                        <Chip
                          label={item.count}
                          size="small"
                          color={getEventTypeColor(item.event_type)}
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${appColors.status.info.bg}, ${appColors.background.paper})`,
                border: `1px solid ${appColors.status.info.light}`,
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <BlockIcon sx={{ color: appColors.secondary.main }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: appColors.text.primary }}>
                    Device Creation Activity
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: appColors.secondary.main }}>
                  {metrics.rateLimits?.totalCreations || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Total device registrations in the last {daysFilter} days
                </Typography>
                {metrics.rateLimits?.topIPs && metrics.rateLimits.topIPs.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      Top IP Addresses:
                    </Typography>
                    {metrics.rateLimits.topIPs.slice(0, 5).map((item, idx) => (
                      <Box
                        key={idx}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}
                      >
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {item.ip_address}
                        </Typography>
                        <Chip label={item.total} size="small" />
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper
        sx={{
          p: 3,
          mb: 3,
          boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)',
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Recent Risk Events
          </Typography>
          <Box display="flex" gap={2}>
            <TextField
              select
              size="small"
              label="Filter by Type"
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="DEVICE_CAP_EXCEEDED">Device Limit Exceeded</MenuItem>
              <MenuItem value="DEVICE_CREATION_RATE_LIMIT">Rate Limit</MenuItem>
              <MenuItem value="DEVICE_CHURN_DETECTED">Suspicious Activity</MenuItem>
            </TextField>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<DeleteIcon />}
              onClick={handleCleanup}
              disabled={cleaning}
            >
              {cleaning ? 'Cleaning...' : 'Run Cleanup'}
            </Button>
          </Box>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Event Type</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>IP Address</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Details</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Date & Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {eventTypeFilter ? 'No events found for this filter' : 'No risk events detected'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => (
                  <TableRow key={event.id} hover>
                    <TableCell>
                      <Chip
                        icon={<WarningIcon />}
                        label={getEventTypeLabel(event.event_type)}
                        size="small"
                        color={getEventTypeColor(event.event_type)}
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell>
                      {event.user_email ? (
                        <Tooltip title={`User ID: ${event.user_id}`} arrow>
                          <Typography variant="body2" sx={{ color: 'text.primary' }}>
                            {event.user_email}
                          </Typography>
                        </Tooltip>
                      ) : event.user_id ? (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          User #{event.user_id}
                        </Typography>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.tertiary' }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.ip_address ? (
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.primary' }}
                        >
                          {event.ip_address}
                        </Typography>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.tertiary' }}>-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.metadata ? (
                        <Tooltip title={JSON.stringify(event.metadata, null, 2)} arrow>
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.7rem',
                              maxWidth: '200px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'block',
                            }}
                          >
                            {JSON.stringify(event.metadata).substring(0, 50)}...
                          </Typography>
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {event.created_at ? (
                        <Tooltip title={format(new Date(event.created_at), 'PPpp')} arrow>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.tertiary' }}>-</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}

export default AbuseMetrics
