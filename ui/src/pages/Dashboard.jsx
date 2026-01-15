import React, { useEffect, useState } from 'react'
import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  Paper,
  Card,
  CardContent,
  Divider,
  Button,
} from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import DevicesIcon from '@mui/icons-material/Devices'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import TimerIcon from '@mui/icons-material/Timer'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useNavigate } from 'react-router-dom'
import StatCard from '../components/StatCard'
import { PageSkeleton } from '../components/LoadingSkeleton'
import { getStats } from '../api/admin'
import { useToast } from '../components/ToastContext'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await getStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
      showToast('Failed to load dashboard statistics', 'error')
    } finally {
      setLoading(false)
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
            Dashboard Overview
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Monitor your license server activity and key metrics at a glance
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadStats}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            icon={<PeopleIcon sx={{ fontSize: 48 }} />}
            color="primary"
            tooltip="Total number of registered users in the system"
            subtitle="All registered accounts"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Devices"
            value={stats?.totalDevices || 0}
            icon={<DevicesIcon sx={{ fontSize: 48 }} />}
            color="secondary"
            tooltip="Total number of devices that have registered"
            subtitle="All registered devices"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Subscriptions"
            value={stats?.activeSubscriptions || 0}
            icon={<CreditCardIcon sx={{ fontSize: 48 }} />}
            color="success"
            tooltip="Users with active paid subscriptions"
            subtitle="Paid licenses"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Trials"
            value={stats?.activeTrials || 0}
            icon={<TimerIcon sx={{ fontSize: 48 }} />}
            color="warning"
            tooltip="Devices currently using their 14-day trial"
            subtitle="Trial period active"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)',
            }}
          >
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <TrendingUpIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Quick Actions
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box display="flex" flexDirection="column" gap={1.5}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<PeopleIcon />}
                onClick={() => navigate('/users')}
                sx={{ justifyContent: 'flex-start' }}
              >
                View All Users
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<DevicesIcon />}
                onClick={() => navigate('/devices')}
                sx={{ justifyContent: 'flex-start' }}
              >
                Manage Devices
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<CreditCardIcon />}
                onClick={() => navigate('/subscriptions')}
                sx={{ justifyContent: 'flex-start' }}
              >
                View Subscriptions
              </Button>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
              System Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }} paragraph>
                <strong style={{ color: 'text.primary' }}>License Server:</strong> VisionAI Desktop License Management
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }} paragraph>
                <strong style={{ color: 'text.primary' }}>Trial Duration:</strong> 14 days per device
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }} paragraph>
                <strong style={{ color: 'text.primary' }}>Device Limit:</strong> Configurable per user (default: 2-3 devices)
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                <strong style={{ color: 'text.primary' }}>Status:</strong>{' '}
                <span style={{ color: '#10b981', fontWeight: 600 }}>● Operational</span>
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard
