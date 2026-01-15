import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  IconButton,
  TextField,
  InputAdornment,
  Tooltip,
  Card,
  CardContent,
  Grid,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import PersonIcon from '@mui/icons-material/Person'
import { getUsers } from '../api/admin'
import { format } from 'date-fns'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { useToast } from '../components/ToastContext'

function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await getUsers()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Failed to load users:', error)
      showToast('Failed to load users. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id?.toString().includes(searchTerm)
  )

  const stats = {
    total: users.length,
    withCustomLimit: users.filter(u => u.max_devices).length,
    recent: users.filter(u => {
      if (!u.created_at) return false
      const created = new Date(u.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return created >= weekAgo
    }).length,
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Users
        </Typography>
        <TableSkeleton rows={8} columns={5} />
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
            Users Management
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            View and manage all registered users in the system
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Search by email or ID..."
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
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)',
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <PersonIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700 }}>
                  {stats.total}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Total Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)',
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <PersonIcon sx={{ color: 'secondary.main' }} />
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700 }}>
                  {stats.withCustomLimit}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Custom Device Limits
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)',
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <PersonIcon sx={{ color: 'success.main' }} />
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700 }}>
                  {stats.recent}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                New This Week
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
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>User ID</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Email Address</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                <Tooltip title="Maximum number of devices this user can register" arrow>
                  <span>Max Devices</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                <Tooltip title="When this user account was created" arrow>
                  <span>Registered</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchTerm ? 'No users found matching your search' : 'No users found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                      #{user.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      {user.email || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {user.max_devices ? (
                      <Chip
                        label={`${user.max_devices} devices`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ) : (
                      <Tooltip title="Using default device limit (2-3 devices)" arrow>
                        <Chip label="Default" size="small" color="default" />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.created_at ? (
                      <Tooltip title={format(new Date(user.created_at), 'PPpp')} arrow>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {format(new Date(user.created_at), 'MMM dd, yyyy')}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" sx={{ color: 'text.tertiary' }}>-</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View user details" arrow>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(`/users/${user.id}`)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
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

export default Users
