import React from 'react'
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Stack,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import { appColors } from '../../constants/colors'

/**
 * FilterBar component for advanced filtering
 * @param {Object} props
 */
export default function FilterBar({
  searchValue = '',
  onSearchChange = null,
  searchPlaceholder = 'Search...',
  filters = [],
  activeFilters = {},
  onFilterChange = null,
  onClearFilters = null,
  showClearButton = true,
}) {
  return (
    <Box
      sx={{
        mb: 3,
        p: 2,
        backgroundColor: appColors.background.paper,
        borderRadius: 2,
        border: `1px solid ${appColors.border.default}`,
        boxShadow: appColors.shadows.sm,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        {onSearchChange && (
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: appColors.text.secondary, mr: 1 }} />,
            }}
            sx={{
              minWidth: 250,
              flex: 1,
              '& .MuiOutlinedInput-root': {
                backgroundColor: appColors.background.default,
                '& fieldset': {
                  borderColor: appColors.border.default,
                },
                '&:hover fieldset': {
                  borderColor: appColors.primary.light,
                },
                '&.Mui-focused fieldset': {
                  borderColor: appColors.primary.main,
                },
              },
            }}
          />
        )}

        {filters.map((filter) => (
          <FormControl key={filter.key} size="small" sx={{ minWidth: 150 }}>
            <InputLabel>{filter.label}</InputLabel>
            <Select
              value={activeFilters[filter.key] || ''}
              onChange={(e) => onFilterChange && onFilterChange(filter.key, e.target.value)}
              label={filter.label}
              sx={{
                backgroundColor: appColors.background.default,
              }}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {filter.options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}

        {showClearButton && onClearFilters && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ClearIcon />}
            onClick={onClearFilters}
            sx={{
              borderColor: appColors.border.default,
              color: appColors.text.secondary,
              '&:hover': {
                borderColor: appColors.primary.main,
                color: appColors.primary.main,
              },
            }}
          >
            Clear
          </Button>
        )}

        {Object.keys(activeFilters).filter(key => activeFilters[key]).length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(activeFilters)
              .filter(([_, value]) => value)
              .map(([key, value]) => {
                const filter = filters.find(f => f.key === key)
                const option = filter?.options.find(o => o.value === value)
                return (
                  <Chip
                    key={key}
                    label={`${filter?.label || key}: ${option?.label || value}`}
                    onDelete={() => onFilterChange && onFilterChange(key, '')}
                    size="small"
                    sx={{
                      backgroundColor: appColors.primary.lighter,
                      color: appColors.primary.darker,
                    }}
                  />
                )
              })}
          </Box>
        )}
      </Stack>
    </Box>
  )
}
