/**
 * Application color constants used across the admin dashboard
 * Blue-based color scheme for consistency throughout the application
 */

export const appColors = {
  // Primary blue colors
  primary: {
    main: '#3b82f6', // blue-500
    light: '#60a5fa', // blue-400
    dark: '#2563eb', // blue-600
    lighter: '#93c5fd', // blue-300
    darker: '#1d4ed8', // blue-700
  },

  // Secondary colors
  secondary: {
    main: '#8b5cf6', // purple-500
    light: '#a78bfa', // purple-400
    dark: '#7c3aed', // purple-600
  },

  // Status colors
  status: {
    // Success/Healthy
    success: {
      main: '#10b981', // green-500
      light: '#34d399', // green-400
      dark: '#059669', // green-600
      bg: '#d1fae5', // green-100
      text: '#065f46', // green-800
    },
    // Warning
    warning: {
      main: '#f59e0b', // orange-500
      light: '#fbbf24', // orange-400
      dark: '#d97706', // orange-600
      bg: '#fef3c7', // yellow-100
      text: '#92400e', // yellow-800
    },
    // Error/Critical
    error: {
      main: '#ef4444', // red-500
      light: '#f87171', // red-400
      dark: '#dc2626', // red-600
      bg: '#fee2e2', // red-100
      text: '#991b1b', // red-800
    },
    // Info/Neutral
    info: {
      main: '#3b82f6', // blue-500
      light: '#60a5fa', // blue-400
      dark: '#2563eb', // blue-600
      bg: '#dbeafe', // blue-100
      text: '#1e40af', // blue-800
    },
  },

  // Background colors
  background: {
    default: '#f9fafb', // gray-50
    paper: '#ffffff', // white
    card: '#f3f4f6', // gray-100
    hover: '#e5e7eb', // gray-200
    dark: {
      default: '#111827', // gray-900
      paper: '#1f2937', // gray-800
      card: '#374151', // gray-700
    },
  },

  // Text colors (optimized for blue-based theme)
  text: {
    primary: '#1e293b', // slate-800 - better contrast with blue backgrounds
    secondary: '#475569', // slate-600 - softer but readable
    tertiary: '#64748b', // slate-500 - muted but visible
    disabled: '#cbd5e1', // slate-300
    onPrimary: '#ffffff', // white text on primary blue
    onSuccess: '#ffffff', // white text on success green
    onWarning: '#ffffff', // white text on warning orange
    onError: '#ffffff', // white text on error red
    dark: {
      primary: '#f1f5f9', // slate-50
      secondary: '#cbd5e1', // slate-300
      tertiary: '#94a3b8', // slate-400
    },
  },

  // Border colors
  border: {
    default: '#e5e7eb', // gray-200
    light: '#f3f4f6', // gray-100
    dark: '#d1d5db', // gray-300
    darkMode: {
      default: '#374151', // gray-700
      light: '#4b5563', // gray-600
      dark: '#1f2937', // gray-800
    },
  },

  // Chart/Graph colors
  chart: {
    primary: '#3b82f6', // blue-500
    secondary: '#8b5cf6', // purple-500
    success: '#10b981', // green-500
    warning: '#f59e0b', // orange-500
    error: '#ef4444', // red-500
    info: '#0ea5e9', // cyan-500
    colors: [
      '#3b82f6', // blue-500
      '#2563eb', // blue-600
      '#60a5fa', // blue-400
      '#8b5cf6', // purple-500
      '#7c3aed', // purple-600
      '#a78bfa', // purple-400
      '#10b981', // green-500
      '#059669', // green-600
      '#34d399', // green-400
      '#0ea5e9', // cyan-500
      '#0284c7', // cyan-600
      '#38bdf8', // cyan-400
      '#f59e0b', // orange-500
      '#d97706', // orange-600
      '#fbbf24', // orange-400
    ],
  },

  // Badge/Tag colors
  badge: {
    primary: {
      bg: '#dbeafe', // blue-100
      text: '#1e40af', // blue-800
      border: '#93c5fd', // blue-300
    },
    success: {
      bg: '#d1fae5', // green-100
      text: '#065f46', // green-800
      border: '#6ee7b7', // green-300
    },
    warning: {
      bg: '#fef3c7', // yellow-100
      text: '#92400e', // yellow-800
      border: '#fde68a', // yellow-300
    },
    error: {
      bg: '#fee2e2', // red-100
      text: '#991b1b', // red-800
      border: '#fca5a5', // red-300
    },
    default: {
      bg: '#f3f4f6', // gray-100
      text: '#374151', // gray-700
      border: '#d1d5db', // gray-300
    },
  },

  // Shadow definitions
  shadows: {
    sm: '0 1px 2px 0 rgba(59, 130, 246, 0.05)',
    default: '0 1px 3px 0 rgba(59, 130, 246, 0.1), 0 1px 2px 0 rgba(59, 130, 246, 0.06)',
    md: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)',
    lg: '0 10px 15px -3px rgba(59, 130, 246, 0.1), 0 4px 6px -2px rgba(59, 130, 246, 0.05)',
    xl: '0 20px 25px -5px rgba(59, 130, 246, 0.1), 0 10px 10px -5px rgba(59, 130, 246, 0.04)',
    colored: {
      primary: '0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.2)',
      success: '0 10px 15px -3px rgba(16, 185, 129, 0.3), 0 4px 6px -2px rgba(16, 185, 129, 0.2)',
      warning: '0 10px 15px -3px rgba(245, 158, 11, 0.3), 0 4px 6px -2px rgba(245, 158, 11, 0.2)',
      error: '0 10px 15px -3px rgba(239, 68, 68, 0.3), 0 4px 6px -2px rgba(239, 68, 68, 0.2)',
    },
  },
}

/**
 * Get status color based on status string
 */
export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'success':
    case 'healthy':
      return appColors.status.success
    case 'trial':
    case 'warning':
      return appColors.status.warning
    case 'expired':
    case 'error':
    case 'critical':
      return appColors.status.error
    default:
      return appColors.status.info
  }
}

/**
 * Get badge color based on status
 */
export const getBadgeColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'success':
      return appColors.badge.success
    case 'trial':
    case 'warning':
      return appColors.badge.warning
    case 'expired':
    case 'error':
      return appColors.badge.error
    default:
      return appColors.badge.default
  }
}

export default appColors
