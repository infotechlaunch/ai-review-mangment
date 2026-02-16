# Google Business API Quota Request Form - Field-by-Field Guide

## 📋 Form URL

https://support.google.com/business/contact/api_default

**Alternative Path:**
Google Cloud Console → APIs & Services → Google Business Profile API → Quotas → "All Quotas" → Click on quota → "Edit Quotas" → "Apply for higher quota"

---

## 📝 Form Fields & How to Fill Them

### Section 1: Project Information

#### Field: **Project Name**

```
AI Review Management System
```

**Where to find:** Google Cloud Console → Select your project → See name at top

#### Field: **Project ID**

```
your-project-id-12345
```

**Where to find:** Google Cloud Console → Select project → Project ID shown under project name
**Format:** Usually `yourapp-123456` or `project-name-xxxxx`

#### Field: **Project Number**

```
123456789012
```

**Where to find:** Google Cloud Console → Dashboard → Project number
**Format:** A 12-digit number

---

### Section 2: API Information

#### Field: **API Name**

```
Google Business Profile API
```

or

```
My Business API
```

**Note:** Both names refer to the same API

#### Field: **Quota Metric**

Select from dropdown:

```
☑ Queries per day
```

**Description:** This is the main daily request limit

---

### Section 3: Quota Request

#### Field: **Current Quota Limit**

```
10,000
```

**Where to find:**

- Google Cloud Console → API → Quotas tab
- Or just enter 10,000 (default for new projects)

#### Field: **New Quota Limit Requested**

```
[Enter value from calculator]
```

**Examples:**

- Growing to 100 clients: Request `15,000`
- Growing to 200 clients: Request `25,000`
- Growing to 500+ clients: Request `50,000`

**⚠️ Important:**

- Don't request a huge number "just in case"
- Request 20-30% more than calculated need for buffer
- Can request additional increases later if needed

---

### Section 4: Business Justification

#### Field: **Use Case Description**

**Character Limit:** Usually 500-1000 characters

**Template:**

```
We are developing a SaaS platform that helps businesses manage their
Google Business Profile reviews. Our application provides automated
review monitoring, AI-powered sentiment analysis, and response
management for small to medium businesses.

Current Status:
- Active Clients: [X]
- Total Business Locations: [Y]
- Average Reviews per Location: [Z]
- Current Sync Frequency: Every [N] hours

Projected Growth (6 months):
- Expected Clients: [X]
- Expected Locations: [Y]
- Estimated Daily API Calls: [calculated from quota calculator]

API Call Breakdown:
• Review Listing: ~[X]% of requests
• Review Replies: ~[Y]% of requests
• Performance Metrics: ~[Z]% of requests

We help businesses respond faster to customer feedback, improving
their online reputation and customer satisfaction.
```

#### Field: **Traffic Estimates**

**Template:**

```
Current Daily API Calls: [X]
Current Peak Hour Calls: [Y]
Projected Daily (3 months): [X]
Projected Daily (6 months): [Y]

Growth Rate: [Z]% per month based on current customer acquisition
```

#### Field: **Optimization Measures**

**Template:**

```
We have implemented the following optimization measures to minimize
API usage:

1. Rate Limiting: Enforced 1000 requests per 100 seconds limit
2. Exponential Backoff: Implemented retry logic with increasing delays
3. Pagination Controls: Limited to 50 reviews per page, max 3 pages per sync
4. Response Caching: Reviews cached in PostgreSQL database
5. Differential Sync: Only fetch new/updated reviews, not entire history
6. Smart Scheduling: Low-activity locations synced less frequently
7. Batch Operations: Group multiple location requests where possible
8. Error Handling: 429 errors logged and queued for retry after cooldown

Our system is designed to use API quota efficiently while providing
reliable service to our clients.
```

---

### Section 5: Contact Information

#### Field: **Technical Contact Email**

```
developer@yourcompany.com
```

**Note:** Must be a Google account that has access to the Google Cloud Project

#### Field: **Technical Contact Name**

```
[Your Name or Lead Developer Name]
```

#### Field: **Business Contact Email**

```
business@yourcompany.com
```

**Note:** Can be the same as technical contact

#### Field: **Business Contact Name**

```
[Your Name or Business Owner]
```

#### Field: **Phone Number (Optional)**

```
+1-XXX-XXX-XXXX
```

**Format:** Include country code

---

## 📊 Complete Example (Filled Form)

### Example Scenario:

- 150 clients
- 450 total locations
- Syncing 4 times per day
- Calculator shows need for 18,000 requests/day

---

**Project Name:**

```
AI Review Management System
```

**Project ID:**

```
ai-review-mgmt-prod
```

**Project Number:**

```
987654321098
```

**API Name:**

```
Google Business Profile API
```

**Quota Metric:**

```
Queries per day
```

**Current Quota Limit:**

```
10,000
```

**New Quota Limit Requested:**

```
25,000
```

_(Requested 18,000 + 40% buffer = 25,000)_

**Use Case Description:**

```
We operate a SaaS platform providing automated Google Business Profile
review management for 150+ small businesses with 450 total locations.
Our service helps businesses monitor customer reviews, analyze
sentiment, and respond faster to customer feedback.

Current Usage:
- Active Clients: 150
- Total Locations: 450
- Sync Frequency: Every 6 hours (4x/day)
- Average Reviews per Location: 60

Projected Growth:
- 3-month clients: 200 (+33%)
- 6-month clients: 250 (+67%)
- Daily API calls: 18,000 (based on current load)

API Call Distribution:
• Review Listing: 16,200 calls/day (90%)
• Review Replies: 1,200 calls/day (7%)
• Performance Metrics: 600 calls/day (3%)

Your API enables us to help businesses improve customer engagement,
leading to better reviews and increased revenue for our clients.
```

**Traffic Estimates:**

```
Current Daily Requests: 18,000
Current Peak Hour: 2,500 (during business hours 9am-5pm)
Projected Daily (3 months): 22,000
Projected Daily (6 months): 28,000

Average Monthly Growth: 15% based on sales pipeline
```

**Optimization Measures:**

```
Implemented optimizations to ensure efficient API usage:

✓ Rate Limiting: 1,000 requests per 100 seconds enforced
✓ Exponential Backoff: Progressive retry delays up to 60 seconds
✓ Pagination: Limited to 50 reviews/page, max 3 pages per sync
✓ Caching: PostgreSQL database caches all review data
✓ Differential Sync: Fetch only new/updated reviews since last sync
✓ Smart Scheduling: Low-activity locations synced daily vs 4x/day
✓ Batch Processing: Multiple locations processed in parallel
✓ Quota Monitoring: Real-time tracking with automatic alerts at 70%
✓ Error Handling: 429 errors queued for retry after 5-minute cooldown

Code repository demonstrates best practices for API usage efficiency.
```

**Technical Contact:**

```
Name: John Smith
Email: john.smith@reviewmanager.com
Phone: +1-555-123-4567
```

**Business Contact:**

```
Name: Jane Doe
Email: jane.doe@reviewmanager.com
Phone: +1-555-123-4567
```

---

## ✅ Pre-Submission Checklist

Before submitting the form:

- [ ] Double-checked Project ID (copy-paste from Console)
- [ ] Verified Project Number (12 digits)
- [ ] Calculated actual quota need using quota-calculator.js
- [ ] Requested 20-40% more than calculated (buffer for growth)
- [ ] Provided specific numbers (clients, locations, calls)
- [ ] Listed optimization measures already implemented
- [ ] Described business value/use case clearly
- [ ] Used correct email addresses (with access to GCP project)
- [ ] Traffic estimates are realistic and based on actual data
- [ ] Included growth projections with timeline

---

## 📬 After Submission

### What to Expect:

1. **Confirmation Email** (Immediately)
   - You'll receive confirmation that form was submitted
   - Reference number provided

2. **Review Period** (2-5 business days)
   - Google reviews your request
   - May ask for clarification

3. **Approval Email** (If approved)
   - Quota automatically increased
   - No action needed
   - Changes take effect immediately

4. **Denial Email** (If denied)
   - Explanation provided
   - Can resubmit with more details
   - May suggest lower quota

### If Denied:

Common reasons and solutions:

**"Insufficient justification"**
→ Resubmit with more specific numbers and use cases

**"Requested quota too high"**
→ Request smaller increment (e.g., 20,000 instead of 50,000)

**"Need more usage data"**
→ Provide actual usage logs (from quota-usage.jsonl files)

**"Optimization not demonstrated"**
→ Add more details about caching, rate limiting, etc.

---

## 🔄 Requesting Additional Increases

Need more quota later?

1. Use the same form
2. Reference previous request/ticket number
3. Show actual usage from logs:
   ```
   Our previous quota of 25,000 is now at 85% utilization.
   Current average daily usage: 21,000 requests
   Usage logs attached from past 30 days.
   ```

---

## 💡 Pro Tips

1. **Be Specific:** Use exact numbers from your calculator
2. **Show Usage:** Include actual usage data if you have it
3. **Be Realistic:** Don't request 1,000,000 if you need 20,000
4. **Show Optimization:** Prove you're not wasting quota
5. **Business Value:** Explain how your app helps businesses
6. **Growth Based:** Tie request to actual customer growth
7. **Professional:** Use business email, not personal Gmail
8. **Documentation:** Mention you follow Google's best practices

---

## 📞 Need Help?

If form is unclear or you have questions:

**Google Cloud Support:**

- In Console: Navigation menu → Support → Create Case
- Select: "Quota increase" as issue type

**Community Help:**

- Stack Overflow: tag `google-my-business-api`
- Google Business API Forum: https://support.google.com/business/community

---

## Summary

**Key Points:**

1. Find form: https://support.google.com/business/contact/api_default
2. Use quota calculator first: `node scripts/quota-calculator.js`
3. Request realistic amount (calculated + 20-40% buffer)
4. Be specific with numbers
5. List optimizations already implemented
6. Wait 2-5 business days
7. Can request increases again later

**Most Important:**
→ Use the **business justification template** provided above
→ Include **specific numbers** from your quota calculator
→ Show you're **optimizing** API usage responsibly

Good luck! 🚀
