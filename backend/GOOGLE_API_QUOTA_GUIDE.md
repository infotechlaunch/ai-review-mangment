# Google Business Profile API Quota Management Guide

## Overview

This document provides guidance on managing Google Business Profile API quotas for the AI Review Management System.

## Default Quotas (No Request Needed)

- **Reviews API**: 10,000 requests/day
- **Business Information API**: 10,000 requests/day
- **Performance API**: 10,000 requests/day
- **Per User**: 1,000 requests per 100 seconds

## When to Request Quota Increase

### ✅ Request Increase If:

1. You have **10+ active clients** with multiple locations
2. You're getting frequent **429 errors** (quota exceeded)
3. You need **real-time** or **frequent syncing** (multiple times per day)
4. Your app is in **production** with real users
5. Your calculated daily requests exceed 8,000 (80% of limit)

### ❌ Don't Request Yet If:

- Still in development/testing phase
- Fewer than 5 active clients
- Default quota is sufficient
- Can work with scheduled sync (once or twice daily)

## How to Request Quota Increase

### Step 1: Access the Form

**Option A**: Direct Link

```
https://support.google.com/business/contact/api_default
```

**Option B**: Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Enabled APIs**
3. Click on **Google Business Profile API**
4. Click **Quotas** tab
5. Click **Request Quota Increase**

### Step 2: Prepare Required Information

#### Project Details

- **Project Name**: AI Review Management System
- **Project ID**: [Find in Google Cloud Console]
- **API Name**: Google Business Profile API (My Business API)

#### Quota Request

- **Current Quota**: 10,000 requests/day
- **Requested Quota**: [Calculate based on your needs - see formula below]

#### Business Justification Template

```
Subject: Google Business Profile API Quota Increase Request

Project: AI Review Management System
Project ID: [YOUR_PROJECT_ID]

BUSINESS CASE:
We are developing a SaaS platform that helps businesses monitor, analyze,
and respond to their Google Business Profile reviews. Our application provides
automated review management, sentiment analysis, and response suggestions powered
by AI.

CURRENT USAGE:
- Active Clients: [X]
- Total Business Locations: [Y]
- Average Reviews per Location: [Z]
- Sync Frequency: Every [N] hours

PROJECTED USAGE:
Based on our current growth trajectory and client commitments:
- Expected Clients (3 months): [X]
- Expected Clients (6 months): [X]
- Expected Daily API Requests: [calculated number]

API CALL BREAKDOWN:
1. Review Listing: [X] clients × [Y] locations × [Z] syncs/day = [total] calls
2. Review Replies: ~[X] replies/day × 2 API calls = [total] calls
3. Performance Metrics: [X] locations × [Y] syncs/day = [total] calls
4. Business Information Updates: ~[X] calls/day
───────────────────────────────────────────────────────
Total Estimated Daily Requests: [TOTAL]

OPTIMIZATION MEASURES IMPLEMENTED:
✓ Rate limiting (1000 requests per 100 seconds)
✓ Exponential backoff with retry logic
✓ Pagination controls (max 50 reviews per page)
✓ Response caching to minimize redundant API calls
✓ Batch operations where possible
✓ Database caching of review data
✓ Incremental sync (only fetch new/updated reviews)

BUSINESS VALUE:
Our platform helps businesses:
- Respond faster to customer reviews (avg. response time reduced by 70%)
- Improve online reputation and star ratings
- Gain insights from AI-powered sentiment analysis
- Maintain consistent brand voice across all responses

We are committed to responsible API usage and have implemented robust
rate limiting and caching mechanisms to minimize unnecessary API calls.

TECHNICAL CONTACT:
Name: [Your Name]
Email: [Your Email]
Phone: [Your Phone]

BILLING CONTACT:
Name: [Your Name]
Email: [Your Email]
Company: [Your Company]
```

## Calculate Your Required Quota

### Formula

```javascript
// Step 1: Calculate review sync calls
const reviewSyncCalls =
    numberOfClients ×
    avgLocationsPerClient ×
    syncsPerDay ×
    (1 + avgPagesPerLocation);  // 1 call per page to list reviews

// Step 2: Calculate reply calls
const replyCalls = avgRepliesPerDay × 2; // POST reply + GET to verify

// Step 3: Calculate performance metric calls
const performanceCalls =
    numberOfClients ×
    avgLocationsPerClient ×
    (30 / metricsUpdateFrequencyDays); // e.g., once per 30 days

// Step 4: Add business info updates
const businessInfoCalls = numberOfClients × avgLocationsPerClient × 0.1; // 10% update frequency

// Total Daily Calls
const totalDailyCalls =
    reviewSyncCalls +
    replyCalls +
    performanceCalls +
    businessInfoCalls;

// Add 30% buffer for errors, retries, and growth
const requestedQuota = Math.ceil(totalDailyCalls × 1.3);
```

### Example Calculation

```javascript
// Scenario: 50 clients, 3 locations each, sync 4x/day

const numberOfClients = 50;
const avgLocationsPerClient = 3;
const syncsPerDay = 4;
const avgPagesPerLocation = 2; // Most locations have <100 reviews
const avgRepliesPerDay = 30;
const metricsUpdateFrequencyDays = 7;

const reviewSyncCalls = 50 × 3 × 4 × 2 = 1,200 calls
const replyCalls = 30 × 2 = 60 calls
const performanceCalls = 50 × 3 × (30/7) ≈ 643 calls
const businessInfoCalls = 50 × 3 × 0.1 = 15 calls

const totalDailyCalls = 1,200 + 60 + 643 + 15 = 1,918 calls/day
const requestedQuota = 1,918 × 1.3 ≈ 2,500 calls/day

// ✅ Still within default quota! No increase needed.

// But if you had 100 clients:
// reviewSyncCalls = 100 × 3 × 4 × 2 = 2,400
// Total ≈ 3,836 calls/day → Still OK!

// At 200 clients:
// reviewSyncCalls = 200 × 3 × 4 × 2 = 4,800
// Total ≈ 7,336 calls/day → Request 10,000+ quota

// At 300 clients:
// reviewSyncCalls = 300 × 3 × 4 × 2 = 7,200
// Total ≈ 10,136 calls/day → NEED 15,000+ quota
```

## Optimization Strategies to Reduce API Usage

### 1. Implement Smart Caching

```javascript
// Cache review data and only fetch updates
const lastSyncTime = await getLastSyncTime(locationId);
// Only fetch reviews newer than lastSyncTime
```

### 2. Differential Sync

```javascript
// Instead of fetching all reviews, fetch only new/updated ones
// Google API supports filtering by update time
const newReviews = await fetchReviewsSince(lastUpdateTime);
```

### 3. Adjust Sync Frequency Based on Activity

```javascript
// High-activity locations: Sync every 6 hours
// Low-activity locations: Sync once per day
const syncFrequency = location.avgReviewsPerMonth > 50 ? 6 : 24;
```

### 4. Use Webhooks (if available in future)

```javascript
// Google may add webhook support for real-time notifications
// This would eliminate polling entirely
```

### 5. Batch Operations

```javascript
// Group multiple location requests where possible
const locations = await getAllClientLocations(clientId);
const promises = locations.map((loc) => fetchReviews(loc));
await Promise.all(promises);
```

### 6. Progressive Loading

```javascript
// Only load first page initially, load more on demand
const firstPage = await fetchReviews(locationId, { pageSize: 50 });
// Load additional pages only when user scrolls or requests
```

## Monitoring Your Quota Usage

### Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services** → **Google Business Profile API** → **Quotas**
3. View real-time usage and remaining quota

### Implement Usage Tracking in Your App

```javascript
// backend/src/utils/quotaMonitor.js
const quotaUsage = {
  daily: 0,
  hourly: 0,
  resetTime: null,
};

function trackAPICall(endpoint) {
  quotaUsage.daily++;
  quotaUsage.hourly++;

  // Alert when approaching limit
  if (quotaUsage.daily > 8000) {
    // 80% of default quota
    console.warn("⚠️ API quota at 80%");
    // Send alert email/notification
  }
}

// Reset counters
setInterval(
  () => {
    quotaUsage.hourly = 0;
  },
  60 * 60 * 1000,
); // Reset hourly

// Daily reset at midnight UTC
const resetDaily = () => {
  quotaUsage.daily = 0;
  quotaUsage.resetTime = new Date();
};
```

## Best Practices

### 1. Respect Rate Limits

✓ Already implemented in your `rateLimiter.js`
✓ Keep at 1000 requests per 100 seconds

### 2. Handle 429 Errors Gracefully

```javascript
if (error.response?.status === 429) {
  // Don't retry immediately
  // Queue for later or show user-friendly message
  await scheduleRetry(24 * 60 * 60 * 1000); // Retry after 24 hours
}
```

### 3. Use Pagination Wisely

```javascript
// Don't fetch all pages if not needed
const MAX_PAGES = 3; // You already have this ✓
const pageSize = 50; // You already have this ✓
```

### 4. Cache Aggressively

```javascript
// Cache review data in your PostgreSQL database
// Only fetch updates, not entire review history every time
```

### 5. Provide User Controls

```javascript
// Let users choose sync frequency
const syncOptions = ["Real-time", "Every 6 hours", "Daily", "Manual"];
```

## Response Times for Quota Increase Requests

| Request Type          | Typical Response Time |
| --------------------- | --------------------- |
| **Standard Increase** | 2-5 business days     |
| **Large Increase**    | 1-2 weeks             |
| **API Access Issues** | 24-48 hours           |

## What If Request is Denied?

If your quota increase request is denied:

1. **Review your justification** - Was it clear and detailed?
2. **Reduce request amount** - Ask for smaller increment
3. **Show current usage** - Provide actual usage metrics
4. **Explain optimizations** - Show you're using API efficiently
5. **Resubmit with more details** - Add specific business metrics

## Contact Google Support

If you need help:

- **API Technical Issues**: https://support.google.com/business/contact/api_default
- **General Support**: https://support.google.com/business/
- **Google Cloud Support**: https://cloud.google.com/support

## Summary Checklist

Before requesting quota increase:

- [ ] Calculate actual daily API usage
- [ ] Implement rate limiting (✓ Already done)
- [ ] Implement caching strategy
- [ ] Monitor current quota usage
- [ ] Have at least 10 active clients or clear growth plan
- [ ] Prepare detailed business justification
- [ ] Have Google Cloud Project ID ready
- [ ] Have technical and business contact info ready

## Additional Resources

- [Google Business Profile API Documentation](https://developers.google.com/my-business)
- [API Quotas and Limits](https://developers.google.com/my-business/content/quota-requests)
- [Best Practices](https://developers.google.com/my-business/content/best-practices)
