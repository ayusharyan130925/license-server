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
  Card,
  CardContent,
  Grid,
  Tooltip,
} from '@mui/material'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import TimerIcon from '@mui/icons-material/Timer'
import CancelIcon from '@mui/icons-material/Cancel'
import { getSubscriptions } from '../api/admin'
import { format } from 'date-fns'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { useToast } from '../components/ToastContext'

function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    loadSubscriptions()
  }, [])

  const loadSubscriptions = async () => {
    try {
      setLoading(true)
      const data = await getSubscriptions()
      setSubscriptions(data.subscriptions || [])
    } catch (error) {
      console.error('Failed to load subscriptions:', error)
      showToast('Failed to load subscriptions. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon fontSize="small" />
      case 'trial':
        return <TimerIcon fontSize="small" />
      case 'expired':
        return <CancelIcon fontSize="small" />
      default:
        return null
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Active Subscription'
      case 'trial':
        return 'Trial Period'
      case 'expired':
        return 'Expired'
      default:
        return status
    }
  }

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    trial: subscriptions.filter(s => s.status === 'trial').length,
    expired: subscriptions.filter(s => s.status === 'expired').length,
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Subscriptions
        </Typography>
        <TableSkeleton rows={8} columns={7} />
      </Box>
    )
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
          Subscription Management
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Monitor and manage all user subscriptions and trial periods
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <CreditCardIcon color="primary" />
                <Typography variant="h6">{stats.total}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Subscriptions
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
                  {stats.active}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Active Paid
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
                <TimerIcon sx={{ color: '#f59e0b' }} />
                <Typography variant="h6" sx={{ color: '#f59e0b', fontWeight: 700 }}>
                  {stats.trial}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Active Trials
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              border: '2px solid',
              borderColor: 'error.main',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.02))',
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <CancelIcon sx={{ color: '#ef4444' }} />
                <Typography variant="h6" sx={{ color: '#ef4444', fontWeight: 700 }}>
                  {stats.expired}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Expired
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
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Subscription ID</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>User ID</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Plan</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Stripe Customer</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Last Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No subscriptions found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((subscription) => (
                <TableRow key={subscription.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                      #{subscription.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.primary' }}>
                      User #{subscription.user_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(subscription.status)}
                      label={getStatusLabel(subscription.status)}
                      color={getStatusColor(subscription.status)}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  </TableCell>
                  <TableCell>
                    {subscription.plan ? (
                      <Chip
                        label={subscription.plan.name || 'N/A'}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {subscription.stripe_customer_id ? (
                      <Tooltip title={subscription.stripe_customer_id} arrow>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            maxWidth: '150px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {subscription.stripe_customer_id}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not linked
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {subscription.created_at ? (
                      <Tooltip title={format(new Date(subscription.created_at), 'PPpp')} arrow>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {format(new Date(subscription.created_at), 'MMM dd, yyyy')}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" sx={{ color: 'text.tertiary' }}>-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {subscription.updated_at ? (
                      <Tooltip title={format(new Date(subscription.updated_at), 'PPpp')} arrow>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {format(new Date(subscription.updated_at), 'MMM dd, yyyy')}
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
    </Box>
  )
}

export default Subscriptions
