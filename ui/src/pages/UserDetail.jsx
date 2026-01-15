import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { getUser, getUserDevices, getUserSubscriptions } from '../api/admin'
import { format } from 'date-fns'

function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [devices, setDevices] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserData()
  }, [id])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const [userData, devicesData, subscriptionsData] = await Promise.all([
        getUser(id),
        getUserDevices(id),
        getUserSubscriptions(id),
      ])
      setUser(userData.user)
      setDevices(devicesData.devices || [])
      setSubscriptions(subscriptionsData.subscriptions || [])
    } catch (error) {
      console.error('Failed to load user data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (!user) {
    return (
      <Box>
        <Typography variant="h4">User not found</Typography>
      </Box>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'trial':
        return 'warning'
      case 'expired':
        return 'error'
      default:
        return 'default'
    }
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/users')}
        sx={{ mb: 2 }}
      >
        Back to Users
      </Button>
      <Typography variant="h4" gutterBottom>
        User Details
      </Typography>
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              User Information
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  ID
                </Typography>
                <Typography variant="body1">{user.id}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Email
                </Typography>
                <Typography variant="body1">{user.email}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Max Devices
                </Typography>
                <Typography variant="body1">
                  {user.max_devices || 'Default (2-3)'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Created At
                </Typography>
                <Typography variant="body1">
                  {user.created_at
                    ? format(new Date(user.created_at), 'MMM dd, yyyy HH:mm:ss')
                    : '-'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Subscriptions
            </Typography>
            <Divider sx={{ my: 2 }} />
            {subscriptions.length === 0 ? (
              <Typography color="textSecondary">No subscriptions</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {subscriptions.map((sub) => (
                  <Box key={sub.id}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body1">
                        {sub.stripe_subscription_id || 'N/A'}
                      </Typography>
                      <Chip
                        label={sub.status}
                        color={getStatusColor(sub.status)}
                        size="small"
                      />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      Created: {format(new Date(sub.created_at), 'MMM dd, yyyy')}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Devices ({devices.length})
            </Typography>
            <Divider sx={{ my: 2 }} />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Device Hash</TableCell>
                    <TableCell>Trial Status</TableCell>
                    <TableCell>Trial Started</TableCell>
                    <TableCell>Trial Ends</TableCell>
                    <TableCell>Last Seen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {devices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No devices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    devices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={device.trial_consumed ? 'Used' : 'Available'}
                            color={device.trial_consumed ? 'default' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {device.trial_started_at
                            ? format(new Date(device.trial_started_at), 'MMM dd, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {device.trial_ended_at
                            ? format(new Date(device.trial_ended_at), 'MMM dd, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {device.last_seen_at
                            ? format(new Date(device.last_seen_at), 'MMM dd, yyyy HH:mm')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default UserDetail
