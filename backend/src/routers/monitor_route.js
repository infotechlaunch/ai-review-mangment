/**
 * Monitoring Routes
 * View quota usage and system health
 */

const express = require('express');
const router = express.Router();
const quotaMonitor = require('../utils/quotaMonitor');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * GET /api/monitor/quota
 * Get current quota usage statistics
 */
router.get('/quota', authenticate, authorize(['ADMIN']), (req, res) => {
    try {
        const stats = quotaMonitor.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching quota stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quota statistics',
            error: error.message
        });
    }
});

/**
 * GET /api/monitor/quota/report
 * Get quota usage report for date range
 */
router.get('/quota/report', authenticate, authorize(['ADMIN']), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate query parameters are required'
            });
        }

        const report = await quotaMonitor.getUsageReport(startDate, endDate);

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Error generating quota report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate quota report',
            error: error.message
        });
    }
});

/**
 * GET /api/monitor/quota/check
 * Check if API calls should be allowed
 */
router.get('/quota/check', authenticate, (req, res) => {
    try {
        const check = quotaMonitor.shouldAllow();
        res.json({
            success: true,
            data: check
        });
    } catch (error) {
        console.error('Error checking quota:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check quota',
            error: error.message
        });
    }
});

/**
 * GET /api/monitor/health
 * System health check with quota status
 */
router.get('/health', (req, res) => {
    try {
        const stats = quotaMonitor.getStats();
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            quota: {
                status: stats.status,
                dailyUsage: `${stats.daily.used}/${stats.daily.limit}`,
                dailyRemaining: stats.daily.remaining,
                usagePercent: stats.daily.usagePercent
            }
        };

        // Set status code based on quota status
        const statusCode = stats.status === 'CRITICAL' ? 503 : 200;

        res.status(statusCode).json({
            success: true,
            data: health
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error.message
        });
    }
});

module.exports = router;
