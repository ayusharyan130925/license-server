import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Chip,
  Collapse,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PeopleIcon from '@mui/icons-material/People'
import DevicesIcon from '@mui/icons-material/Devices'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import SystemUpdateIcon from '@mui/icons-material/SystemUpdate'
import SettingsIcon from '@mui/icons-material/Settings'
import SecurityIcon from '@mui/icons-material/Security'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import CampaignIcon from '@mui/icons-material/Campaign'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { useToast } from './ToastContext'
import { appColors } from '../constants/colors'

const drawerWidth = 280

// Organized menu items with groups (ERP-style)
const menuGroups = [
  {
    title: 'Overview',
    items: [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    ],
  },
  {
    title: 'Sales & Marketing',
    items: [
      { text: 'Leads', icon: <CampaignIcon />, path: '/leads' },
    ],
  },
  {
    title: 'User Management',
    items: [
      { text: 'Users', icon: <PeopleIcon />, path: '/users' },
      { text: 'Devices', icon: <DevicesIcon />, path: '/devices' },
      { text: 'Subscriptions', icon: <CreditCardIcon />, path: '/subscriptions' },
    ],
  },
  {
    title: 'System',
    items: [
      { text: 'App Versions', icon: <SystemUpdateIcon />, path: '/app-versions' },
      { text: 'Trial Config', icon: <SettingsIcon />, path: '/trial-config' },
      { text: 'Abuse Metrics', icon: <SecurityIcon />, path: '/abuse-metrics' },
    ],
  },
]

function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState({})
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()

  const adminEmail = typeof window !== 'undefined' ? window.localStorage.getItem('adminEmail') : null

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    window.localStorage.removeItem('adminToken')
    window.localStorage.removeItem('adminEmail')
    showToast('Logged out successfully', 'success')
    navigate('/login', { replace: true })
    handleMenuClose()
  }

  const toggleGroup = (groupTitle) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle],
    }))
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Brand Section */}
      <Toolbar
        sx={{
          background: `linear-gradient(135deg, ${appColors.primary.main} 0%, ${appColors.primary.dark} 100%)`,
          color: '#ffffff',
          boxShadow: appColors.shadows.default,
          minHeight: '80px !important',
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5} sx={{ width: '100%' }}>
          <SecurityIcon sx={{ fontSize: 32, color: '#ffffff' }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, color: '#ffffff', fontSize: '1.1rem' }}>
              VisionAI License
            </Typography>
            <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.9, fontSize: '0.7rem' }}>
              Admin Dashboard
            </Typography>
          </Box>
        </Box>
      </Toolbar>

      <Divider />

      {/* Navigation Menu */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {menuGroups.map((group) => {
          const isExpanded = expandedGroups[group.title] !== false // Default to expanded
          const hasActiveItem = group.items.some((item) => location.pathname === item.path)

          return (
            <Box key={group.title} sx={{ mb: 0.5 }}>
              {/* Group Header */}
              <ListItemButton
                onClick={() => toggleGroup(group.title)}
                sx={{
                  py: 1,
                  px: 2,
                  '&:hover': {
                    backgroundColor: appColors.background.hover,
                  },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: appColors.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.7rem',
                    flex: 1,
                  }}
                >
                  {group.title}
                </Typography>
                {isExpanded ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
              </ListItemButton>

              {/* Group Items */}
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                      <ListItem key={item.text} disablePadding>
                        <ListItemButton
                          selected={isActive}
                          onClick={() => {
                            navigate(item.path)
                            setMobileOpen(false)
                          }}
                          sx={{
                            pl: 4,
                            py: 1.5,
                            '&.Mui-selected': {
                              backgroundColor: appColors.primary.lighter,
                              color: appColors.primary.darker,
                              borderLeft: `3px solid ${appColors.primary.main}`,
                              '&:hover': {
                                backgroundColor: appColors.primary.lighter,
                              },
                              '& .MuiListItemIcon-root': {
                                color: appColors.primary.darker,
                              },
                            },
                            '&:hover': {
                              backgroundColor: appColors.background.hover,
                            },
                            color: isActive ? appColors.primary.darker : appColors.text.secondary,
                            '& .MuiListItemIcon-root': {
                              color: isActive ? appColors.primary.darker : appColors.text.secondary,
                              minWidth: 40,
                            },
                          }}
                        >
                          <ListItemIcon>{item.icon}</ListItemIcon>
                          <ListItemText
                            primary={item.text}
                            primaryTypographyProps={{
                              fontSize: '0.9rem',
                              fontWeight: isActive ? 600 : 400,
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    )
                  })}
                </List>
              </Collapse>
            </Box>
          )
        })}
      </Box>

      {/* Footer/User Section */}
      <Box
        sx={{
          borderTop: `1px solid ${appColors.border.default}`,
          p: 2,
          backgroundColor: appColors.background.default,
        }}
      >
        <Chip
          icon={<AccountCircleIcon />}
          label={adminEmail || 'Admin'}
          onClick={handleMenuOpen}
          sx={{
            width: '100%',
            justifyContent: 'flex-start',
            height: 40,
            backgroundColor: appColors.background.paper,
            border: `1px solid ${appColors.border.default}`,
            '&:hover': {
              backgroundColor: appColors.background.hover,
            },
          }}
        />
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: appColors.background.default }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: appColors.background.paper,
          boxShadow: appColors.shadows.sm,
          borderBottom: `1px solid ${appColors.border.default}`,
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' }, color: appColors.text.primary }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem disabled>
              <Typography variant="body2" color="textSecondary">
                {adminEmail || 'Admin User'}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: `1px solid ${appColors.border.default}`,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: `1px solid ${appColors.border.default}`,
              backgroundColor: appColors.background.paper,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: appColors.background.default,
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  )
}

export default Layout
