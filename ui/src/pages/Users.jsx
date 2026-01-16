import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Grid, Chip, IconButton, Tooltip } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import PersonIcon from '@mui/icons-material/Person'
import { getUsers } from '../api/admin'
import { useDataFetch, useTable } from '../hooks'
import { PageHeader, DataTable, FilterBar } from '../components/shared'
import StatCard from '../components/StatCard'
import { formatDate } from '../utils/formatters'
import { appColors } from '../constants/colors'

function Users() {
  const navigate = useNavigate()

  // Fetch users data
  const { data: usersData, loading } = useDataFetch(
    () => getUsers(),
    [],
    { errorMessage: 'Failed to load users' }
  )

  const users = usersData?.users || []

  // Table configuration
  const columns = [
    {
      id: 'id',
      label: 'User ID',
      accessor: 'id',
      align: 'left',
      render: (value) => (
        <Box component="span" sx={{ fontFamily: 'monospace', color: appColors.text.primary }}>
          #{value}
        </Box>
      ),
    },
    {
      id: 'email',
      label: 'Email Address',
      accessor: 'email',
      sortable: true,
    },
    {
      id: 'max_devices',
      label: 'Max Devices',
      accessor: 'max_devices',
      align: 'center',
      render: (value, row) => {
        if (value) {
          return (
            <Chip
              label={`${value} devices`}
              size="small"
              sx={{
                backgroundColor: appColors.primary.lighter,
                color: appColors.primary.darker,
                fontWeight: 500,
              }}
            />
          )
        }
        return (
          <Tooltip title="Using default device limit (2-3 devices)" arrow>
            <Chip
              label="Default"
              size="small"
              sx={{
                backgroundColor: appColors.background.default,
                color: appColors.text.secondary,
              }}
            />
          </Tooltip>
        )
      },
    },
    {
      id: 'created_at',
      label: 'Registered',
      accessor: 'created_at',
      type: 'date',
      sortable: true,
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'center',
      sortable: false,
      render: (_, row) => (
        <Tooltip title="View user details" arrow>
          <IconButton
            size="small"
            onClick={() => navigate(`/users/${row.id}`)}
            sx={{ color: appColors.primary.main }}
          >
            <VisibilityIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ]

  // Table state management
  const {
    data: tableData,
    totalCount,
    sortBy,
    sortOrder,
    page,
    rowsPerPage,
    searchTerm,
    handleSort,
    handleChangePage,
    handleChangeRowsPerPage,
    handleSearch,
  } = useTable(users, {
    initialSortBy: 'created_at',
    initialSortOrder: 'desc',
    initialRowsPerPage: 10,
    searchFields: ['email', 'id'],
  })

  // Calculate statistics
  const stats = useMemo(() => {
    const total = users.length
    const withCustomLimit = users.filter((u) => u.max_devices).length
    const recent = users.filter((u) => {
      if (!u.created_at) return false
      const created = new Date(u.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return created >= weekAgo
    }).length

    return { total, withCustomLimit, recent }
  }, [users])

  return (
    <Box>
      <PageHeader
        title="User Management"
        subtitle="View and manage all registered users in the system"
      />

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Users"
            value={stats.total}
            icon={<PersonIcon sx={{ fontSize: 40 }} />}
            color="primary"
            tooltip="Total number of registered users"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Custom Device Limits"
            value={stats.withCustomLimit}
            icon={<PersonIcon sx={{ fontSize: 40 }} />}
            color="secondary"
            tooltip="Users with custom maximum device limits"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="New This Week"
            value={stats.recent}
            icon={<PersonIcon sx={{ fontSize: 40 }} />}
            color="success"
            tooltip="Users registered in the last 7 days"
          />
        </Grid>
      </Grid>

      {/* Filter Bar */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={handleSearch}
        searchPlaceholder="Search by email or ID..."
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={tableData}
        loading={loading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        emptyMessage={searchTerm ? 'No users found matching your search' : 'No users found'}
      />
    </Box>
  )
}

export default Users
