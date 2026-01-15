import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
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
  MenuItem,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { getAppVersions, createAppVersion, updateAppVersion } from '../api/admin'
import { format } from 'date-fns'

function AppVersions() {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVersion, setEditingVersion] = useState(null)
  const [formData, setFormData] = useState({
    platform: 'mac',
    arch: 'x64',
    version: '',
    build_number: '',
    release_notes: '',
    download_url: '',
    is_mandatory: false,
    is_active: true,
    rollout_percentage: 100,
    min_supported_build: '',
    channel: 'stable',
  })

  useEffect(() => {
    loadVersions()
  }, [])

  const loadVersions = async () => {
    try {
      setLoading(true)
      const data = await getAppVersions()
      setVersions(data.versions || [])
    } catch (error) {
      console.error('Failed to load versions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (version = null) => {
    if (version) {
      setEditingVersion(version)
      setFormData({
        platform: version.platform,
        arch: version.arch || '',
        version: version.version,
        build_number: version.build_number,
        release_notes: version.release_notes || '',
        download_url: version.download_url,
        is_mandatory: version.is_mandatory,
        is_active: version.is_active,
        rollout_percentage: version.rollout_percentage,
        min_supported_build: version.min_supported_build || '',
        channel: version.channel,
      })
    } else {
      setEditingVersion(null)
      setFormData({
        platform: 'mac',
        arch: 'x64',
        version: '',
        build_number: '',
        release_notes: '',
        download_url: '',
        is_mandatory: false,
        is_active: true,
        rollout_percentage: 100,
        min_supported_build: '',
        channel: 'stable',
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingVersion(null)
  }

  const handleSubmit = async () => {
    try {
      const submitData = {
        ...formData,
        build_number: parseInt(formData.build_number),
        rollout_percentage: parseInt(formData.rollout_percentage),
        min_supported_build: formData.min_supported_build
          ? parseInt(formData.min_supported_build)
          : null,
        arch: formData.arch || null,
      }

      if (editingVersion) {
        await updateAppVersion(editingVersion.id, submitData)
      } else {
        await createAppVersion(submitData)
      }
      handleCloseDialog()
      loadVersions()
    } catch (error) {
      console.error('Failed to save version:', error)
      alert(error.message || 'Failed to save version')
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">App Versions</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Version
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Platform</TableCell>
              <TableCell>Arch</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Build</TableCell>
              <TableCell>Channel</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Mandatory</TableCell>
              <TableCell>Rollout</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {versions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No versions found
                </TableCell>
              </TableRow>
            ) : (
              versions.map((version) => (
                <TableRow key={version.id} hover>
                  <TableCell>{version.platform}</TableCell>
                  <TableCell>{version.arch || 'Universal'}</TableCell>
                  <TableCell>{version.version}</TableCell>
                  <TableCell>{version.build_number}</TableCell>
                  <TableCell>
                    <Chip label={version.channel} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={version.is_active ? 'Active' : 'Inactive'}
                      color={version.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={version.is_mandatory ? 'Yes' : 'No'}
                      color={version.is_mandatory ? 'error' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{version.rollout_percentage}%</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(version)}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingVersion ? 'Edit Version' : 'Create New Version'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              select
              label="Platform"
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              fullWidth
              SelectProps={{ native: true }}
              disabled={!!editingVersion}
            >
              <option value="mac">macOS</option>
              <option value="windows">Windows</option>
              <option value="linux">Linux</option>
            </TextField>
            <TextField
              select
              label="Architecture"
              value={formData.arch}
              onChange={(e) => setFormData({ ...formData, arch: e.target.value })}
              fullWidth
              SelectProps={{ native: true }}
              disabled={!!editingVersion}
            >
              <option value="">Universal</option>
              <option value="x64">x64</option>
              <option value="arm64">arm64</option>
            </TextField>
            <TextField
              label="Version"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              fullWidth
              disabled={!!editingVersion}
            />
            <TextField
              label="Build Number"
              type="number"
              value={formData.build_number}
              onChange={(e) =>
                setFormData({ ...formData, build_number: e.target.value })
              }
              fullWidth
              disabled={!!editingVersion}
            />
            <TextField
              select
              label="Channel"
              value={formData.channel}
              onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="stable">Stable</option>
              <option value="beta">Beta</option>
            </TextField>
            <TextField
              label="Download URL"
              value={formData.download_url}
              onChange={(e) =>
                setFormData({ ...formData, download_url: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Release Notes"
              value={formData.release_notes}
              onChange={(e) =>
                setFormData({ ...formData, release_notes: e.target.value })
              }
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Rollout Percentage"
              type="number"
              value={formData.rollout_percentage}
              onChange={(e) =>
                setFormData({ ...formData, rollout_percentage: e.target.value })
              }
              fullWidth
              inputProps={{ min: 0, max: 100 }}
            />
            <TextField
              label="Min Supported Build"
              type="number"
              value={formData.min_supported_build}
              onChange={(e) =>
                setFormData({ ...formData, min_supported_build: e.target.value })
              }
              fullWidth
              helperText="Minimum build number that can run (kill switch)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                />
              }
              label="Active"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_mandatory}
                  onChange={(e) =>
                    setFormData({ ...formData, is_mandatory: e.target.checked })
                  }
                />
              }
              label="Mandatory Update"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingVersion ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AppVersions
