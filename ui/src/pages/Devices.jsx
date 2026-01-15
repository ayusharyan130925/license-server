import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
  TextField,
  InputAdornment,
  Tooltip,
  Card,
  CardContent,
  Grid,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import DevicesIcon from '@mui/icons-material/Devices'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { getDevices } from '../api/admin'
import { format, differenceInDays } from 'date-fns'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { useToast } from '../components/ToastContext'

function Devices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    loadDevices()
  }, [])

  const loadDevices = async () => {
    try {
      setLoading(true)
      const data = await getDevices()
      setDevices(data.devices || [])
    } catch (error) {
      console.error('Failed to load devices:', error)
      showToast('Failed to load devices. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredDevices = devices.filter((device) =>
    device.device_hash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.id?.toString().includes(searchTerm)
  )

  const getTrialStatus = (device) => {
    if (!device.trial_started_at) {
      return { label: 'Trial Available', color: 'success', icon: <CheckCircleIcon /> }
    }
    if (device.trial_consumed) {
      return { label: 'Trial Used', color: 'default', icon: <CancelIcon /> }
    }
    if (device.trial_ended_at && new Date(device.trial_ended_at) < new Date()) {
      return { label: 'Trial Expired', color: 'error', icon: <CancelIcon /> }
    }
    return { label: 'Trial Active', color: 'warning', icon: <CheckCircleIcon /> }
  }

  const getDaysRemaining = (device) => {
    if (!device.trial_ended_at) return null
    const days = differenceInDays(new Date(device.trial_ended_at), new Date())
    return days > 0 ? days : 0
  }

  const stats = {
    total: devices.length,
    trialAvailable: devices.filter(d => !d.trial_started_at).length,
    trialActive: devices.filter(d => d.trial_started_at && !d.trial_consumed && new Date(d.trial_ended_at || 0) >= new Date()).length,
    trialUsed: devices.filter(d => d.trial_consumed).length,
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Devices
        </Typography>
        <TableSkeleton rows={8} columns={7} />
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
            Device Management
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Track all registered devices and their trial status
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Search by device hash or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <DevicesIcon color="primary" />
                <Typography variant="h6">{stats.total}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Devices
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              border: '2px solid',
              borderColor: 'success.main',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.02))',
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <CheckCircleIcon sx={{ color: '#10b981' }} />
                <Typography variant="h6" sx={{ color: '#10b981', fontWeight: 700 }}>
                  {stats.trialAvailable}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Trial Available
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              border: '2px solid',
              borderColor: 'warning.main',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(245, 158, 11, 0.02))',
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <CheckCircleIcon sx={{ color: '#f59e0b' }} />
                <Typography variant="h6" sx={{ color: '#f59e0b', fontWeight: 700 }}>
                  {stats.trialActive}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Trial Active
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid', borderColor: 'default.main' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <CancelIcon color="default" />
                <Typography variant="h6">
                  {stats.trialUsed}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Trial Used
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer
        component={Paper}
        sx={{
          boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)',
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Device ID</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Device Hash</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Trial Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Trial Started</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Trial Ends</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>First Seen</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Last Seen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDevices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchTerm ? 'No devices found matching your search' : 'No devices found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredDevices.map((device) => {
                const trialStatus = getTrialStatus(device)
                const daysRemaining = getDaysRemaining(device)
                return (
                  <TableRow key={device.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        #{device.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={device.device_hash} arrow>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {device.device_hash}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={trialStatus.icon}
                        label={
                          daysRemaining !== null && daysRemaining > 0
                            ? `${trialStatus.label} (${daysRemaining}d left)`
                            : trialStatus.label
                        }
                        color={trialStatus.color}
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell>
                      {device.trial_started_at ? (
                        <Tooltip title={format(new Date(device.trial_started_at), 'PPpp')} arrow>
                          <Typography variant="body2">
                            {format(new Date(device.trial_started_at), 'MMM dd, yyyy')}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Not started
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {device.trial_ended_at ? (
                        <Tooltip title={format(new Date(device.trial_ended_at), 'PPpp')} arrow>
                          <Typography variant="body2">
                            {format(new Date(device.trial_ended_at), 'MMM dd, yyyy')}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {device.first_seen_at ? (
                        <Tooltip title={format(new Date(device.first_seen_at), 'PPpp')} arrow>
                          <Typography variant="body2">
                            {format(new Date(device.first_seen_at), 'MMM dd, yyyy')}
                          </Typography>
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {device.last_seen_at ? (
                        <Tooltip title={format(new Date(device.last_seen_at), 'PPpp')} arrow>
                          <Typography variant="body2">
                            {format(new Date(device.last_seen_at), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default Devices
