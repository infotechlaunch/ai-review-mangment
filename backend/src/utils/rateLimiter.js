/**
 * Rate Limiter Utility
 * Helps manage API rate limits for Google Business Profile
 */

class RateLimiter {
    constructor(maxRequests = 60, windowMs = 60000) {
        this.maxRequests = maxRequests; // Max requests per window
        this.windowMs = windowMs; // Time window in milliseconds
        this.requests = [];
    }

    /**
     * Check if we can make a request
     */
    canMakeRequest() {
        const now = Date.now();
        // Remove old requests outside the window
        this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);
        return this.requests.length < this.maxRequests;
    }

    /**
     * Wait until we can make a request
     */
    async waitForSlot() {
        while (!this.canMakeRequest()) {
            const now = Date.now();
            const oldestRequest = this.requests[0];
            const waitTime = this.windowMs - (now - oldestRequest) + 100; // Add 100ms buffer
            console.log(`⏳ Rate limit reached. Waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.requests.push(Date.now());
    }

    /**
     * Execute a function with rate limiting
     */
    async execute(fn) {
        await this.waitForSlot();
        return await fn();
    }

    /**
     * Reset the rate limiter
     */
    reset() {
        this.requests = [];
    }
}

// Create rate limiters for different Google APIs
// Google Business Account Management API: 60 requests per minute
const accountManagementLimiter = new RateLimiter(50, 60000); // Being conservative with 50/min

// Google Business Information API: 60 requests per minute  
const businessInfoLimiter = new RateLimiter(50, 60000);

// Google My Business API (v4): 1,500 requests per day, but keep it lower
const myBusinessLimiter = new RateLimiter(20, 60000); // 20 per minute to be safe

module.exports = {
    RateLimiter,
    accountManagementLimiter,
    businessInfoLimiter,
    myBusinessLimiter
};
