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
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import EmailIcon from '@mui/icons-material/Email'
import FilterListIcon from '@mui/icons-material/FilterList'
import SendIcon from '@mui/icons-material/Send'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import TimerIcon from '@mui/icons-material/Timer'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PersonIcon from '@mui/icons-material/Person'
import { getLeads } from '../api/admin'
import { format, differenceInDays } from 'date-fns'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { useToast } from '../components/ToastContext'
import appColors from '../constants/colors'

function Leads() {
  const [leads, setLeads] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedLeads, setSelectedLeads] = useState([])
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    loadLeads()
  }, [statusFilter, sortBy, sortOrder])

  const loadLeads = async () => {
    try {
      setLoading(true)
      const params = {
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        sortBy,
        sortOrder,
      }
      const data = await getLeads(params)
      setLeads(data.leads || [])
      setStats(data.stats || {})
    } catch (error) {
      console.error('Failed to load leads:', error)
      showToast('Failed to load leads. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadLeads()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'converted':
      case 'active':
        return 'success'
      case 'trial_active':
        return 'info'
      case 'trial_ending':
        return 'warning'
      case 'trial_expired':
      case 'expired':
      case 'churned':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'converted':
        return 'Converted'
      case 'active':
        return 'Active'
      case 'trial_active':
        return 'Trial Active'
      case 'trial_ending':
        return 'Trial Ending'
      case 'trial_expired':
        return 'Trial Expired'
      case 'expired':
        return 'Expired'
      case 'churned':
        return 'Churned'
      default:
        return status
    }
  }

  const handleSelectLead = (leadId) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  const handleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(leads.map(l => l.id))
    }
  }

  const handleSendEmail = () => {
    if (selectedLeads.length === 0) {
      showToast('Please select at least one lead', 'warning')
      return
    }
    setEmailDialogOpen(true)
  }

  const handleEmailSend = () => {
    // In a real app, this would call an API to send emails
    console.log('Sending email to:', selectedLeads)
    console.log('Subject:', emailSubject)
    console.log('Body:', emailBody)
    showToast(`Email sent to ${selectedLeads.length} lead(s)`, 'success')
    setEmailDialogOpen(false)
    setEmailSubject('')
    setEmailBody('')
    setSelectedLeads([])
  }

  const getEmailTemplate = (status) => {
    switch (status) {
      case 'trial_ending':
        return {
          subject: 'Your VisionAI Trial is Ending Soon',
          body: `Hi there,\n\nYour 14-day trial is ending in a few days. Don't miss out on all the features!\n\nUpgrade now to continue using VisionAI.\n\nBest regards,\nVisionAI Team`
        }
      case 'trial_expired':
        return {
          subject: 'Your VisionAI Trial Has Ended',
          body: `Hi there,\n\nYour trial period has ended. Subscribe now to continue using VisionAI with all premium features.\n\nGet started: [Upgrade Link]\n\nBest regards,\nVisionAI Team`
        }
      case 'expired':
        return {
          subject: 'Renew Your VisionAI Subscription',
          body: `Hi there,\n\nYour subscription has expired. Renew now to continue enjoying VisionAI.\n\nRenew: [Renewal Link]\n\nBest regards,\nVisionAI Team`
        }
      default:
        return {
          subject: 'VisionAI Update',
          body: `Hi there,\n\nThank you for using VisionAI!\n\nBest regards,\nVisionAI Team`
        }
    }
  }

  const handleQuickEmail = (lead) => {
    setSelectedLeads([lead.id])
    const template = getEmailTemplate(lead.lead_status)
    setEmailSubject(template.subject)
    setEmailBody(template.body)
    setEmailDialogOpen(true)
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Leads Management
        </Typography>
        <TableSkeleton rows={8} columns={8} />
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
            Leads Management
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Track user conversions, manage trials, and send email campaigns
          </Typography>
        </Box>
        {selectedLeads.length > 0 && (
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSendEmail}
            sx={{ boxShadow: appColors.shadows.md }}
          >
            Send Email ({selectedLeads.length})
          </Button>
        )}
      </Box>

      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                boxShadow: appColors.shadows.default,
                border: '2px solid',
                borderColor: 'success.main',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.02))',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <TrendingUpIcon sx={{ color: '#10b981' }} />
                  <Typography variant="h6" sx={{ color: '#10b981', fontWeight: 700 }}>
                    {stats.converted || 0}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Converted (Trial → Paid)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                boxShadow: appColors.shadows.default,
                border: '2px solid',
                borderColor: 'warning.main',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(245, 158, 11, 0.02))',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <TimerIcon sx={{ color: '#f59e0b' }} />
                  <Typography variant="h6" sx={{ color: '#f59e0b', fontWeight: 700 }}>
                    {stats.trial_ending || 0}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Trial Ending Soon (≤3 days)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                boxShadow: appColors.shadows.default,
                border: '2px solid',
                borderColor: 'error.main',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.02))',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <CancelIcon sx={{ color: '#ef4444' }} />
                  <Typography variant="h6" sx={{ color: '#ef4444', fontWeight: 700 }}>
                    {stats.trial_expired || 0}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Trial Expired (Not Converted)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                boxShadow: appColors.shadows.default,
                border: '2px solid',
                borderColor: 'error.main',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.02))',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <PersonIcon sx={{ color: '#ef4444' }} />
                  <Typography variant="h6" sx={{ color: '#ef4444', fontWeight: 700 }}>
                    {stats.churned || 0}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Churned (Had Paid, Now Expired)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper
        sx={{
          p: 3,
          mb: 3,
          boxShadow: appColors.shadows.md,
        }}
      >
        <Box display="flex" gap={2} mb={2} flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Filter by Status</InputLabel>
            <Select
              value={statusFilter}
              label="Filter by Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="trial_active">Trial Active</MenuItem>
              <MenuItem value="trial_ending">Trial Ending</MenuItem>
              <MenuItem value="trial_expired">Trial Expired</MenuItem>
              <MenuItem value="converted">Converted</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="churned">Churned</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="created_at">Created Date</MenuItem>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="trial_ended_at">Trial End Date</MenuItem>
              <MenuItem value="days_until_expiry">Days Until Expiry</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? '↑' : '↓'} {sortOrder.toUpperCase()}
          </Button>
          <Button variant="outlined" onClick={handleSearch}>
            <FilterListIcon sx={{ mr: 1 }} />
            Apply
          </Button>
        </Box>
      </Paper>

      <TableContainer
        component={Paper}
        sx={{
          boxShadow: appColors.shadows.md,
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedLeads.length === leads.length && leads.length > 0}
                  indeterminate={selectedLeads.length > 0 && selectedLeads.length < leads.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Plan</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Trial End</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Days Left</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Conversion</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchTerm || statusFilter ? 'No leads found matching your filters' : 'No leads found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => handleSelectLead(lead.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      {lead.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(lead.lead_status)}
                      color={getStatusColor(lead.lead_status)}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  </TableCell>
                  <TableCell>
                    {lead.plan !== 'none' ? (
                      <Chip label={lead.plan} size="small" variant="outlined" color="primary" />
                    ) : (
                      <Typography variant="body2" sx={{ color: 'text.tertiary' }}>-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.trial_ended_at ? (
                      <Tooltip title={format(new Date(lead.trial_ended_at), 'PPpp')} arrow>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {format(new Date(lead.trial_ended_at), 'MMM dd, yyyy')}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" sx={{ color: 'text.tertiary' }}>-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.days_until_expiry !== null ? (
                      <Typography
                        variant="body2"
                        sx={{
                          color: lead.days_until_expiry <= 3 ? 'error.main' : 'text.secondary',
                          fontWeight: lead.days_until_expiry <= 3 ? 600 : 400,
                        }}
                      >
                        {lead.days_until_expiry} days
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ color: 'text.tertiary' }}>-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.converted_from_trial ? (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Yes"
                        size="small"
                        color="success"
                      />
                    ) : (
                      <Typography variant="body2" sx={{ color: 'text.tertiary' }}>No</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Send email to this lead" arrow>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleQuickEmail(lead)}
                      >
                        <EmailIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Send Email Campaign</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Sending email to {selectedLeads.length} lead(s)
          </Alert>
          <TextField
            fullWidth
            label="Subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Email Body"
            multiline
            rows={10}
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleEmailSend}
            disabled={!emailSubject || !emailBody}
            startIcon={<SendIcon />}
          >
            Send Email
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Leads
