# Google API Quota Tools - Quick Reference

## 🚀 Quick Start

### 1. Calculate if You Need Quota Increase

Run the interactive calculator:

```bash
cd backend
node scripts/quota-calculator.js
```

**Example Session:**

```
Number of clients: 50
Average locations per client: 3
Review syncs per day: 4
Average reviews per location: 50
Average review replies per day: 10
Fetch performance metrics? yes

✅ DEFAULT QUOTA IS SUFFICIENT
   You're using ~25% of the default 10,000/day quota.
```

### 2. Monitor Real-Time Quota Usage

Check current quota usage:

```bash
curl http://localhost:4000/api/monitor/quota
```

**Response:**

```json
{
  "success": true,
  "data": {
    "daily": {
      "limit": 10000,
      "used": 1523,
      "remaining": 8477,
      "usagePercent": 15.23,
      "resetTime": "2026-02-08T00:00:00.000Z"
    },
    "status": "OK"
  }
}
```

### 3. View Usage Report

Get usage report for date range:

```bash
curl "http://localhost:4000/api/monitor/quota/report?startDate=2026-02-01&endDate=2026-02-07"
```

## 📊 Available API Endpoints

### GET /api/monitor/quota

Get current quota statistics

- **Auth**: Admin required
- **Returns**: Current daily and per-100s quota usage

### GET /api/monitor/quota/report

Get historical usage report

- **Auth**: Admin required
- **Query Params**:
  - `startDate` (YYYY-MM-DD)
  - `endDate` (YYYY-MM-DD)
- **Returns**: Usage breakdown by date and endpoint

### GET /api/monitor/quota/check

Check if API calls should be allowed

- **Auth**: User required
- **Returns**: Boolean `allowed` and remaining quota

### GET /api/monitor/health

System health with quota status

- **Auth**: None (public)
- **Returns**: System health + quota status

## 🎯 Quota Status Indicators

| Status       | Meaning     | Action                    |
| ------------ | ----------- | ------------------------- |
| **OK**       | < 70% used  | Continue normally         |
| **WARNING**  | 70-89% used | Consider optimization     |
| **CRITICAL** | 90%+ used   | Immediate action required |

## 📈 When to Request Quota Increase

### Use the Calculator

```bash
node scripts/quota-calculator.js
```

### General Guidelines

- **< 10 clients**: Default quota is sufficient
- **10-100 clients**: Monitor usage, may need increase
- **100+ clients**: Likely need quota increase
- **200+ clients**: Definitely need quota increase

### Calculation Formula

```
Daily API Calls =
  (Clients × Locations × SyncsPerDay × AvgPages) +
  (RepliesPerDay × 2) +
  PerformanceMetricCalls

If Daily > 8,000 → Request quota increase
```

## 🔧 Environment Variables

Add to your `.env`:

```env
# Optional: Override default quota (default: 10000)
GOOGLE_API_DAILY_QUOTA=10000

# Required for Google API
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri
```

## 📝 How to Request Quota Increase

### Step 1: Calculate Your Needs

```bash
node scripts/quota-calculator.js
```

### Step 2: Fill Out the Form

Go to: https://support.google.com/business/contact/api_default

Or navigate via Google Cloud Console:
**APIs & Services** → **Google Business Profile API** → **Quotas** → **Request Quota Increase**

### Step 3: Use the Template

See [GOOGLE_API_QUOTA_GUIDE.md](./GOOGLE_API_QUOTA_GUIDE.md) for detailed business justification template.

**Quick Template:**

```
Project: AI Review Management System
Current Quota: 10,000/day
Requested Quota: [from calculator]

We serve [X] clients with [Y] total locations.
Daily API calls: [calculated amount]

We have implemented:
✓ Rate limiting
✓ Caching
✓ Pagination controls
✓ Retry logic
```

## 🛠️ Optimization Tips

### 1. Reduce Sync Frequency

```javascript
// High-activity locations: 6 hours
// Low-activity locations: 24 hours
const syncInterval = location.reviewsPerMonth > 50 ? 6 : 24;
```

### 2. Implement Differential Sync

```javascript
// Only fetch new/updated reviews
const lastSync = await getLastSyncTime(locationId);
const newReviews = await fetchReviewsSince(lastSync);
```

### 3. Cache Aggressively

```javascript
// Store reviews in database
// Only fetch updates, not entire history
```

### 4. Adjust Page Limits

```javascript
// Fetch only what you need
const MAX_PAGES = location.totalReviews < 50 ? 1 : 3;
```

## 📊 Monitoring Dashboard (Frontend)

### Display Quota Status

```javascript
// Example React component
import { useEffect, useState } from "react";

function QuotaMonitor() {
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    const fetchQuota = async () => {
      const response = await fetch("/api/monitor/quota");
      const data = await response.json();
      setQuota(data.data);
    };

    fetchQuota();
    const interval = setInterval(fetchQuota, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (!quota) return null;

  const getStatusColor = () => {
    if (quota.status === "CRITICAL") return "red";
    if (quota.status === "WARNING") return "orange";
    return "green";
  };

  return (
    <div style={{ color: getStatusColor() }}>
      <h3>API Quota: {quota.daily.usagePercent}%</h3>
      <p>
        {quota.daily.used} / {quota.daily.limit} calls today
      </p>
      <p>{quota.daily.remaining} remaining</p>
      <p>Resets: {new Date(quota.daily.resetTime).toLocaleString()}</p>
    </div>
  );
}
```

## 🚨 Alerts & Notifications

The quota monitor automatically logs warnings when:

- 70% quota reached (WARNING)
- 90% quota reached (CRITICAL)

Logs location: `backend/logs/quota-usage.json`

### Extend with Email Alerts

Edit `backend/src/utils/quotaMonitor.js`:

```javascript
sendAlert(level, message, stats) {
  // Add your email service
  sendEmail({
    to: 'admin@yourapp.com',
    subject: `Quota Alert: ${level}`,
    body: `${message}\n\nUsage: ${stats.daily.usagePercent}%`
  });
}
```

## 📁 Log Files

Quota usage is logged to:

```
backend/logs/
├── quota-usage.json          # Current usage snapshot
├── quota-2026-02-07.jsonl    # Daily log (JSONL format)
├── quota-2026-02-06.jsonl
└── ...
```

### View Logs

```bash
# View today's usage
cat backend/logs/quota-$(date +%Y-%m-%d).jsonl | jq

# Count API calls by endpoint
cat backend/logs/quota-*.jsonl | jq -r '.endpoint' | sort | uniq -c
```

## 🔗 Resources

- [Full Guide](./GOOGLE_API_QUOTA_GUIDE.md) - Comprehensive quota management guide
- [Google Business API Docs](https://developers.google.com/my-business)
- [Quota Request Form](https://support.google.com/business/contact/api_default)
- [API Best Practices](https://developers.google.com/my-business/content/best-practices)

## ❓ FAQ

**Q: When will my quota reset?**
A: Daily quota resets at midnight UTC. Check `resetTime` in `/api/monitor/quota`

**Q: What happens if I exceed quota?**
A: You'll get 429 errors. The system won't retry automatically. Wait for reset or request increase.

**Q: How long does quota increase approval take?**
A: Typically 2-5 business days for standard increases, 1-2 weeks for large increases.

**Q: Can I request temporary quota increase?**
A: No, all quota increases are permanent. Request only what you need.

**Q: Does testing count against quota?**
A: Yes, all API calls count. Use a separate project for development/testing.

## 🎯 Quick Checklist

Before going to production:

- [ ] Run quota calculator with projected client numbers
- [ ] Set up quota monitoring dashboard
- [ ] Configure alert thresholds
- [ ] Request quota increase if needed (allow 1-2 weeks)
- [ ] Implement caching strategy
- [ ] Test quota exhaustion handling
- [ ] Document sync frequencies for clients
- [ ] Set up automated usage reports

---

**Need Help?**

- See [GOOGLE_API_QUOTA_GUIDE.md](./GOOGLE_API_QUOTA_GUIDE.md) for detailed guidance
- Check quota status: `curl http://localhost:4000/api/monitor/health`
- Run calculator: `node scripts/quota-calculator.js`
