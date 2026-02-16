/**
 * Google API Quota Monitor
 * Tracks API usage and alerts when approaching limits
 */

const fs = require('fs').promises;
const path = require('path');

class QuotaMonitor {
    constructor() {
        this.quotas = {
            daily: {
                limit: parseInt(process.env.GOOGLE_API_DAILY_QUOTA) || 10000,
                used: 0,
                resetTime: this.getNextMidnightUTC()
            },
            per100Seconds: {
                limit: 1000,
                used: 0,
                resetTime: Date.now() + 100000
            }
        };

        this.logFile = path.join(__dirname, '../logs/quota-usage.json');
        this.alertThresholds = {
            warning: 0.7,   // 70%
            critical: 0.9   // 90%
        };

        // Load previous usage data
        this.loadUsageData();

        // Auto-reset timers
        this.startAutoReset();
    }

    /**
     * Get next midnight UTC timestamp
     */
    getNextMidnightUTC() {
        const now = new Date();
        const tomorrow = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1,
            0, 0, 0, 0
        ));
        return tomorrow.getTime();
    }

    /**
     * Track an API call
     */
    async track(endpoint = 'unknown', metadata = {}) {
        const now = Date.now();

        // Reset if expired
        if (now >= this.quotas.daily.resetTime) {
            await this.resetDaily();
        }
        if (now >= this.quotas.per100Seconds.resetTime) {
            this.resetPer100Seconds();
        }

        // Increment counters
        this.quotas.daily.used++;
        this.quotas.per100Seconds.used++;

        // Log the call
        await this.logUsage(endpoint, metadata);

        // Check for alerts
        this.checkAlerts();

        return {
            allowed: true,
            dailyRemaining: this.quotas.daily.limit - this.quotas.daily.used,
            per100sRemaining: this.quotas.per100Seconds.limit - this.quotas.per100Seconds.used
        };
    }

    /**
     * Check if request should be allowed
     */
    shouldAllow() {
        return {
            allowed: this.quotas.daily.used < this.quotas.daily.limit &&
                this.quotas.per100Seconds.used < this.quotas.per100Seconds.limit,
            reason: this.quotas.daily.used >= this.quotas.daily.limit
                ? 'Daily quota exceeded'
                : this.quotas.per100Seconds.used >= this.quotas.per100Seconds.limit
                    ? 'Rate limit exceeded (1000/100s)'
                    : null,
            dailyRemaining: this.quotas.daily.limit - this.quotas.daily.used,
            per100sRemaining: this.quotas.per100Seconds.limit - this.quotas.per100Seconds.used,
            resetTime: this.quotas.daily.resetTime
        };
    }

    /**
     * Get current usage statistics
     */
    getStats() {
        const dailyUsagePercent = (this.quotas.daily.used / this.quotas.daily.limit * 100).toFixed(2);
        const per100sUsagePercent = (this.quotas.per100Seconds.used / this.quotas.per100Seconds.limit * 100).toFixed(2);

        return {
            daily: {
                limit: this.quotas.daily.limit,
                used: this.quotas.daily.used,
                remaining: this.quotas.daily.limit - this.quotas.daily.used,
                usagePercent: parseFloat(dailyUsagePercent),
                resetTime: new Date(this.quotas.daily.resetTime).toISOString()
            },
            per100Seconds: {
                limit: this.quotas.per100Seconds.limit,
                used: this.quotas.per100Seconds.used,
                remaining: this.quotas.per100Seconds.limit - this.quotas.per100Seconds.used,
                usagePercent: parseFloat(per100sUsagePercent),
                resetTime: new Date(this.quotas.per100Seconds.resetTime).toISOString()
            },
            status: this.getStatus()
        };
    }

    /**
     * Get overall quota status
     */
    getStatus() {
        const dailyPercent = this.quotas.daily.used / this.quotas.daily.limit;

        if (dailyPercent >= this.alertThresholds.critical) {
            return 'CRITICAL';
        } else if (dailyPercent >= this.alertThresholds.warning) {
            return 'WARNING';
        } else {
            return 'OK';
        }
    }

    /**
     * Check and trigger alerts
     */
    checkAlerts() {
        const dailyPercent = this.quotas.daily.used / this.quotas.daily.limit;
        const stats = this.getStats();

        if (dailyPercent >= this.alertThresholds.critical && !this.criticalAlertSent) {
            this.sendAlert('CRITICAL', `API quota at ${stats.daily.usagePercent}%!`, stats);
            this.criticalAlertSent = true;
        } else if (dailyPercent >= this.alertThresholds.warning && !this.warningAlertSent) {
            this.sendAlert('WARNING', `API quota at ${stats.daily.usagePercent}%`, stats);
            this.warningAlertSent = true;
        }
    }

    /**
     * Send alert (extend this to email/SMS/webhook)
     */
    sendAlert(level, message, stats) {
        console.error(`\n${'='.repeat(60)}`);
        console.error(`🚨 QUOTA ALERT [${level}]: ${message}`);
        console.error(`Daily Usage: ${stats.daily.used}/${stats.daily.limit} (${stats.daily.usagePercent}%)`);
        console.error(`Remaining: ${stats.daily.remaining} requests`);
        console.error(`Resets at: ${stats.daily.resetTime}`);
        console.error(`${'='.repeat(60)}\n`);

        // TODO: Send email notification
        // TODO: Send webhook to monitoring service
        // TODO: Log to external monitoring (Sentry, DataDog, etc.)
    }

    /**
     * Reset daily quota
     */
    async resetDaily() {
        console.log(`[QuotaMonitor] Daily quota reset. Previous usage: ${this.quotas.daily.used}/${this.quotas.daily.limit}`);

        // Save stats before reset
        await this.saveUsageData();

        this.quotas.daily.used = 0;
        this.quotas.daily.resetTime = this.getNextMidnightUTC();
        this.warningAlertSent = false;
        this.criticalAlertSent = false;
    }

    /**
     * Reset per-100-second quota
     */
    resetPer100Seconds() {
        this.quotas.per100Seconds.used = 0;
        this.quotas.per100Seconds.resetTime = Date.now() + 100000;
    }

    /**
     * Start auto-reset timers
     */
    startAutoReset() {
        // Check every minute for daily reset
        setInterval(async () => {
            if (Date.now() >= this.quotas.daily.resetTime) {
                await this.resetDaily();
            }
        }, 60000);

        // Check every 10 seconds for per-100s reset
        setInterval(() => {
            if (Date.now() >= this.quotas.per100Seconds.resetTime) {
                this.resetPer100Seconds();
            }
        }, 10000);
    }

    /**
     * Log usage to file
     */
    async logUsage(endpoint, metadata) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            endpoint,
            metadata,
            dailyUsed: this.quotas.daily.used,
            dailyLimit: this.quotas.daily.limit
        };

        try {
            // Ensure logs directory exists
            const logsDir = path.dirname(this.logFile);
            await fs.mkdir(logsDir, { recursive: true });

            // Append to daily log file
            const logFileName = path.join(logsDir, `quota-${new Date().toISOString().split('T')[0]}.jsonl`);
            await fs.appendFile(logFileName, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error('[QuotaMonitor] Failed to log usage:', error.message);
        }
    }

    /**
     * Save usage data to persistent storage
     */
    async saveUsageData() {
        try {
            const logsDir = path.dirname(this.logFile);
            await fs.mkdir(logsDir, { recursive: true });
            await fs.writeFile(this.logFile, JSON.stringify(this.quotas, null, 2));
        } catch (error) {
            console.error('[QuotaMonitor] Failed to save usage data:', error.message);
        }
    }

    /**
     * Load previous usage data
     */
    async loadUsageData() {
        try {
            const data = await fs.readFile(this.logFile, 'utf8');
            const savedQuotas = JSON.parse(data);

            // Only restore if the daily quota hasn't reset
            if (Date.now() < savedQuotas.daily.resetTime) {
                this.quotas.daily.used = savedQuotas.daily.used;
                this.quotas.daily.resetTime = savedQuotas.daily.resetTime;
            }
        } catch (error) {
            // File doesn't exist or is corrupted, start fresh
            console.log('[QuotaMonitor] Starting with fresh quota counts');
        }
    }

    /**
     * Get usage report for date range
     */
    async getUsageReport(startDate, endDate) {
        const logsDir = path.dirname(this.logFile);
        const report = {
            period: { start: startDate, end: endDate },
            totalCalls: 0,
            byEndpoint: {},
            byDate: {}
        };

        try {
            const start = new Date(startDate);
            const end = new Date(endDate);

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const logFile = path.join(logsDir, `quota-${dateStr}.jsonl`);

                try {
                    const content = await fs.readFile(logFile, 'utf8');
                    const lines = content.trim().split('\n');

                    report.byDate[dateStr] = lines.length;
                    report.totalCalls += lines.length;

                    lines.forEach(line => {
                        const entry = JSON.parse(line);
                        report.byEndpoint[entry.endpoint] = (report.byEndpoint[entry.endpoint] || 0) + 1;
                    });
                } catch (error) {
                    // Log file doesn't exist for this date
                    report.byDate[dateStr] = 0;
                }
            }
        } catch (error) {
            console.error('[QuotaMonitor] Failed to generate report:', error.message);
        }

        return report;
    }
}

// Singleton instance
let instance = null;

module.exports = {
    getInstance() {
        if (!instance) {
            instance = new QuotaMonitor();
        }
        return instance;
    },

    // Convenience wrapper functions
    async track(endpoint, metadata) {
        const monitor = this.getInstance();
        return await monitor.track(endpoint, metadata);
    },

    shouldAllow() {
        const monitor = this.getInstance();
        return monitor.shouldAllow();
    },

    getStats() {
        const monitor = this.getInstance();
        return monitor.getStats();
    },

    getUsageReport(startDate, endDate) {
        const monitor = this.getInstance();
        return monitor.getUsageReport(startDate, endDate);
    }
};
