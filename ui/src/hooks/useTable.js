import { useState, useMemo } from 'react'

/**
 * Custom hook for table state management (sorting, filtering, pagination)
 * @param {Array} data - Array of data to display
 * @param {Object} options - Options object
 * @returns {Object} Table state and handlers
 */
export function useTable(data = [], options = {}) {
  const {
    initialSortBy = null,
    initialSortOrder = 'asc',
    initialPage = 0,
    initialRowsPerPage = 10,
    searchFields = [],
  } = options

  const [sortBy, setSortBy] = useState(initialSortBy)
  const [sortOrder, setSortOrder] = useState(initialSortOrder)
  const [page, setPage] = useState(initialPage)
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({})

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm || searchFields.length === 0) return data

    const searchLower = searchTerm.toLowerCase()
    return data.filter((item) =>
      searchFields.some((field) => {
        const value = getNestedValue(item, field)
        return value?.toString().toLowerCase().includes(searchLower)
      })
    )
  }, [data, searchTerm, searchFields])

  // Apply additional filters
  const filteredByFilters = useMemo(() => {
    if (Object.keys(filters).length === 0) return filteredData

    return filteredData.filter((item) => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined || value === '') return true
        const itemValue = getNestedValue(item, key)
        if (Array.isArray(value)) {
          return value.includes(itemValue)
        }
        return itemValue === value
      })
    })
  }, [filteredData, filters])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortBy) return filteredByFilters

    return [...filteredByFilters].sort((a, b) => {
      const aValue = getNestedValue(a, sortBy)
      const bValue = getNestedValue(b, sortBy)

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      }

      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()

      if (sortOrder === 'asc') {
        return aStr.localeCompare(bStr)
      } else {
        return bStr.localeCompare(aStr)
      }
    })
  }, [filteredByFilters, sortBy, sortOrder])

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage
    return sortedData.slice(start, start + rowsPerPage)
  }, [sortedData, page, rowsPerPage])

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleSearch = (value) => {
    setSearchTerm(value)
    setPage(0)
  }

  const handleFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
    setPage(0)
  }

  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
    setPage(0)
  }

  return {
    data: paginatedData,
    filteredData: sortedData,
    totalCount: filteredByFilters.length,
    sortBy,
    sortOrder,
    page,
    rowsPerPage,
    searchTerm,
    filters,
    handleSort,
    handleChangePage,
    handleChangeRowsPerPage,
    handleSearch,
    handleFilter,
    clearFilters,
  }
}

// Helper function to get nested object values
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, prop) => current?.[prop], obj)
}
