# Google API Quota Error Fix

## Problem

The application was experiencing "Quota exceeded" errors when connecting to Google Business Profile API:

```
Quota exceeded for quota metric 'Requests' and limit 'Requests per minute'
of service 'mybusinessaccountmanagement.googleapis.com'
```

## Root Cause

- Multiple API calls made in rapid succession during OAuth callback
- No rate limiting or retry mechanism
- No caching of frequently accessed data
- All operations happening synchronously during connection flow

## Solution Implemented

### 1. **Exponential Backoff Retry Logic**

- Automatically retries failed requests with increasing delays
- Max 3 retries with delays: 1s → 2s → 4s
- Specifically handles 429 (Too Many Requests) errors

### 2. **Rate Limiting**

Created `src/utils/rateLimiter.js` with three rate limiters:

- **Account Management API**: 50 requests/minute
- **Business Info API**: 50 requests/minute
- **My Business API (v4)**: 20 requests/minute

### 3. **Response Caching**

- Caches Google Business account data for 5 minutes
- Prevents redundant API calls for the same tenant
- Automatically invalidates after TTL

### 4. **Deferred Review Sync**

- Initial OAuth connection no longer syncs reviews immediately
- Prevents quota exhaustion during onboarding
- Reviews can be synced later through a scheduled job or manual trigger

### 5. **Strategic Delays**

- 2-second delay between location fetch and review sync
- Prevents rapid-fire API calls

## Files Modified

1. **`src/controller/google_oauth_controller.js`**
   - Added retry logic with exponential backoff
   - Implemented account data caching
   - Integrated rate limiters
   - Disabled immediate review sync during connection

2. **`src/services/googleBusinessService.js`**
   - Added retry logic for review fetching
   - Added retry logic for reply posting
   - Integrated rate limiters

3. **`src/utils/rateLimiter.js`** (NEW)
   - Rate limiter utility class
   - Pre-configured limiters for different Google APIs

## Usage

### Testing the Fix

1. Restart your backend server:

   ```bash
   cd backend
   npm start
   ```

2. Try connecting Google Business Profile again from the frontend

3. Monitor the console for rate limiting messages:
   - `⏳ Rate limit reached. Waiting...`
   - `⏳ Quota exceeded. Retrying in...`

### Future Enhancements

#### Option 1: Background Job for Review Sync

Create a scheduled job to sync reviews periodically:

```javascript
// In a new file: src/jobs/syncReviews.js
const cron = require("node-cron");

// Run every hour
cron.schedule("0 * * * *", async () => {
  console.log("Starting scheduled review sync...");
  // Sync reviews for all active tenants
});
```

#### Option 2: Manual Sync Endpoint

Add an endpoint to manually trigger review sync:

```javascript
// In google_oauth_controller.js
const syncReviews = async (req, res) => {
  try {
    const tenantId = req.user.tenant;
    const tenant = await Tenant.findById(tenantId);
    const locations = await Location.find({ tenant: tenantId, isActive: true });

    for (const location of locations) {
      await sleep(1000); // Delay between locations
      await fetchGoogleReviews(
        tenant.googleBusinessProfile.accountId,
        location.googleLocationId,
        tenant.googleBusinessProfile.accessToken,
      );
    }

    res.json({ success: true, message: "Reviews synced successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

## Google API Quota Limits

| API                            | Quota     | Our Limit |
| ------------------------------ | --------- | --------- |
| My Business Account Management | 60/min    | 50/min    |
| My Business Information        | 60/min    | 50/min    |
| My Business API (v4)           | 1,500/day | 20/min    |

## Monitoring

To monitor rate limiting effectiveness:

1. Check server logs for rate limit messages
2. Monitor `⏳` emoji indicators
3. Watch for successful retries after quota errors

## Best Practices Going Forward

1. **Always use rate limiters** when making Google API calls
2. **Cache data** when possible to reduce API calls
3. **Use exponential backoff** for retries
4. **Batch operations** when syncing multiple locations/reviews
5. **Schedule background jobs** for non-critical syncs
6. **Monitor quota usage** in Google Cloud Console

## Troubleshooting

### Still Getting Quota Errors?

1. Reduce rate limits in `src/utils/rateLimiter.js`
2. Increase delays in retry configuration
3. Check Google Cloud Console for actual quota limits
4. Consider requesting quota increase from Google

### Cache Not Working?

1. Verify `accountCache` Map is not being cleared
2. Check CACHE_TTL value (currently 5 minutes)
3. Ensure tenant IDs are consistent

### Retries Failing?

1. Check RETRY_CONFIG max retries and delays
2. Verify error detection logic catches all quota errors
3. Monitor network connectivity issues

## Support

For issues or questions:

1. Check server logs for detailed error messages
2. Verify Google Cloud Console settings
3. Review rate limiter configuration
