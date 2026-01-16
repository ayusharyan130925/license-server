# Codebase Structure & Architecture

This document outlines the improved codebase structure for the VisionAI License Admin Dashboard, organized in an ERP-style architecture for better maintainability and scalability.

## 📁 Directory Structure

```
ui/src/
├── api/                    # API client functions
│   ├── admin.js           # Admin API endpoints
│   └── client.js          # Base API client configuration
│
├── components/             # React components
│   ├── shared/            # Reusable shared components
│   │   ├── DataTable.jsx  # Advanced data table with sorting/pagination
│   │   ├── FilterBar.jsx  # Filtering component
│   │   ├── PageHeader.jsx # Consistent page headers with breadcrumbs
│   │   └── index.js       # Shared components exports
│   │
│   ├── Layout.jsx         # Main application layout (sidebar, header)
│   ├── LoadingSkeleton.jsx # Loading state components
│   ├── StatCard.jsx       # Statistics card component
│   └── ToastContext.jsx   # Toast notification context
│
├── constants/             # Application constants
│   └── colors.js         # Color scheme definitions
│
├── hooks/                 # Custom React hooks
│   ├── useDataFetch.js   # Data fetching hook with loading/error states
│   ├── useTable.js       # Table state management (sort, filter, paginate)
│   └── index.js          # Hooks exports
│
├── pages/                 # Page components
│   ├── Dashboard.jsx     # Dashboard page
│   ├── Users.jsx         # Users management page
│   ├── Devices.jsx        # Devices management page
│   ├── Leads.jsx          # Leads management page
│   └── ...               # Other pages
│
├── utils/                 # Utility functions
│   ├── formatters.js     # Date, number, text formatting utilities
│   └── index.js          # Utils exports
│
├── App.jsx                # Main application component
└── main.jsx               # Application entry point
```

## 🎯 Key Improvements

### 1. **Shared Components** (`components/shared/`)

Reusable components that follow ERP design patterns:

- **`DataTable`**: Advanced table component with:
  - Built-in sorting
  - Pagination
  - Customizable columns
  - Loading states
  - Empty states
  - Responsive design

- **`PageHeader`**: Consistent page headers with:
  - Breadcrumb navigation
  - Title and subtitle
  - Action buttons area
  - Auto-generated breadcrumbs

- **`FilterBar`**: Advanced filtering component with:
  - Search functionality
  - Multiple filter dropdowns
  - Active filter chips
  - Clear filters button

### 2. **Custom Hooks** (`hooks/`)

Reusable logic extraction:

- **`useDataFetch`**: Handles data fetching with:
  - Loading states
  - Error handling
  - Automatic toast notifications
  - Refetch capability

- **`useTable`**: Table state management with:
  - Sorting
  - Filtering
  - Pagination
  - Search
  - Custom filters

### 3. **Utility Functions** (`utils/`)

Common formatting and helper functions:

- **`formatters.js`**: Date, number, currency, text formatting
- Consistent formatting across the application

### 4. **Improved Layout**

- **Grouped Navigation**: Menu items organized by category
- **Collapsible Groups**: Expandable/collapsible menu sections
- **Active State Indicators**: Clear visual feedback for current page
- **User Profile Menu**: Quick access to user actions
- **Responsive Design**: Mobile-friendly sidebar

## 📝 Usage Examples

### Using DataTable Component

```jsx
import { DataTable } from '../components/shared'

const columns = [
  {
    id: 'email',
    label: 'Email',
    accessor: 'email',
    sortable: true,
  },
  {
    id: 'status',
    label: 'Status',
    accessor: 'status',
    type: 'chip',
    chipColor: 'success',
  },
]

<DataTable
  columns={columns}
  data={users}
  loading={loading}
  sortBy={sortBy}
  sortOrder={sortOrder}
  onSort={handleSort}
  page={page}
  rowsPerPage={rowsPerPage}
  totalCount={totalCount}
  onPageChange={handleChangePage}
  onRowsPerPageChange={handleChangeRowsPerPage}
/>
```

### Using useDataFetch Hook

```jsx
import { useDataFetch } from '../hooks'
import { getUsers } from '../api/admin'

function UsersPage() {
  const { data, loading, error, refetch } = useDataFetch(
    () => getUsers(),
    [],
    { errorMessage: 'Failed to load users' }
  )

  const users = data?.users || []
  // ... rest of component
}
```

### Using useTable Hook

```jsx
import { useTable } from '../hooks'

function UsersPage() {
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
}
```

### Using PageHeader Component

```jsx
import { PageHeader } from '../components/shared'
import { Button } from '@mui/material'

<PageHeader
  title="User Management"
  subtitle="View and manage all registered users"
  action={
    <Button variant="contained" onClick={handleAdd}>
      Add User
    </Button>
  }
  breadcrumbs={[
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Users', path: '/users' },
  ]}
/>
```

## 🎨 Design Principles

### ERP-Style Design

1. **Consistent Spacing**: Using Material-UI spacing system (8px grid)
2. **Color Scheme**: Blue-based primary colors with consistent status colors
3. **Typography**: Clear hierarchy with consistent font weights
4. **Shadows**: Subtle shadows for depth and elevation
5. **Borders**: Light borders for separation
6. **Hover States**: Clear feedback on interactive elements

### Component Patterns

- **StatCards**: Consistent statistics display
- **DataTables**: Standardized table layouts
- **FilterBars**: Unified filtering interface
- **PageHeaders**: Consistent page structure

## 🔄 Migration Guide

### Refactoring Existing Pages

1. **Replace manual data fetching** with `useDataFetch` hook
2. **Replace manual table logic** with `useTable` hook
3. **Replace custom tables** with `DataTable` component
4. **Add `PageHeader`** for consistent headers
5. **Add `FilterBar`** for search and filtering
6. **Use formatters** from `utils/formatters` instead of inline formatting

### Example: Before vs After

**Before:**
```jsx
const [users, setUsers] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  loadUsers()
}, [])

const loadUsers = async () => {
  try {
    setLoading(true)
    const data = await getUsers()
    setUsers(data.users || [])
  } catch (error) {
    showToast('Failed to load users', 'error')
  } finally {
    setLoading(false)
  }
}
```

**After:**
```jsx
const { data: usersData, loading } = useDataFetch(
  () => getUsers(),
  [],
  { errorMessage: 'Failed to load users' }
)

const users = usersData?.users || []
```

## 🚀 Benefits

1. **Code Reusability**: Shared components reduce duplication
2. **Consistency**: Unified design patterns across pages
3. **Maintainability**: Centralized logic in hooks and utils
4. **Developer Experience**: Easier to build new pages
5. **Performance**: Optimized hooks with memoization
6. **Type Safety**: Better structure for TypeScript migration

## 📚 Next Steps

1. Refactor remaining pages to use shared components
2. Add more utility functions as needed
3. Create additional shared components (modals, forms, etc.)
4. Consider TypeScript migration for better type safety
5. Add unit tests for hooks and shared components
