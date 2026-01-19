# AI Review Management System - Backend

A Node.js (Express) backend for an AI Review Management system using **Google Sheets as the only database**. Features JWT authentication and role-based access control (ADMIN and CLIENT).

## ✨ **No Google Console Setup Required!**

This backend uses **CSV export** to read data from Google Sheets - just make your ffsheets public and you're ready to go!

## 🚀 Quick Start (2 Steps!)

### Step 1: Make Sheets Public

1. Open [Client_Admin_Config](https://docs.google.com/spreadsheets/d/1jUNZfIToj49xQu5n7_-Nludj-NnH--8xt4eJRXwLeeQ/edit)
2. Click **Share** → **Anyone with the link** → **Viewer** → **Done**

3. Open [AllClientsReviewTracker](https://docs.google.com/spreadsheets/d/1DfVmxHToJwT2jlVFJeZHpalIaYN4MIoPXIRIA3p8Ocg/edit)
4. Click **Share** → **Anyone with the link** → **Viewer** → **Done**

### Step 2: Install & Run

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start the server
npm run dev
```

**That's it!** 🎉 The server is now running on `http://localhost:4000`

## 📋 Features

### Current Setup (Read-Only Mode)
✅ **No Google Console setup**  
✅ **No service account needed**  
✅ **No API keys required**  
✅ JWT authentication  
✅ Admin login & dashboard  
✅ Client login & dashboard  
✅ View all clients  
✅ View all reviews  
✅ Role-based access control  
✅ Client data isolation  

### What Works:
- ✅ Admin can view all clients and all reviews
- ✅ Client can view only their own data
- ✅ Authentication with JWT tokens
- ✅ All read operations

### What Doesn't Work (Read-Only Mode):
- ❌ Update review replies
- ❌ Update approval status
- ❌ Any write operations

> **Note:** To enable write operations, see [SIMPLE_SETUP.md](./SIMPLE_SETUP.md) for optional Google Sheets API setup.

## 🏗️ Architecture

- **Framework**: Express.js
- **Database**: Google Sheets (CSV Export)
- **Authentication**: JWT (JSON Web Tokens)
- **Roles**: ADMIN and CLIENT
- **Structure**: Clean MVC (Model-View-Controller)

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login (admin or client)
- `GET /api/auth/verify` - Verify JWT token

### Admin (ADMIN role required)
- `GET /api/admin/dashboard` - Get all clients
- `GET /api/admin/clients` - Get all clients
- `GET /api/admin/reviews` - Get all reviews from all clients

### Client (CLIENT role required)
- `GET /api/client/dashboard` - Get client configuration
- `GET /api/client/reviews` - Get client reviews

### Reviews (Both roles)
- `GET /api/reviews/:reviewKey` - Get single review
- `PUT /api/reviews/:reviewKey` - Update review (requires service account setup)

## 🧪 Testing

### Automated Tests
```bash
npm test
```

### Manual Testing
```bash
# Health check
curl http://localhost:4000/

# Admin login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@reviewmgnt.com","password":"admin@2024"}'

# Get all clients (use token from login)
curl -X GET http://localhost:4000/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Postman Collection
Import `postman_collection.json` for pre-configured API requests.

## 📚 Documentation

- **[SIMPLE_SETUP.md](./SIMPLE_SETUP.md)** - Quick setup guide (no Google Console!)
- **[API_DOCS.md](./API_DOCS.md)** - Complete API reference
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Advanced setup (for write operations)

## 🔐 Authentication

### Admin Login
```json
{
  "email": "admin@reviewmgnt.com",
  "password": "admin@2024"
}
```

### Client Login
```json
{
  "email": "client-slug",
  "password": "client123"
}
```

Replace `client-slug` with the actual slug from your Google Sheet.

## 🗃️ Google Sheets Structure

### Client_Admin_Config_DO_NOT_EDIT
**Sheet ID:** `1jUNZfIToj49xQu5n7_-Nludj-NnH--8xt4eJRXwLeeQ`

**Required Columns:**
- `slug` - Unique client identifier (used for login)
- `businessName` - Business name
- `sheetTab` - Tab name in review tracker

**Optional Columns:**
- All other columns (packageTier, WaitForApproval, reviewURL, etc.)

### AllClientsReviewTracker_DO_NOT_EDIT
**Sheet ID:** `1DfVmxHToJwT2jlVFJeZHpalIaYN4MIoPXIRIA3p8Ocg`

**Structure:**
- One tab per client (name must match `sheetTab` in Client_Admin_Config)
- Each tab contains reviews for that client

**Review Columns:**
- `ReviewKey` - Unique review identifier
- `Timestamp`, `Reviewer Name`, `Star Rating`, `Review`
- `Auto Reply`, `Edited Reply`, `Approval Status`
- All other columns are optional

## 🛠️ Troubleshooting

### "Cannot access Google Sheet"
- Make sure both sheets are set to "Anyone with the link can view"
- Check that sheet IDs in `.env` are correct

### "Write operations are not available"
- This is expected in read-only mode
- To enable write operations, see [SIMPLE_SETUP.md](./SIMPLE_SETUP.md)

### Server won't start
- Check if port 4000 is available
- Run `npm install` to install dependencies
- Make sure `.env` file exists

## 📦 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration (Google Sheets, JWT)
│   ├── middleware/      # Authentication & authorization
│   ├── models/          # Data models (Client, Review)
│   ├── controller/      # Business logic
│   └── routers/         # API routes
├── .env                 # Environment variables
├── server.js            # Main entry point
└── package.json         # Dependencies
```

## 🎯 Next Steps

1. ✅ Make Google Sheets public
2. ✅ Run `npm install` and `npm run dev`
3. ✅ Test with `npm test`
4. ✅ Integrate with your frontend
5. 📖 (Optional) Enable write operations - see [SIMPLE_SETUP.md](./SIMPLE_SETUP.md)

## 📝 Notes

- **No database other than Google Sheets** - All data from Google Sheets
- **No changes to existing sheets** - Works with current structure
- **Clean MVC architecture** - Professional, maintainable code
- **Production-ready** - Error handling, validation, security

## 📄 License

MIT

## 👨‍💻 Author

InfoTech Launch - AI Review Management System

---

**Ready to use in 2 steps. No Google Console. No service accounts. Just works!** 🚀
