import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
  TablePagination,
  Box,
  Typography,
  Chip,
  Tooltip,
  IconButton,
} from '@mui/material'
import { appColors } from '../../constants/colors'
import { TableSkeleton } from '../LoadingSkeleton'

/**
 * DataTable component with sorting, pagination, and customizable columns
 * @param {Object} props
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  sortBy = null,
  sortOrder = 'asc',
  onSort = null,
  page = 0,
  rowsPerPage = 10,
  totalCount = 0,
  onPageChange = null,
  onRowsPerPageChange = null,
  emptyMessage = 'No data available',
  stickyHeader = false,
  size = 'medium',
}) {
  const handleSort = (columnId) => {
    if (onSort && columnId) {
      onSort(columnId)
    }
  }

  const renderCell = (column, row, rowIndex) => {
    const value = column.accessor
      ? (typeof column.accessor === 'function'
          ? column.accessor(row, rowIndex)
          : row[column.accessor])
      : null

    if (column.render) {
      return column.render(value, row, rowIndex)
    }

    if (column.type === 'chip') {
      return (
        <Chip
          label={value}
          size="small"
          color={column.chipColor || 'default'}
          sx={{ fontWeight: 500 }}
        />
      )
    }

    if (column.type === 'date') {
      const dateValue = value ? new Date(value).toLocaleDateString() : '-'
      return (
        <Typography variant="body2" sx={{ color: appColors.text.primary }}>
          {dateValue}
        </Typography>
      )
    }

    if (column.type === 'datetime') {
      const dateValue = value
        ? new Date(value).toLocaleString()
        : '-'
      return (
        <Typography variant="body2" sx={{ color: appColors.text.secondary }}>
          {dateValue}
        </Typography>
      )
    }

    if (column.type === 'number') {
      return (
        <Typography variant="body2" sx={{ color: appColors.text.primary }}>
          {value?.toLocaleString() || '-'}
        </Typography>
      )
    }

    return (
      <Typography
        variant="body2"
        sx={{
          color: appColors.text.primary,
          ...(column.truncate && {
            maxWidth: column.truncate,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }),
        }}
      >
        {value || '-'}
      </Typography>
    )
  }

  if (loading) {
    return <TableSkeleton />
  }

  return (
    <Paper
      sx={{
        boxShadow: appColors.shadows.default,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <TableContainer
        sx={{
          maxHeight: stickyHeader ? 'calc(100vh - 300px)' : 'none',
        }}
      >
        <Table stickyHeader={stickyHeader} size={size}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  sx={{
                    backgroundColor: appColors.background.default,
                    color: appColors.text.secondary,
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: `2px solid ${appColors.border.default}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {column.sortable !== false && onSort ? (
                    <TableSortLabel
                      active={sortBy === column.id}
                      direction={sortBy === column.id ? sortOrder : 'asc'}
                      onClick={() => handleSort(column.id)}
                      sx={{
                        '& .MuiTableSortLabel-icon': {
                          color: `${appColors.primary.main} !important`,
                        },
                      }}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  align="center"
                  sx={{ py: 8 }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: appColors.text.tertiary }}
                  >
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => (
                <TableRow
                  key={row.id || rowIndex}
                  hover
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': {
                      backgroundColor: appColors.background.hover,
                    },
                  }}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      align={column.align || 'left'}
                      sx={{
                        color: appColors.text.primary,
                        borderBottom: `1px solid ${appColors.border.light}`,
                      }}
                    >
                      {renderCell(column, row, rowIndex)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {onPageChange && totalCount > 0 && (
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          sx={{
            borderTop: `1px solid ${appColors.border.default}`,
            '& .MuiTablePagination-toolbar': {
              padding: 2,
            },
          }}
        />
      )}
    </Paper>
  )
}
