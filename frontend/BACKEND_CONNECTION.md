# Frontend-Backend Connection Guide

## Overview
The frontend is now connected to the backend API for the Admin Dashboard functionality.

## Changes Made

### 1. **AdminDashboard.jsx** (`frontend/src/components/pages/AdminDashboard.jsx`)
   - ✅ Connected to backend API endpoint: `http://localhost:4000/api/admin/dashboard`
   - ✅ Implemented JWT authentication using token from localStorage
   - ✅ Displays client configuration data from Google Sheets via backend
   - ✅ Preserved the existing layout and UI design
   - ✅ Updated error messages to reflect backend connection
   - ✅ Updated loading and header messages

### 2. **Login.jsx** (`frontend/src/components/auth/Login.jsx`)
   - ✅ Updated API endpoint to: `http://localhost:4000/api/auth/login`
   - ✅ Stores JWT token in localStorage upon successful login
   - ✅ Handles ADMIN and CLIENT roles correctly
   - ✅ Redirects admin users to `/admin` route
   - ✅ Redirects client users to `/dashboard` route

### 3. **API Utility** (`frontend/src/utils/api.js`)
   - ✅ Created centralized API configuration
   - ✅ Helper functions for authenticated requests
   - ✅ Automatic token management and session handling
   - ✅ Logout functionality

## How It Works

### Authentication Flow
1. User logs in via Login component
2. Backend validates credentials and returns JWT token
3. Token is stored in localStorage
4. All subsequent API requests include the token in Authorization header

### Admin Dashboard Flow
1. AdminDashboard component loads
2. Fetches JWT token from localStorage
3. Makes authenticated request to `/api/admin/dashboard`
4. Backend returns client configuration data from Google Sheets
5. Data is displayed in the existing table layout

## Backend Endpoints Used

- **POST** `/api/auth/login` - User authentication
  - Request: `{ email, password }`
  - Response: `{ success, token, user: { role, email, businessName } }`

- **GET** `/api/admin/dashboard` - Get all clients (ADMIN only)
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ success, data: [...clients], totalClients, timestamp }`

## Environment Configuration

### Backend
- Port: `4000`
- CORS enabled for: `http://localhost:5173`, `http://localhost:5174`, `http://localhost:3000`

### Frontend
- Development server: `http://localhost:5173` (Vite default)
- API Base URL: `http://localhost:4000`

## Testing the Connection

### 1. Start Backend Server
```bash
cd backend
nodemon
# Server should start on http://localhost:4000
```

### 2. Start Frontend Server
```bash
cd frontend
npm run dev
# Server should start on http://localhost:5173
```

### 3. Login as Admin
- Email: `admin@reviewmgnt.com`
- Password: `admin@2024`

### 4. Navigate to Admin Dashboard
- After login, you should be redirected to `/admin`
- The dashboard will fetch and display client data from the backend

## LocalStorage Data

After successful login, the following data is stored:
- `token` - JWT authentication token
- `userRole` - User role (ADMIN or CLIENT)
- `userEmail` - User email address
- `userName` - Business name or email

## Error Handling

The application handles the following scenarios:
- ✅ No authentication token (redirects to login)
- ✅ Invalid/expired token (shows error, can load sample data)
- ✅ Backend server not running (shows connection error)
- ✅ Invalid credentials (shows alert message)

## Next Steps

To connect other components to the backend:
1. Import the API utility: `import { apiRequest } from '../../utils/api'`
2. Use `apiRequest('/api/endpoint')` for authenticated requests
3. The utility handles token management automatically

## Notes

- ✅ Layout and design preserved exactly as requested
- ✅ No UI/UX changes made
- ✅ Only backend connection implemented
- ✅ JWT authentication fully integrated
- ✅ Error handling and loading states maintained
