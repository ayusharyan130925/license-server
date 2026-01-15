import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { ToastProvider } from './components/ToastContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Devices from './pages/Devices'
import AppVersions from './pages/AppVersions'
import TrialConfig from './pages/TrialConfig'
import Subscriptions from './pages/Subscriptions'
import AbuseMetrics from './pages/AbuseMetrics'
import Leads from './pages/Leads'
import Login from './pages/Login'

import appColors from './constants/colors'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: appColors.primary.main,
      light: appColors.primary.light,
      dark: appColors.primary.dark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: appColors.secondary.main,
      light: appColors.secondary.light,
      dark: appColors.secondary.dark,
      contrastText: '#ffffff',
    },
    success: {
      main: appColors.status.success.main,
      light: appColors.status.success.light,
      dark: appColors.status.success.dark,
    },
    warning: {
      main: appColors.status.warning.main,
      light: appColors.status.warning.light,
      dark: appColors.status.warning.dark,
    },
    error: {
      main: appColors.status.error.main,
      light: appColors.status.error.light,
      dark: appColors.status.error.dark,
    },
    info: {
      main: appColors.status.info.main,
      light: appColors.status.info.light,
      dark: appColors.status.info.dark,
    },
    background: {
      default: appColors.background.default,
      paper: appColors.background.paper,
    },
    text: {
      primary: appColors.text.primary,
      secondary: appColors.text.secondary,
    },
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      color: appColors.text.primary,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      color: appColors.text.primary,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      color: appColors.text.primary,
      letterSpacing: '-0.01em',
    },
    body1: {
      color: appColors.text.primary,
      lineHeight: 1.6,
    },
    body2: {
      color: appColors.text.secondary,
      lineHeight: 1.5,
    },
    subtitle1: {
      color: appColors.text.secondary,
      fontWeight: 500,
    },
    subtitle2: {
      color: appColors.text.secondary,
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: appColors.background.paper,
          border: `1px solid ${appColors.border.default}`,
          boxShadow: appColors.shadows.default,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: appColors.shadows.lg,
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: appColors.background.paper,
          border: `1px solid ${appColors.border.default}`,
        },
        elevation1: {
          boxShadow: appColors.shadows.sm,
        },
        elevation2: {
          boxShadow: appColors.shadows.md,
        },
        elevation3: {
          boxShadow: appColors.shadows.lg,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
          boxShadow: appColors.shadows.sm,
          '&:hover': {
            boxShadow: appColors.shadows.md,
          },
        },
        containedPrimary: {
          backgroundColor: appColors.primary.main,
          color: appColors.text.onPrimary,
          '&:hover': {
            backgroundColor: appColors.primary.dark,
            boxShadow: appColors.shadows.colored.primary,
          },
        },
        containedSecondary: {
          backgroundColor: appColors.secondary.main,
          color: appColors.text.onPrimary,
          '&:hover': {
            backgroundColor: appColors.secondary.dark,
            boxShadow: appColors.shadows.colored.primary,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          boxShadow: appColors.shadows.sm,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: appColors.background.card,
          '& .MuiTableCell-head': {
            color: appColors.text.primary,
            fontWeight: 600,
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: appColors.background.hover,
          },
          '& .MuiTableCell-body': {
            color: appColors.text.primary,
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          '&.MuiTypography-body2': {
            color: appColors.text.secondary,
          },
          '&.MuiTypography-caption': {
            color: appColors.text.tertiary,
          },
        },
      },
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
        <Route
          path="/leads"
          element={
            <RequireAuth>
              <Leads />
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
      <ToastProvider>
        <Router>
          <AppRoutes />
        </Router>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
