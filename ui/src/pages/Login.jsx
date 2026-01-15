import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
} from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import { loginAdmin } from '../api/admin'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('visionai-desktop@gmail.com')
  const [password, setPassword] = useState('Demo@123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await loginAdmin(email, password)
      // Save token for subsequent requests
      window.localStorage.setItem('adminToken', result.token)
      window.localStorage.setItem('adminEmail', result.email)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Admin login failed:', err)
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'linear-gradient(135deg, rgba(25,118,210,0.1), rgba(220,0,78,0.1))',
      }}
    >
      <Paper
        elevation={4}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 3,
            gap: 1.5,
          }}
        >
          <LockIcon color="primary" />
          <Box>
            <Typography variant="h5">Admin Login</Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to manage licenses and configurations.
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <Typography variant="caption" color="text.secondary">
            Demo credentials:
            <br />
            Email: visionai-desktop@gmail.com
            <br />
            Password: Demo@123
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
}

export default Login

