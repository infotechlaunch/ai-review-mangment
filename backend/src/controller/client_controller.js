const { getClientBySlug } = require('../models/Client');
const { getReviewsByTab, filterReviews, paginateReviews } = require('../models/Review_Sheets');

/**
 * Client Controller (Google Sheets Version)
 * Handles client-specific operations
 */

/**
 * Get client dashboard data
 * @route GET /api/client/dashboard
 * @access CLIENT_OWNER, STAFF
 */
const getClientDashboard = async (req, res) => {
    try {
        const userSlug = req.user.slug || req.user.tenantSlug;

        // Get client configuration
        const client = await getClientBySlug(userSlug);

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        if (!client.sheetTab) {
            return res.status(400).json({
                success: false,
                message: 'Client does not have a review sheet configured'
            });
        }

        // Get all reviews for this client
        const reviews = await getReviewsByTab(client.sheetTab);

        // Calculate statistics
        const totalReviews = reviews.length;
        const repliedReviews = reviews.filter(r => r['AI Reply'] || r['Edited Reply'] || r['Final Reply']).length;
        const pendingReviews = totalReviews - repliedReviews;

        const ratingBreakdown = {
            5: reviews.filter(r => parseInt(r.Rating || r.rating) === 5).length,
            4: reviews.filter(r => parseInt(r.Rating || r.rating) === 4).length,
            3: reviews.filter(r => parseInt(r.Rating || r.rating) === 3).length,
            2: reviews.filter(r => parseInt(r.Rating || r.rating) === 2).length,
            1: reviews.filter(r => parseInt(r.Rating || r.rating) === 1).length,
        };

        const averageRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + parseInt(r.Rating || r.rating || 0), 0) / reviews.length
            : 0;

        // Get recent reviews (last 10)
        const recentReviews = reviews
            .sort((a, b) => new Date(b.Timestamp || b.timestamp) - new Date(a.Timestamp || a.timestamp))
            .slice(0, 10);

        res.json({
            success: true,
            data: {
                client: {
                    slug: client.slug,
                    businessName: client.businessName,
                    packageTier: client.packageTier,
                },
                stats: {
                    totalReviews,
                    repliedReviews,
                    pendingReviews,
                    averageRating: averageRating.toFixed(2),
                    ratingBreakdown,
                },
                recentReviews,
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error getting client dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get client dashboard',
            error: error.message
        });
    }
};

/**
 * Get client reviews with filters
 * @route GET /api/client/reviews
 * @access CLIENT_OWNER, STAFF
 */
const getClientReviews = async (req, res) => {
    try {
        const { replied, rating, page = 1, limit = 20 } = req.query;
        const userSlug = req.user.slug || req.user.tenantSlug;

        console.log('📋 Client Reviews Request:');
        console.log('  User:', req.user.email);
        console.log('  Role:', req.user.role);
        console.log('  Tenant Slug:', userSlug);
        console.log('  Full user object:', JSON.stringify(req.user, null, 2));

        // Get client configuration
        const client = await getClientBySlug(userSlug);

        console.log('  Client found:', client ? client.businessName : 'NOT FOUND');

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        if (!client.sheetTab) {
            return res.status(400).json({
                success: false,
                message: 'Client does not have a review sheet configured'
            });
        }

        console.log('  Sheet Tab:', client.sheetTab);
        console.log('  GID:', client.gid);

        // Get all reviews for this client
        let reviews = await getReviewsByTab(client.sheetTab, client.gid);

        console.log('  ✅ Fetched', reviews.length, 'reviews');

        // Add client info to reviews
        reviews = reviews.map(review => ({
            ...review,
            businessName: client.businessName,
            slug: client.slug,
        }));

        // Apply filters
        const filtered = filterReviews(reviews, { replied, rating });

        // Apply pagination
        const result = paginateReviews(filtered, page, limit);

        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting client reviews:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to get client reviews',
            error: error.message
        });
    }
};

module.exports = {
    getClientDashboard,
    getClientReviews,
};
