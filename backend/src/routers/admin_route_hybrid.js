const express = require('express');
const router = express.Router();
const { getAllClients } = require('../models/Client');
const { getAllReviews } = require('../models/Review_Sheets');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Admin Routes (Hybrid: Google Sheets)
 * @prefix /api/admin
 * All routes require ADMIN role
 */

// Apply authentication and ADMIN authorization to all routes
router.use(authenticate);
router.use(authorize(['ADMIN', 'SUPER_ADMIN']));

/**
 * Get admin dashboard data
 * @route GET /api/admin/dashboard
 */
router.get('/dashboard', async (req, res) => {
    try {
        const clients = await getAllClients();
        const allReviews = await getAllReviews(clients);

        // Calculate statistics
        const totalClients = clients.length;
        const activeClients = clients.filter(c => c.isActive !== 'false' && c.isActive !== false).length;
        const totalReviews = allReviews.length;
        const repliedReviews = allReviews.filter(r => r['AI Reply'] || r['Edited Reply'] || r['Final Reply']).length;
        const pendingReviews = totalReviews - repliedReviews;

        // Get recent reviews (last 10)
        const recentReviews = allReviews
            .sort((a, b) => new Date(b.Timestamp || b.timestamp) - new Date(a.Timestamp || a.timestamp))
            .slice(0, 10);

        res.json({
            success: true,
            data: {
                stats: {
                    totalClients,
                    activeClients,
                    totalReviews,
                    repliedReviews,
                    pendingReviews,
                },
                recentReviews,
            }
        });

    } catch (error) {
        console.error('Error getting dashboard data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard data',
            error: error.message
        });
    }
});

/**
 * Get all clients
 * @route GET /api/admin/clients
 */
router.get('/clients', async (req, res) => {
    try {
        const clients = await getAllClients();

        res.json({
            success: true,
            data: {
                clients,
                total: clients.length,
            }
        });

    } catch (error) {
        console.error('Error getting clients:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get clients',
            error: error.message
        });
    }
});

module.exports = router;
