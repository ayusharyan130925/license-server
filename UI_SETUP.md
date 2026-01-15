# Admin Dashboard UI Setup Guide

## Quick Start

### 1. Install UI Dependencies

```bash
cd ui
npm install
```

### 2. Configure Environment

Create a `.env` file in the `ui/` directory:

```bash
cp ui/env.template ui/.env
```

Edit `ui/.env` and set:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ADMIN_TOKEN=your-admin-token-here
```

**Important:** The `VITE_ADMIN_TOKEN` must match the `ADMIN_TOKEN` in your server's `.env` file.

### 3. Start the UI

```bash
cd ui
npm run dev
```

The admin dashboard will be available at: `http://localhost:5173`

### 4. Start the Backend Server

In a separate terminal:

```bash
npm start
```

The API server should be running on: `http://localhost:3000`

## Accessing the Dashboard

1. Open your browser to `http://localhost:5173`
2. The dashboard will automatically authenticate using the `VITE_ADMIN_TOKEN`
3. Navigate through the different sections:
   - **Dashboard**: Overview statistics
   - **Users**: View and manage users
   - **Devices**: View all devices
   - **Subscriptions**: View subscription status
   - **App Versions**: Manage app versions
   - **Trial Config**: View trial configuration

## Features

### Dashboard
- Total users count
- Total devices count
- Active subscriptions count
- Active trials count

### Users
- List all users with search
- View user details
- See user's devices
- View user's subscriptions

### Devices
- List all devices
- View trial status
- See trial start/end dates
- Track device activity

### Subscriptions
- List all subscriptions
- Filter by status (active, trial, expired)
- View Stripe customer/subscription IDs

### App Versions
- Create new app versions
- Edit existing versions
- Set rollout percentages
- Configure mandatory updates
- Set minimum supported builds (kill switch)

### Trial Configuration
- View current trial settings
- Configure trial parameters (UI only - server settings require code changes)

## Troubleshooting

### "Failed to load" errors

1. **Check API connection:**
   - Verify backend server is running on port 3000
   - Check `VITE_API_BASE_URL` in `.env`

2. **Check authentication:**
   - Verify `VITE_ADMIN_TOKEN` matches server's `ADMIN_TOKEN`
   - Check browser console for 403 errors

3. **CORS issues:**
   - The dev server proxies `/api` requests automatically
   - If issues persist, check server CORS configuration

### Build errors

```bash
# Clear node_modules and reinstall
cd ui
rm -rf node_modules package-lock.json
npm install
```

### Port already in use

If port 5173 is in use, Vite will automatically use the next available port. Check the terminal output for the actual port.

## Production Build

To build for production:

```bash
cd ui
npm run build
```

The built files will be in `ui/dist/`. Serve these files with a static file server (nginx, Apache, etc.) and configure it to proxy `/api` requests to your backend.

## Development Tips

- The UI uses Material-UI components for a modern, responsive design
- All API calls are made through `src/api/client.js`
- Components are organized by feature in `src/pages/`
- The layout and navigation are in `src/components/Layout.jsx`

## Next Steps

1. Customize the theme in `src/App.jsx`
2. Add more admin features as needed
3. Implement user editing capabilities
4. Add export/import functionality
5. Add charts and analytics
