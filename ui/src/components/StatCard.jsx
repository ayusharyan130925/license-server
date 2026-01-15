import React from 'react'
import { Card, CardContent, Box, Typography, Tooltip } from '@mui/material'
import { alpha } from '@mui/material/styles'
import appColors, { getStatusColor } from '../constants/colors'

function StatCard({ title, value, icon, color = 'primary', subtitle, tooltip }) {
  const getColorValue = () => {
    switch (color) {
      case 'primary':
        return appColors.primary
      case 'success':
        return appColors.status.success
      case 'warning':
        return appColors.status.warning
      case 'error':
        return appColors.status.error
      case 'secondary':
        return appColors.secondary
      default:
        return appColors.primary
    }
  }

  const colorValue = getColorValue()

  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(colorValue.main, 0.1)}, ${alpha(colorValue.main, 0.05)})`,
        border: `1px solid ${alpha(colorValue.main, 0.2)}`,
        boxShadow: `0 4px 6px -1px ${alpha(colorValue.main, 0.1)}, 0 2px 4px -1px ${alpha(colorValue.main, 0.06)}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 20px 25px -5px ${alpha(colorValue.main, 0.2)}, 0 10px 10px -5px ${alpha(colorValue.main, 0.1)}`,
          borderColor: alpha(colorValue.main, 0.4),
        },
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Tooltip title={tooltip || title} arrow>
              <Typography
                gutterBottom
                variant="body2"
                sx={{
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                }}
              >
                {title}
              </Typography>
            </Tooltip>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: colorValue.main,
                mt: 1,
                letterSpacing: '-0.02em',
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                sx={{
                  mt: 0.5,
                  display: 'block',
                  color: 'text.tertiary',
                  fontSize: '0.7rem',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              color: colorValue.main,
              opacity: 0.8,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default StatCard
