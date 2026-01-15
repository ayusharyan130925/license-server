# VisionAI License Admin Dashboard

React-based admin dashboard for managing users, devices, subscriptions, and app versions.

## Features

- **Dashboard**: Overview statistics (users, devices, subscriptions, trials)
- **User Management**: View all users, user details, devices, and subscriptions
- **Device Management**: View all devices and their trial status
- **Subscription Management**: View all subscriptions and their status
- **App Version Management**: Create, update, and manage app versions
- **Trial Configuration**: View and configure trial settings

## Tech Stack

- **React 18** - UI framework
- **Material-UI (MUI)** - Component library
- **React Router** - Routing
- **Axios** - HTTP client
- **Vite** - Build tool
- **date-fns** - Date formatting

## Setup

### 1. Install Dependencies

```bash
cd ui
npm install
```

### 2. Configure Environment

Create a `.env` file in the `ui/` directory:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ADMIN_TOKEN=your-admin-token-here
```

**Important:** Set `VITE_ADMIN_TOKEN` to match your server's `ADMIN_TOKEN` environment variable.

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Project Structure

```
ui/
├── src/
│   ├── api/           # API client and admin endpoints
│   ├── components/    # Reusable components (Layout)
│   ├── pages/         # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Users.jsx
│   │   ├── UserDetail.jsx
│   │   ├── Devices.jsx
│   │   ├── Subscriptions.jsx
│   │   ├── AppVersions.jsx
│   │   └── TrialConfig.jsx
│   ├── App.jsx        # Main app component with routing
│   ├── main.jsx       # Entry point
│   └── index.css      # Global styles
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## API Endpoints Used

The dashboard uses the following admin API endpoints:

- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - Get user details
- `GET /api/admin/users/:id/devices` - Get user devices
- `GET /api/admin/users/:id/subscriptions` - Get user subscriptions
- `GET /api/admin/devices` - List all devices
- `GET /api/admin/devices/:id` - Get device details
- `GET /api/admin/subscriptions` - List all subscriptions
- `GET /api/admin/versions` - List app versions
- `POST /api/admin/versions` - Create app version
- `PATCH /api/admin/versions/:id` - Update app version

## Authentication

All API requests require the `X-Admin-Token` header. This is automatically added by the API client using the `VITE_ADMIN_TOKEN` environment variable.

## Development

### Running the Dev Server

```bash
npm run dev
```

The dev server runs on port 5173 and proxies API requests to `http://localhost:3000/api`.

### Making Changes

- Components are in `src/components/`
- Pages are in `src/pages/`
- API client is in `src/api/`

## Production Deployment

1. Build the app:
   ```bash
   npm run build
   ```

2. Serve the `dist/` directory with a static file server (nginx, Apache, etc.)

3. Configure the server to proxy `/api` requests to your backend API

4. Set environment variables in your deployment environment

## Troubleshooting

### API Requests Failing

- Check that `VITE_ADMIN_TOKEN` matches your server's `ADMIN_TOKEN`
- Verify the server is running on the correct port
- Check browser console for CORS errors

### Build Errors

- Ensure all dependencies are installed: `npm install`
- Check Node.js version (requires Node 16+)

## License

ISC
