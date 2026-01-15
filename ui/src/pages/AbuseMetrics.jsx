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
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { getAbuseMetrics, getRiskEvents, getAbuseConfig, runCleanup } from '../api/admin'
import { format } from 'date-fns'

function AbuseMetrics() {
  const [metrics, setMetrics] = useState(null)
  const [riskEvents, setRiskEvents] = useState([])
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [daysFilter, setDaysFilter] = useState(7)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [metricsData, eventsData, configData] = await Promise.all([
        getAbuseMetrics({ startDate: new Date(Date.now() - daysFilter * 24 * 60 * 60 * 1000) }),
        getRiskEvents(50),
        getAbuseConfig()
      ])
      setMetrics(metricsData)
      setRiskEvents(eventsData.events || [])
      setConfig(configData)
    } catch (error) {
      console.error('Failed to load abuse metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCleanup = async () => {
    try {
      await runCleanup({
        rateLimitRetentionDays: 7,
        riskEventRetentionDays: 90
      })
      alert('Cleanup completed successfully')
      loadData()
    } catch (error) {
      console.error('Cleanup failed:', error)
      alert('Cleanup failed: ' + (error.message || 'Unknown error'))
    }
  }

  const filteredEvents = riskEvents.filter(event => 
    !eventTypeFilter || event.event_type === eventTypeFilter
  )

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Abuse Detection Metrics</Typography>
        <Box display="flex" gap={2}>
          <TextField
            select
            size="small"
            label="Days"
            value={daysFilter}
            onChange={(e) => setDaysFilter(Number(e.target.value))}
            sx={{ minWidth: 100 }}
          >
            <MenuItem value={1}>1 Day</MenuItem>
            <MenuItem value={7}>7 Days</MenuItem>
            <MenuItem value={30}>30 Days</MenuItem>
            <MenuItem value={90}>90 Days</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleCleanup}
          >
            Run Cleanup
          </Button>
        </Box>
      </Box>

      {config && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Configuration</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="textSecondary">Max Devices/User</Typography>
              <Typography variant="body1">{config.defaultMaxDevicesPerUser}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="textSecondary">Max Devices/IP (24h)</Typography>
              <Typography variant="body1">{config.maxDevicesPerIpPer24h}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="textSecondary">Max Devices/User (24h)</Typography>
              <Typography variant="body1">{config.maxDevicesPerUserPer24h}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="textSecondary">Churn Threshold</Typography>
              <Typography variant="body1">{config.deviceChurnThreshold}</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {metrics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Risk Events</Typography>
                <Typography variant="h4">{metrics.riskEvents?.total || 0}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Total events in last {daysFilter} days
                </Typography>
                {metrics.riskEvents?.byType && (
                  <Box sx={{ mt: 2 }}>
                    {metrics.riskEvents.byType.map((item) => (
                      <Box key={item.event_type} display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2">{item.event_type}</Typography>
                        <Chip label={item.count} size="small" />
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Device Creations</Typography>
                <Typography variant="h4">{metrics.rateLimits?.totalCreations || 0}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Total device creations in last {daysFilter} days
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Top IPs by Risk Events</Typography>
          <TextField
            select
            size="small"
            label="Filter by Type"
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="DEVICE_CAP_EXCEEDED">Device Cap Exceeded</MenuItem>
            <MenuItem value="DEVICE_CREATION_RATE_LIMIT">Rate Limit</MenuItem>
            <MenuItem value="DEVICE_CHURN_DETECTED">Device Churn</MenuItem>
          </TextField>
        </Box>
        {metrics?.riskEvents?.topIPs && metrics.riskEvents.topIPs.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>IP Address</TableCell>
                  <TableCell align="right">Event Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metrics.riskEvents.topIPs.map((item) => (
                  <TableRow key={item.ip_address}>
                    <TableCell>{item.ip_address}</TableCell>
                    <TableCell align="right">{item.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="textSecondary">No data available</Typography>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Recent Risk Events</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>User</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>Metadata</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No risk events found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => (
                  <TableRow key={event.id} hover>
                    <TableCell>
                      <Chip
                        label={event.event_type}
                        size="small"
                        color={
                          event.event_type === 'DEVICE_CAP_EXCEEDED' ? 'error' :
                          event.event_type === 'DEVICE_CREATION_RATE_LIMIT' ? 'warning' :
                          'default'
                        }
                      />
                    </TableCell>
                    <TableCell>{event.user_email || event.user_id || '-'}</TableCell>
                    <TableCell>{event.ip_address || '-'}</TableCell>
                    <TableCell>
                      {event.metadata ? (
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {JSON.stringify(event.metadata)}
                        </Typography>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {event.created_at
                        ? format(new Date(event.created_at), 'MMM dd, yyyy HH:mm')
                        : '-'}
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
