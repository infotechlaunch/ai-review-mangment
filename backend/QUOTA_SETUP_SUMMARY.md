# Google Business API Quota - Complete Setup Summary

## 🎯 What I've Created For You

I've set up a complete Google Business API quota management system for your application. Here's everything that's been added:

## 📁 New Files Created

### 1. Documentation

- **[backend/GOOGLE_API_QUOTA_GUIDE.md](./GOOGLE_API_QUOTA_GUIDE.md)** - Complete guide on quota management, when to request increases, and how to fill out the form
- **[backend/QUOTA_TOOLS_README.md](./QUOTA_TOOLS_README.md)** - Quick reference for using the quota tools
- **This file** - Summary of everything

### 2. Tools & Scripts

- **[backend/scripts/quota-calculator.js](./scripts/quota-calculator.js)** - Interactive calculator to determine if you need quota increase
- **[backend/src/utils/quotaMonitor.js](./src/utils/quotaMonitor.js)** - Real-time quota usage tracker

### 3. API Endpoints

- **[backend/src/routers/monitor_route.js](./src/routers/monitor_route.js)** - Monitoring endpoints for quota stats
  - `GET /api/monitor/quota` - Current quota usage
  - `GET /api/monitor/quota/report` - Historical usage report
  - `GET /api/monitor/quota/check` - Check if calls are allowed
  - `GET /api/monitor/health` - System health with quota status

### 4. Integration

- Updated **[backend/src/services/googleBusinessService.js](./src/services/googleBusinessService.js)** to track all API calls
- Updated **[backend/server.js](./server.js)** to include monitoring routes
- Created **[backend/logs/](./logs/)** directory for usage logs

## 🚀 How to Use

### Step 1: Determine If You Need a Quota Increase

Run the interactive calculator:

```bash
cd backend
node scripts/quota-calculator.js
```

**Example Output:**

```
Number of clients: 50
Average locations per client: 3
Review syncs per day: 4

✅ DEFAULT QUOTA IS SUFFICIENT
   You're using ~25% of the default 10,000/day quota.
   No quota increase request needed at this time.
```

### Step 2: Monitor Your Actual Usage

After deploying your app, monitor real usage:

```bash
# Check current quota
curl http://localhost:4000/api/monitor/quota

# Check system health
curl http://localhost:4000/api/monitor/health
```

### Step 3: Request Quota Increase (If Needed)

If the calculator or monitoring shows you need more quota:

1. **Go to the form:**
   - Direct: https://support.google.com/business/contact/api_default
   - Or: Google Cloud Console → APIs & Services → Google Business Profile API → Quotas

2. **Use the template** from [GOOGLE_API_QUOTA_GUIDE.md](./GOOGLE_API_QUOTA_GUIDE.md)

3. **Fill in your details:**
   - Project Name: AI Review Management System
   - Current Quota: 10,000/day
   - Requested Quota: [from calculator]
   - Business Justification: [use template]

## 📊 Default Quotas (No Request Needed)

| API               | Daily Limit | Per 100 Seconds |
| ----------------- | ----------- | --------------- |
| Reviews API       | 10,000      | 1,000           |
| Business Info API | 10,000      | 1,000           |
| Performance API   | 10,000      | 1,000           |

## 🎯 Quick Decision Guide

### ❌ DON'T Request Quota Increase If:

- Still in development/testing
- Fewer than 10 clients
- Syncing once per day or less
- Calculator shows < 70% usage

### ✅ DO Request Quota Increase If:

- 100+ clients with multiple locations
- Need real-time syncing (every 1-2 hours)
- Calculator shows > 80% usage
- Getting 429 errors
- Projected growth in next 3 months will exceed quota

## 📈 Real Numbers - When You'll Hit Limits

Based on syncing 4 times per day:

| Clients | Locations | Daily API Calls | Quota Needed?    |
| ------- | --------- | --------------- | ---------------- |
| 10      | 30        | ~480            | ❌ No (5%)       |
| 50      | 150       | ~2,400          | ❌ No (24%)      |
| 100     | 300       | ~4,800          | ⚠️ Monitor (48%) |
| 150     | 450       | ~7,200          | ⚠️ Soon (72%)    |
| 200     | 600       | ~9,600          | ✅ Yes (96%)     |
| 250     | 750       | ~12,000         | ✅ Yes! (120%)   |

_Assumes 3 locations per client, 2 pages per location, 4 syncs/day_

## 🛠️ Features Included

### 1. Automatic Quota Tracking

Every Google API call is automatically tracked:

```javascript
// Happens automatically in googleBusinessService.js
await trackAPICall("reviews.list", { accountId, locationId });
```

### 2. Real-Time Monitoring

View current usage via API:

```javascript
// In your frontend
const response = await fetch("/api/monitor/quota");
const { daily, per100Seconds, status } = response.data;

console.log(`Used: ${daily.used}/${daily.limit}`);
console.log(`Status: ${status}`); // OK, WARNING, or CRITICAL
```

### 3. Automatic Alerts

The system logs warnings automatically:

- **70% usage** → WARNING logged
- **90% usage** → CRITICAL logged

Extend this in `/src/utils/quotaMonitor.js` to send emails or Slack notifications.

### 4. Usage Reports

Get historical data:

```bash
curl "http://localhost:4000/api/monitor/quota/report?startDate=2026-02-01&endDate=2026-02-07"
```

Returns:

```json
{
  "totalCalls": 15234,
  "byDate": {
    "2026-02-01": 2150,
    "2026-02-02": 2180,
    ...
  },
  "byEndpoint": {
    "reviews.list": 12000,
    "reviews.reply": 3234
  }
}
```

### 5. Usage Logs

All API calls logged to:

```
backend/logs/quota-2026-02-07.jsonl
```

Each line is JSON:

```json
{
  "timestamp": "2026-02-07T10:30:00.000Z",
  "endpoint": "reviews.list",
  "metadata": { "locationId": "123" },
  "dailyUsed": 1523
}
```

## 🔧 Configuration

Add to `.env` (optional):

```env
# Override default quota limit (default: 10000)
GOOGLE_API_DAILY_QUOTA=10000
```

## 📖 Complete Documentation

For detailed information, see these files:

1. **[QUOTA_TOOLS_README.md](./QUOTA_TOOLS_README.md)** - Quick reference and usage guide
2. **[GOOGLE_API_QUOTA_GUIDE.md](./GOOGLE_API_QUOTA_GUIDE.md)** - Complete guide with:
   - When to request quota increase
   - How to fill out the form
   - Business justification template
   - Optimization strategies
   - Calculation formulas
   - Best practices

## 🎬 Next Steps

### For Development (Now)

1. ✅ Files are already created and integrated
2. Test the calculator:
   ```bash
   cd backend
   node scripts/quota-calculator.js
   ```
3. Start your server and visit: http://localhost:4000/api/monitor/health

### Before Production

1. Run calculator with projected client numbers
2. Request quota increase if needed (allow 1-2 weeks for approval)
3. Set up monitoring dashboard in frontend
4. Configure alert notifications (email/Slack)
5. Test quota exhaustion handling

### In Production

1. Monitor quota daily: `/api/monitor/quota`
2. Review monthly reports to predict growth
3. Request quota increases proactively before hitting limits
4. Optimize sync frequencies based on actual usage

## ❓ Common Questions

**Q: Do I need to fill out the form NOW?**
**A:** Only if you have 100+ clients or are getting 429 errors. For development, the default quota is fine.

**Q: How long does approval take?**
**A:** 2-5 business days for standard increases, 1-2 weeks for large increases.

**Q: What if I'm not sure?**
**A:** Run the calculator with your projected numbers. If it shows < 80%, you're fine for now.

**Q: Can I request a huge quota just in case?**
**A:** Google prefers realistic requests. Request what you'll actually use in the next 3-6 months.

**Q: Is quota per project or per account?**
**A:** Per Google Cloud Project. Each project gets its own quota.

**Q: Does testing count toward quota?**
**A:** Yes! Use a separate Google Cloud Project for development/testing.

## 🎯 TL;DR - Just Tell Me What to Do

1. **Right now:** Nothing! The system is ready.

2. **To check if you need quota increase:**

   ```bash
   cd backend
   node scripts/quota-calculator.js
   ```

3. **If calculator says you need increase:**
   - Go to: https://support.google.com/business/contact/api_default
   - Use template in [GOOGLE_API_QUOTA_GUIDE.md](./GOOGLE_API_QUOTA_GUIDE.md)
   - Wait 2-5 days for approval

4. **To monitor usage:**
   - Visit: http://localhost:4000/api/monitor/health
   - Or check: `backend/logs/quota-*.jsonl`

5. **Detailed help:**
   - Read: [QUOTA_TOOLS_README.md](./QUOTA_TOOLS_README.md)
   - Or: [GOOGLE_API_QUOTA_GUIDE.md](./GOOGLE_API_QUOTA_GUIDE.md)

## 📞 Support Resources

- **Quota Request Form:** https://support.google.com/business/contact/api_default
- **Google Business API Docs:** https://developers.google.com/my-business
- **Google Cloud Console:** https://console.cloud.google.com
- **API Quotas Page:** Console → APIs & Services → Google Business Profile API → Quotas

---

**You're all set! 🎉**

The quota monitoring system is now integrated into your application. Start with the calculator to see if you need to request a quota increase, then use the monitoring endpoints to track real usage as you grow.
