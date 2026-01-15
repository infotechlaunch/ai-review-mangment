# Admin Google Sheets Integration - Setup Guide

## Overview

This implementation allows admin users to view Google Sheets data in a dedicated admin dashboard when they log in.

## Features Added

### 1. Admin Dashboard Component

- **Location**: `frontend/src/components/pages/AdminDashboard.jsx`
- Displays Google Sheets data in a formatted table
- Includes refresh and export to CSV functionality
- Shows statistics about the data
- Responsive design with loading and error states

### 2. Admin Routes

- **Frontend Route**: `/admin` - Admin dashboard page
- **Backend Routes**:
  - `GET /api/admin/sheet-data` - Fetch Google Sheets data
  - `GET /api/admin/users` - Get all users
  - `POST /api/admin/verify` - Verify admin credentials

### 3. Login Logic Updated

- Checks if email contains "admin" or equals "admin@example.com"
- Redirects to `/admin` for admins
- Redirects to `/onboarding` for regular users
- Stores user role in localStorage

## Setup Instructions

### Step 1: Install Dependencies

#### Backend

```bash
cd backend
npm install googleapis dotenv
```

#### Frontend

No additional dependencies needed (uses native fetch API)

### Step 2: Get Google Sheets API Key

1. **Go to Google Cloud Console**

   - Visit: https://console.cloud.google.com/

2. **Create a New Project** (or use existing)

   - Click "Select a project" → "New Project"
   - Name it (e.g., "AI Review Management")
   - Click "Create"

3. **Enable Google Sheets API**

   - Go to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click on it and press "Enable"

4. **Create API Credentials**

   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key

5. **Restrict API Key** (Recommended)
   - Click on the API key you created
   - Under "API restrictions" → Select "Restrict key"
   - Choose "Google Sheets API"
   - Save

### Step 3: Make Google Sheet Publicly Accessible

For API Key method to work:

1. Open your Google Sheet
2. Click "Share" button (top right)
3. Change to "Anyone with the link" → "Viewer"
4. Copy the sheet ID from URL:
   - URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`
   - Your ID: `1jUNZfIToj49xQu5n7_-Nludj-NnH--8xt4eJRXwLeeQ`

### Step 4: Configure Environment Variables

Create or update `.env` file in `backend/` folder:

```env
PORT=4000
GOOGLE_SHEETS_API_KEY=your_api_key_here
```

### Step 5: Update Configuration

#### In `frontend/src/components/pages/AdminDashboard.jsx`:

Line 11-13, update:

```javascript
const SHEET_ID = "1jUNZfIToj49xQu5n7_-Nludj-NnH--8xt4eJRXwLeeQ"; // Already set
const API_KEY = "YOUR_GOOGLE_API_KEY"; // Replace with your API key
const SHEET_NAME = "Sheet1"; // Change to your sheet's tab name
```

#### In `backend/controller/admin_controller.js`:

Line 7-8, update:

```javascript
const SHEET_ID = "1jUNZfIToj49xQu5n7_-Nludj-NnH--8xt4eJRXwLeeQ"; // Already set
const RANGE = "Sheet1"; // Change to your sheet's tab name
```

### Step 6: Start the Application

#### Backend

```bash
cd backend
npm start
# or
node server.js
```

#### Frontend

```bash
cd frontend
npm run dev
```

## How to Use

### For Admin Login:

1. Go to `/login` page
2. Use any email containing "admin" (e.g., `admin@example.com`)
3. Enter any password
4. Click "Sign In"
5. You'll be redirected to `/admin` page
6. The Google Sheets data will load automatically

### For Regular User Login:

1. Go to `/login` page
2. Use any email without "admin" (e.g., `user@example.com`)
3. Enter any password
4. Click "Sign In"
5. You'll be redirected to `/onboarding` page

## Testing

### Test with Sample Data:

If Google Sheets API is not set up yet, the dashboard will show an error with a button to "Load Sample Data" for testing the UI.

### Admin Credentials for Testing:

- Email: `admin@example.com` (or any email with "admin")
- Password: `any password`

## Troubleshooting

### Error: "Failed to fetch data from Google Sheets"

**Possible causes:**

1. API key not configured
2. Google Sheets API not enabled
3. Sheet is not publicly accessible
4. Sheet name mismatch

**Solutions:**

- Verify API key is correct in both frontend and backend
- Check Google Cloud Console that Sheets API is enabled
- Ensure sheet sharing settings allow "Anyone with the link"
- Verify sheet name/tab name matches

### Error: "CORS policy"

Add CORS middleware to backend:

```bash
npm install cors
```

In `server.js`:

```javascript
const cors = require("cors");
app.use(cors());
```

### Sheet Data Not Displaying

1. Check browser console for errors
2. Verify sheet structure (first row should be headers)
3. Check network tab for API response
4. Try loading sample data to test UI

## Alternative: Using Backend Proxy

If you prefer to fetch data from backend instead of frontend:

### Update `AdminDashboard.jsx`:

```javascript
const fetchSheetData = async () => {
  try {
    setLoading(true);
    const response = await fetch("http://localhost:4000/api/admin/sheet-data");
    const data = await response.json();

    if (data.success) {
      setSheetData(data.data);
    }
    setLoading(false);
  } catch (err) {
    setError(err.message);
    setLoading(false);
  }
};
```

This way, API key stays secure on the backend.

## Customization

### Change Sheet Structure

If your sheet has different columns, they will automatically be displayed. The component reads headers from the first row.

### Add Filters

Add filter functionality in `AdminDashboard.jsx`:

```javascript
const [filter, setFilter] = useState("");
const filteredData = sheetData.filter((row) =>
  Object.values(row).some((val) =>
    val.toString().toLowerCase().includes(filter.toLowerCase())
  )
);
```

### Add Sorting

Add sorting functionality for columns as needed.

## Security Notes

⚠️ **Important Security Considerations:**

1. **API Keys**: Never commit API keys to Git
2. **Environment Variables**: Always use `.env` files for secrets
3. **Authentication**: Implement proper authentication (JWT, OAuth, etc.)
4. **Authorization**: Add middleware to verify admin access
5. **HTTPS**: Use HTTPS in production
6. **Rate Limiting**: Add rate limiting to API endpoints

## Next Steps

1. Implement proper authentication with JWT
2. Add role-based access control
3. Add write capabilities (update sheet data)
4. Add data validation
5. Implement real-time updates
6. Add audit logging for admin actions

## Support

For issues or questions, check:

- Google Sheets API Documentation: https://developers.google.com/sheets/api
- Node.js googleapis library: https://github.com/googleapis/google-api-nodejs-client
