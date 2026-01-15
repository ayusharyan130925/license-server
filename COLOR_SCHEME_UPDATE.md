# Blue-Based Color Scheme Implementation

## Overview
The admin UI has been updated to use a consistent blue-based color scheme throughout the application. All colors are now centralized in a constants file for easy maintenance and consistency.

## Color Constants File
Created `ui/src/constants/colors.js` with comprehensive color definitions:

### Primary Colors
- **Primary Blue**: `#3b82f6` (blue-500) - Main brand color
- **Primary Light**: `#60a5fa` (blue-400)
- **Primary Dark**: `#2563eb` (blue-600)

### Status Colors
- **Success**: Green (`#10b981`) - For active/healthy states
- **Warning**: Orange (`#f59e0b`) - For trial/warning states
- **Error**: Red (`#ef4444`) - For expired/error states
- **Info**: Blue (`#3b82f6`) - For informational states

### Background Colors
- **Default**: Light gray (`#f9fafb`)
- **Paper**: White (`#ffffff`)
- **Card**: Light gray (`#f3f4f6`)

## Updated Components

### 1. **MUI Theme** (`App.jsx`)
- Updated primary color to blue-500 (`#3b82f6`)
- Updated secondary color to purple-500 (`#8b5cf6`)
- Added comprehensive status colors
- Enhanced component styling with blue-based gradients
- Improved card shadows and hover effects

### 2. **StatCard Component**
- Uses color constants for gradients
- Blue-based primary color scheme
- Smooth hover animations with color-matched shadows

### 3. **Layout Component**
- Blue gradient header background
- Consistent with brand colors

### 4. **Dashboard Page**
- All stat cards use blue-based color scheme
- Consistent color coding for different metrics

### 5. **Subscriptions Page**
- Color-coded status cards with gradients
- Success (green) for active subscriptions
- Warning (orange) for trials
- Error (red) for expired

### 6. **Devices Page**
- Status cards with blue-based color scheme
- Consistent color coding for trial statuses

### 7. **Abuse Metrics Page**
- Info alerts with blue-based styling
- Risk event cards with appropriate color coding
- Device creation cards with secondary color scheme

### 8. **Trial Config Page**
- Info alerts with blue-based styling
- Consistent color scheme throughout

## Color Usage Guidelines

### Primary Actions
- Use `appColors.primary.main` for primary buttons and actions
- Use `appColors.primary.dark` for hover states

### Status Indicators
- **Active/Success**: `appColors.status.success.main` (#10b981)
- **Trial/Warning**: `appColors.status.warning.main` (#f59e0b)
- **Expired/Error**: `appColors.status.error.main` (#ef4444)
- **Info**: `appColors.status.info.main` (#3b82f6)

### Backgrounds
- Use `appColors.background.default` for page backgrounds
- Use `appColors.background.paper` for cards and paper components
- Use `appColors.background.card` for card backgrounds

### Text
- Use `appColors.text.primary` for main text
- Use `appColors.text.secondary` for secondary text
- Use `appColors.text.tertiary` for muted text

## Helper Functions

### `getStatusColor(status)`
Returns appropriate color object based on status string:
```javascript
import { getStatusColor } from '../constants/colors'
const color = getStatusColor('active') // Returns success color object
```

### `getBadgeColor(status)`
Returns appropriate badge color object based on status:
```javascript
import { getBadgeColor } from '../constants/colors'
const badgeColor = getBadgeColor('active') // Returns success badge colors
```

## Benefits

1. **Consistency**: All components use the same color palette
2. **Maintainability**: Colors are centralized in one file
3. **Accessibility**: High contrast ratios for text readability
4. **Brand Identity**: Blue-based scheme creates cohesive brand experience
5. **Easy Updates**: Change colors in one place to update entire app

## Usage Example

```javascript
import appColors from '../constants/colors'

// Use in component
<Card sx={{
  backgroundColor: appColors.background.paper,
  border: `1px solid ${appColors.border.default}`,
  '&:hover': {
    backgroundColor: appColors.background.hover,
  }
}}>
  <Typography sx={{ color: appColors.primary.main }}>
    Primary Text
  </Typography>
</Card>
```

## React Functional Components

All components are already using React functional components with hooks:
- `useState` for state management
- `useEffect` for side effects
- `useNavigate` for navigation
- `useToast` for notifications
- Custom hooks where appropriate

## Next Steps (Optional)

1. Add dark mode support using the dark color variants
2. Add theme switching functionality
3. Create more color variants for specific use cases
4. Add color picker for admin customization
