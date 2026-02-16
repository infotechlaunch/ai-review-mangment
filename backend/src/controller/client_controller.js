const { getClientBySlug } = require('../models/Client');
const { getReviewsByTab, filterReviews, paginateReviews } = require('../models/Review_Sheets');
const {
    fetchGoogleReviews,
    getGoogleReview,
    batchGetGoogleReviews,
    postReplyToGoogle,
    deleteGoogleReviewReply
} = require('../services/googleBusinessService');
const Tenant = require('../models/Tenant');

// Import quota cooldown map from google_oauth_controller
const { quotaCooldowns } = require('./google_oauth_controller');

/**
 * Client Controller (Google Sheets Version + Google Business Profile API)
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
        const reviews = await getReviewsByTab(client.sheetTab, client.gid);

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
                    reviewURL: client.reviewURL,
                    fbPage: client.fbPage,
                    igHandle: client.igHandle,
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
        console.log('  Tenant Slug (from token):', userSlug);

        // Get client configuration
        const client = await getClientBySlug(userSlug);

        if (!client) {
            console.error('❌ Client not found for slug:', userSlug);
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        console.log('  ✅ Client found:', client.businessName);
        console.log('  Sheet Tab:', client.sheetTab);
        console.log('  GID:', client.gid);

        if (!client.sheetTab) {
            return res.status(400).json({
                success: false,
                message: 'Client does not have a review sheet configured'
            });
        }

        // Get all reviews for this client
        console.log(`  Fetching reviews from tab "${client.sheetTab}" with GID "${client.gid}"...`);
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

        // Include client info in response for dashboard
        result.client = {
            slug: client.slug,
            businessName: client.businessName,
            reviewURL: client.reviewURL,
            fbPage: client.fbPage,
            igHandle: client.igHandle,
        };

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

/**
 * Fetch reviews directly from Google Business Profile API
 * @route GET /api/client/google-reviews
 * @access CLIENT_OWNER, STAFF
 */
const fetchGoogleBusinessReviews = async (req, res) => {
    try {
        const { page = 1, limit = 50, orderBy = 'updateTime desc' } = req.query;
        const userSlug = req.user.slug || req.user.tenantSlug;

        console.log('📋 Fetching Google Business Reviews:');
        console.log('  User:', req.user.email);
        console.log('  Tenant Slug:', userSlug);

        // Get tenant/client with Google credentials
        const tenant = await Tenant.findOne({ where: { slug: userSlug } });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        // 🔥 CRITICAL: Check quota cooldown FIRST
        const cooldownKey = `quota_${tenant.id}`;

        if (quotaCooldowns.has(cooldownKey)) {
            const cooldownUntil = quotaCooldowns.get(cooldownKey);
            const remainingSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000);
            console.log(`⛔ fetchGoogleBusinessReviews blocked - quota cooldown active (${Math.ceil(remainingSeconds / 60)} min remaining)`);
            return res.status(429).json({
                success: false,
                message: 'Google API quota cooldown active. Please retry later.',
                retryAfter: remainingSeconds
            });
        }

        if (!tenant.gbp_accountId || !tenant.gbp_locationId) {
            return res.status(400).json({
                success: false,
                message: 'Google Business Profile not configured for this client'
            });
        }

        if (!tenant.gbp_accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Google Business Profile authentication required'
            });
        }

        // 🔥 LOGGING: Track Google API call source
        console.log('🔥 GOOGLE API CALL FROM:', req.originalUrl, '| Tenant:', tenant.slug);

        // Fetch reviews from Google Business Profile API
        const pageSize = Math.min(parseInt(limit), 50); // Max 50 per Google API
        const result = await fetchGoogleReviews(
            tenant.gbp_accountId,
            tenant.gbp_locationId,
            tenant.gbp_accessToken,
            {
                pageSize,
                orderBy,
            }
        );

        console.log(`✅ Fetched ${result.reviews.length} reviews from Google Business Profile`);

        res.json({
            success: true,
            data: {
                reviews: result.reviews,
                pagination: {
                    page: parseInt(page),
                    limit: pageSize,
                    total: result.totalReviews,
                    hasMore: !!result.nextPageToken,
                    nextPageToken: result.nextPageToken,
                },
                client: {
                    slug: tenant.slug,
                    businessName: tenant.businessName,
                },
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error fetching Google Business reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews from Google Business Profile',
            error: error.message
        });
    }
};

/**
 * Get a specific review from Google Business Profile
 * @route GET /api/client/google-reviews/:reviewId
 * @access CLIENT_OWNER, STAFF
 */
const getSpecificGoogleReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userSlug = req.user.slug || req.user.tenantSlug;

        console.log(`📋 Fetching Google Review: ${reviewId}`);

        const tenant = await Tenant.findOne({ where: { slug: userSlug } });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        if (!tenant.gbp_accountId || !tenant.gbp_locationId || !tenant.gbp_accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Google Business Profile not configured'
            });
        }

        const review = await getGoogleReview(
            tenant.gbp_accountId,
            tenant.gbp_locationId,
            reviewId,
            tenant.gbp_accessToken
        );

        console.log(`✅ Fetched review ${reviewId}`);

        res.json({
            success: true,
            data: review,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error fetching Google review:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch review from Google Business Profile',
            error: error.message
        });
    }
};

/**
 * Reply to a Google Business review
 * @route POST /api/client/google-reviews/:reviewId/reply
 * @access CLIENT_OWNER
 */
const replyToGoogleReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { replyText } = req.body;
        const userSlug = req.user.slug || req.user.tenantSlug;

        console.log(`📤 Posting reply to Google Review: ${reviewId}`);

        if (!replyText) {
            return res.status(400).json({
                success: false,
                message: 'Reply text is required'
            });
        }

        if (replyText.length > 4096) {
            return res.status(400).json({
                success: false,
                message: 'Reply text exceeds maximum length of 4096 characters'
            });
        }

        const tenant = await Tenant.findOne({ where: { slug: userSlug } });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        if (!tenant.gbp_accountId || !tenant.gbp_locationId || !tenant.gbp_accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Google Business Profile not configured'
            });
        }

        const result = await postReplyToGoogle(
            tenant.gbp_accountId,
            tenant.gbp_locationId,
            reviewId,
            replyText,
            tenant.gbp_accessToken
        );

        console.log(`✅ Successfully posted reply to review ${reviewId}`);

        res.json({
            success: true,
            data: result,
            message: 'Reply posted successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error posting reply to Google review:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to post reply to Google Business Profile',
            error: error.message
        });
    }
};

/**
 * Delete a reply to a Google Business review
 * @route DELETE /api/client/google-reviews/:reviewId/reply
 * @access CLIENT_OWNER
 */
const deleteGoogleReply = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userSlug = req.user.slug || req.user.tenantSlug;

        console.log(`🗑️ Deleting reply to Google Review: ${reviewId}`);

        const tenant = await Tenant.findOne({ where: { slug: userSlug } });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        if (!tenant.gbp_accountId || !tenant.gbp_locationId || !tenant.gbp_accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Google Business Profile not configured'
            });
        }

        const result = await deleteGoogleReviewReply(
            tenant.gbp_accountId,
            tenant.gbp_locationId,
            reviewId,
            tenant.gbp_accessToken
        );

        console.log(`✅ Successfully deleted reply to review ${reviewId}`);

        res.json({
            success: true,
            data: result,
            message: 'Reply deleted successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error deleting reply from Google review:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete reply from Google Business Profile',
            error: error.message
        });
    }
};

/**
 * Batch fetch reviews from multiple locations (for multi-location clients)
 * @route POST /api/client/google-reviews/batch
 * @access CLIENT_OWNER, STAFF
 */
const batchFetchGoogleReviews = async (req, res) => {
    try {
        const { locationNames, pageSize = 50, orderBy = 'updateTime desc', ignoreRatingOnlyReviews = false } = req.body;
        const userSlug = req.user.slug || req.user.tenantSlug;

        console.log('📋 Batch fetching Google Business Reviews');

        if (!locationNames || !Array.isArray(locationNames) || locationNames.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'locationNames array is required'
            });
        }

        const tenant = await Tenant.findOne({ where: { slug: userSlug } });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        if (!tenant.gbp_accountId || !tenant.gbp_accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Google Business Profile not configured'
            });
        }

        const result = await batchGetGoogleReviews(
            tenant.gbp_accountId,
            locationNames,
            tenant.gbp_accessToken,
            {
                pageSize: Math.min(parseInt(pageSize), 50),
                orderBy,
                ignoreRatingOnlyReviews,
            }
        );

        console.log(`✅ Batch fetched reviews for ${result.locationReviews.length} locations`);

        res.json({
            success: true,
            data: {
                locationReviews: result.locationReviews,
                nextPageToken: result.nextPageToken,
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error batch fetching Google Business reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to batch fetch reviews from Google Business Profile',
            error: error.message
        });
    }
};

module.exports = {
    getClientDashboard,
    getClientReviews,
    fetchGoogleBusinessReviews,
    getSpecificGoogleReview,
    replyToGoogleReview,
    deleteGoogleReply,
    batchFetchGoogleReviews,
};
