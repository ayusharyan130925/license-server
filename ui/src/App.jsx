import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Devices from './pages/Devices'
import AppVersions from './pages/AppVersions'
import TrialConfig from './pages/TrialConfig'
import Subscriptions from './pages/Subscriptions'
import AbuseMetrics from './pages/AbuseMetrics'
import Login from './pages/Login'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

// Simple auth guard using localStorage token
function RequireAuth({ children }) {
  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('adminToken')
      : null

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Wrap Layout only around authenticated routes
function AppRoutes() {
  const location = useLocation()

  // Login route (no layout)
  if (location.pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Authenticated routes with layout
  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/users"
          element={
            <RequireAuth>
              <Users />
            </RequireAuth>
          }
        />
        <Route
          path="/users/:id"
          element={
            <RequireAuth>
              <UserDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/devices"
          element={
            <RequireAuth>
              <Devices />
            </RequireAuth>
          }
        />
        <Route
          path="/subscriptions"
          element={
            <RequireAuth>
              <Subscriptions />
            </RequireAuth>
          }
        />
        <Route
          path="/app-versions"
          element={
            <RequireAuth>
              <AppVersions />
            </RequireAuth>
          }
        />
        <Route
          path="/trial-config"
          element={
            <RequireAuth>
              <TrialConfig />
            </RequireAuth>
          }
        />
        <Route
          path="/abuse-metrics"
          element={
            <RequireAuth>
              <AbuseMetrics />
            </RequireAuth>
          }
        />
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppRoutes />
      </Router>
    </ThemeProvider>
  )
}

export default App
