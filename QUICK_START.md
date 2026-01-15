# 🚀 Quick Start Guide - Admin Login & Dashboard

## ✅ Backend is Already Running!

Your backend server is running on: **http://localhost:3000**

## 📝 Steps to Test Admin Login:

### 1. Start Frontend (if not running):

```bash
cd frontend
npm run dev
```

The frontend will run on: **http://localhost:5173** or **http://localhost:5174**

### 2. Open Browser:

Go to: **http://localhost:5173/login**

### 3. Login with Admin Credentials:

**Option 1:**

- Email: `admin@example.com`
- Password: `admin123`

**Option 2:**

- Email: `admin@reviewmgnt.com`
- Password: `admin@2024`

### 4. Click "Sign In"

### 5. What Will Happen:

✅ Frontend sends email & password to backend  
✅ Backend validates credentials  
✅ If valid admin → redirects to `/admin` dashboard  
✅ Dashboard automatically loads Google Sheets data  
✅ Data displays in a beautiful table

## 🎯 Features Available:

1. **Refresh Button** - Reload data from Google Sheets
2. **Export CSV** - Download data as CSV file
3. **Stats Overview** - Shows total records count
4. **Responsive Table** - Scroll horizontally for many columns

## 📊 About Google Sheets Data:

The dashboard tries to load data from your Google Sheet:

- Sheet ID: `1jUNZfIToj49xQu5n7_-Nludj-NnH--8xt4eJRXwLeeQ`

**If Google Sheets API is not configured:**

- You'll see an error message
- Click "Load Sample Data" to see demo data
- The UI and all features will work with sample data

## 🔧 To Enable Real Google Sheets Data:

See: **ADMIN_SETUP_GUIDE.md** for complete instructions

Quick steps:

1. Get Google API Key from Google Cloud Console
2. Update API key in `AdminDashboard.jsx` (line 12)
3. Make your Google Sheet publicly accessible
4. Refresh the admin dashboard

## 🧪 Test Regular User Login:

- Email: `user@example.com` (or any email without "admin")
- Password: `anything`
- Will redirect to: `/onboarding` page

## ❌ If Backend is Not Running:

```bash
cd backend
node server.js
```

Server should start on port 3000 (or check PORT in .env file)

## 🔍 Troubleshooting:

**Issue**: Login button doesn't work

- **Solution**: Check browser console for errors
- Make sure backend is running on port 3000

**Issue**: CORS error

- **Solution**: Already configured! Backend accepts requests from localhost:5173 and 5174

**Issue**: "Cannot connect to backend"

- **Solution**: Verify backend is running: http://localhost:3000

**Issue**: Google Sheets data not loading

- **Solution**: Click "Load Sample Data" button to test with demo data
- Or configure Google API key (see ADMIN_SETUP_GUIDE.md)

## 🎨 What You'll See:

1. **Login Page** - Clean design with email/password fields
2. **Admin Dashboard** - Modern purple gradient theme with:
   - Header with app title
   - Refresh and Export buttons
   - Stats cards showing total records
   - Data table with all Google Sheets columns
   - Responsive design for mobile

Enjoy! 🎉
