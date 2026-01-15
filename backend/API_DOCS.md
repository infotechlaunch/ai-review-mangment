# API Documentation

Complete API reference for the AI Review Management System.

## Base URL

```
http://localhost:4000
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Get a token by logging in via `/api/auth/login`.

---

## Endpoints

### 1. Authentication

#### POST `/api/auth/login`

Login for both ADMIN and CLIENT users.

**Request Body:**
```json
{
  "email": "string",     // Admin email or client slug/businessName
  "password": "string"   // Password
}
```

**Success Response (Admin):**
```json
{
  "success": true,
  "role": "ADMIN",
  "email": "admin@reviewmgnt.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Admin login successful"
}
```

**Success Response (Client):**
```json
{
  "success": true,
  "role": "CLIENT",
  "slug": "client1",
  "businessName": "Business Name",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Client login successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

#### GET `/api/auth/verify`

Verify JWT token and get user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response:**
```json
{
  "success": true,
  "user": {
    "email": "admin@reviewmgnt.com",
    "role": "ADMIN"
  },
  "message": "Token is valid"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

### 2. Admin Endpoints

All admin endpoints require `role: ADMIN` in the JWT token.

#### GET `/api/admin/dashboard`

Get all clients from Client_Admin_Config sheet.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Success Response:**
```json
{
  "success": true,
  "data": [
    {
      "slug": "client1",
      "businessName": "Business 1",
      "packageTier": "Premium",
      "sheetTab": "Client1_Reviews",
      "WaitForApproval": "TRUE",
      "NoAutoPostNegRev": "FALSE",
      "SocialPostSetup": "TRUE",
      "BTM Enabled": "TRUE",
      "Business Type": "Restaurant",
      "reviewURL": "https://...",
      "fbPage": "https://facebook.com/...",
      "igHandle": "@business1",
      "whatsAppLink": "https://wa.me/...",
      "placeId": "ChIJ...",
      "locationId": "loc123",
      "account_resource": "acc123"
    }
  ],
  "totalClients": 10,
  "timestamp": "2026-01-09T09:48:08.000Z"
}
```

---

#### GET `/api/admin/clients`

Get all clients (same as dashboard).

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:** Same as `/api/admin/dashboard`

---

#### GET `/api/admin/reviews`

Get all reviews from all client tabs merged into a single list.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Success Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "ReviewKey": "REV001",
      "Timestamp": "2026-01-01T10:00:00Z",
      "Reviewer Name": "John Doe",
      "Star Rating": "5",
      "Review": "Great service!",
      "Auto Reply": "Thank you for your feedback!",
      "Edited Reply": "",
      "Approval Status": "Pending",
      "SentimentResult": "Positive",
      "Final Caption": "",
      "Review ID": "goog_123",
      "Edit TS": "",
      "Package_Tier": "Premium",
      "businessName": "Business 1",
      "slug": "client1"
    }
  ],
  "totalReviews": 150,
  "clientsProcessed": 10,
  "timestamp": "2026-01-09T09:48:08.000Z"
}
```

---

### 3. Client Endpoints

All client endpoints require `role: CLIENT` in the JWT token.

#### GET `/api/client/dashboard`

Get the authenticated client's configuration data.

**Headers:**
```
Authorization: Bearer <client-token>
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "slug": "client1",
    "businessName": "Business 1",
    "packageTier": "Premium",
    "sheetTab": "Client1_Reviews",
    "WaitForApproval": "TRUE",
    "NoAutoPostNegRev": "FALSE",
    "SocialPostSetup": "TRUE",
    "BTM Enabled": "TRUE",
    "Business Type": "Restaurant",
    "reviewURL": "https://...",
    "fbPage": "https://facebook.com/...",
    "igHandle": "@business1",
    "whatsAppLink": "https://wa.me/...",
    "placeId": "ChIJ...",
    "locationId": "loc123",
    "account_resource": "acc123"
  },
  "timestamp": "2026-01-09T09:48:08.000Z"
}
```

---

#### GET `/api/client/reviews`

Get the authenticated client's reviews from their sheetTab.

**Headers:**
```
Authorization: Bearer <client-token>
```

**Success Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "ReviewKey": "REV001",
      "Timestamp": "2026-01-01T10:00:00Z",
      "Reviewer Name": "John Doe",
      "Star Rating": "5",
      "Review": "Great service!",
      "Auto Reply": "Thank you for your feedback!",
      "Edited Reply": "",
      "Approval Status": "Pending",
      "SentimentResult": "Positive",
      "Final Caption": "",
      "Review ID": "goog_123",
      "Edit TS": "",
      "Package_Tier": "Premium"
    }
  ],
  "totalReviews": 25,
  "businessName": "Business 1",
  "slug": "client1",
  "timestamp": "2026-01-09T09:48:08.000Z"
}
```

---

### 4. Review Endpoints

Review endpoints are accessible by both ADMIN and CLIENT roles, with restrictions:
- **ADMIN**: Can access any review (must provide `slug` parameter)
- **CLIENT**: Can only access their own reviews

#### GET `/api/reviews/:reviewKey`

Get a single review by ReviewKey.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `slug` (required for ADMIN, ignored for CLIENT) - Client slug

**Example (Admin):**
```
GET /api/reviews/REV001?slug=client1
```

**Example (Client):**
```
GET /api/reviews/REV001
```

**Success Response:**
```json
{
  "success": true,
  "review": {
    "ReviewKey": "REV001",
    "Timestamp": "2026-01-01T10:00:00Z",
    "Reviewer Name": "John Doe",
    "Star Rating": "5",
    "Review": "Great service!",
    "Auto Reply": "Thank you for your feedback!",
    "Edited Reply": "",
    "Approval Status": "Pending",
    "SentimentResult": "Positive",
    "Final Caption": "",
    "Review ID": "goog_123",
    "Edit TS": "",
    "Package_Tier": "Premium",
    "businessName": "Business 1",
    "slug": "client1"
  },
  "timestamp": "2026-01-09T09:48:08.000Z"
}
```

**Error Response (Not Found):**
```json
{
  "success": false,
  "message": "Review not found"
}
```

---

#### PUT `/api/reviews/:reviewKey`

Update review reply and approval status.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (Admin):**
```json
{
  "slug": "client1",                    // Required for ADMIN
  "editedReply": "Thank you!",          // Optional
  "approvalStatus": "Approved"          // Optional
}
```

**Request Body (Client):**
```json
{
  "editedReply": "Thank you!",          // Optional
  "approvalStatus": "Approved"          // Optional
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Review updated successfully",
  "reviewKey": "REV001",
  "updates": {
    "Edited Reply": "Thank you!",
    "Approval Status": "Approved",
    "Edit TS": "2026-01-09T09:48:08.000Z"
  },
  "timestamp": "2026-01-09T09:48:08.000Z"
}
```

**Error Response (Access Denied):**
```json
{
  "success": false,
  "message": "Access denied. You can only access your own data.",
  "yourSlug": "client1",
  "requestedSlug": "client2"
}
```

---

### 5. Health Check

#### GET `/`

Health check endpoint to verify the API is running.

**Success Response:**
```json
{
  "success": true,
  "message": "AI Review Management System API",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/auth",
    "admin": "/api/admin",
    "client": "/api/client",
    "reviews": "/api/reviews"
  }
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided. Authorization header must be in format: Bearer <token>"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions.",
  "requiredRole": ["ADMIN"],
  "userRole": "CLIENT"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details (in development mode only)"
}
```

---

## Role-Based Access Control

### ADMIN Role
- Full access to all endpoints
- Can view all clients and all reviews
- Can edit any review
- Can access any client's data

### CLIENT Role
- Limited access to client-specific endpoints
- Can only view their own configuration
- Can only view their own reviews
- Can only edit their own reviews
- **Cannot** access other clients' data

---

## Google Sheets Structure

### Client_Admin_Config_DO_NOT_EDIT

**Sheet ID:** `1jUNZfIToj49xQu5n7_-Nludj-NnH--8xt4eJRXwLeeQ`

**Columns:**
- `slug` - Unique client identifier
- `businessName` - Business name
- `packageTier` - Package tier
- `sheetTab` - Tab name in review tracker
- `WaitForApproval` - Boolean flag
- `NoAutoPostNegRev` - Boolean flag
- `SocialPostSetup` - Boolean flag
- `BTM Enabled` - Boolean flag
- `Business Type` - Business type
- `reviewURL` - Review URL
- `fbPage` - Facebook page
- `igHandle` - Instagram handle
- `whatsAppLink` - WhatsApp link
- `placeId` - Google Place ID
- `locationId` - Location ID
- `account_resource` - Account resource

### AllClientsReviewTracker_DO_NOT_EDIT

**Sheet ID:** `1DfVmxHToJwT2jlVFJeZHpalIaYN4MIoPXIRIA3p8Ocg`

**Tabs:** One tab per client (specified in `sheetTab` column)

**Review Columns:**
- `ReviewKey` - Unique review identifier
- `Timestamp` - Review timestamp
- `Reviewer Name` - Reviewer name
- `Star Rating` - Star rating (1-5)
- `Review` - Review text
- `Auto Reply` - Auto-generated reply
- `Edited Reply` - Manually edited reply
- `Approval Status` - Approval status
- `SentimentResult` - Sentiment analysis
- `Final Caption` - Final caption
- `Review ID` - Review ID
- `Edit TS` - Last edit timestamp
- `Package_Tier` - Package tier

---

## Rate Limiting

Currently, there is no rate limiting implemented. In production, consider adding rate limiting to prevent abuse.

## CORS

CORS is enabled for the following origins:
- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:3000`

To add more origins, update the CORS configuration in `server.js`.

---

**Last Updated:** January 2026
