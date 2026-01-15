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
} from '@mui/material'
import { getSubscriptions } from '../api/admin'
import { format } from 'date-fns'

function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Subscriptions
      </Typography>
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>User ID</TableCell>
              <TableCell>Stripe Customer ID</TableCell>
              <TableCell>Stripe Subscription ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Updated At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No subscriptions found
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((subscription) => (
                <TableRow key={subscription.id} hover>
                  <TableCell>{subscription.id}</TableCell>
                  <TableCell>{subscription.user_id}</TableCell>
                  <TableCell>
                    {subscription.stripe_customer_id || '-'}
                  </TableCell>
                  <TableCell>
                    {subscription.stripe_subscription_id || '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={subscription.status}
                      color={getStatusColor(subscription.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {subscription.created_at
                      ? format(new Date(subscription.created_at), 'MMM dd, yyyy HH:mm')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {subscription.updated_at
                      ? format(new Date(subscription.updated_at), 'MMM dd, yyyy HH:mm')
                      : '-'}
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
