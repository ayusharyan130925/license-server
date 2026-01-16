import React from 'react'
import { Box, Typography, Button, Breadcrumbs, Link } from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import { appColors } from '../../constants/colors'

/**
 * PageHeader component for consistent page headers across the app
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.subtitle - Page subtitle
 * @param {React.ReactNode} props.action - Action button or element
 * @param {Array} props.breadcrumbs - Breadcrumb items [{ label, path }]
 * @param {boolean} props.showBreadcrumbs - Whether to show breadcrumbs
 */
export default function PageHeader({
  title,
  subtitle,
  action,
  breadcrumbs = [],
  showBreadcrumbs = true,
}) {
  const navigate = useNavigate()
  const location = useLocation()

  // Auto-generate breadcrumbs from path if not provided
  const autoBreadcrumbs = React.useMemo(() => {
    if (breadcrumbs.length > 0) return breadcrumbs
    
    const paths = location.pathname.split('/').filter(Boolean)
    const crumbs = [{ label: 'Dashboard', path: '/dashboard' }]
    
    paths.forEach((path, index) => {
      const fullPath = '/' + paths.slice(0, index + 1).join('/')
      const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ')
      crumbs.push({ label, path: fullPath })
    })
    
    return crumbs
  }, [location.pathname, breadcrumbs])

  return (
    <Box sx={{ mb: 4 }}>
      {showBreadcrumbs && autoBreadcrumbs.length > 1 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 2 }}
          aria-label="breadcrumb"
        >
          {autoBreadcrumbs.map((crumb, index) => {
            const isLast = index === autoBreadcrumbs.length - 1
            return isLast ? (
              <Typography key={crumb.path} color="text.primary" sx={{ fontWeight: 500 }}>
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={crumb.path}
                component="button"
                variant="body2"
                onClick={() => navigate(crumb.path)}
                sx={{
                  color: appColors.text.secondary,
                  textDecoration: 'none',
                  '&:hover': {
                    color: appColors.primary.main,
                    textDecoration: 'underline',
                  },
                  cursor: 'pointer',
                }}
              >
                {crumb.label}
              </Link>
            )
          })}
        </Breadcrumbs>
      )}
      
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: appColors.text.primary,
              mb: subtitle ? 0.5 : 0,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                color: appColors.text.secondary,
                mt: 0.5,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        
        {action && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {action}
          </Box>
        )}
      </Box>
    </Box>
  )
}
