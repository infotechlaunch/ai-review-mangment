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
const Review = require('../models/Review');
const Location = require('../models/Location');
const { Op } = require('sequelize');

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
        let client = null;
        try {
            client = await getClientBySlug(userSlug);
        } catch (err) {
            console.warn(`  ⚠️ Warning: Could not fetch client config from Google Sheet: ${err.message}`);
        }

        // Always fetch Tenant to get settings
        const tenant = await Tenant.findOne({ where: { slug: userSlug } });
        
        if (!client) {
             // Fallback to tenant DB
             if (tenant) {
                client = {
                    slug: tenant.slug,
                    businessName: tenant.businessName,
                    gid: null,
                    sheetTab: null,
                    settings: tenant.settings // Attach settings to client object for response
                };
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'Client not found'
                });
            }
        } else if (tenant) {
            // If client found from Sheet, attach settings from Tenant DB
            client.settings = tenant.settings;
        }

        if (!client.sheetTab) {
            // Return empty stats if no sheet configured
             return res.json({
                success: true,
                data: {
                    client: {
                        slug: client.slug,
                        businessName: client.businessName,
                        packageTier: null,
                        reviewURL: null,
                    },
                    stats: {
                        totalReviews: 0,
                        repliedReviews: 0,
                        pendingReviews: 0,
                        averageRating: "0.00",
                        ratingBreakdown: { 5:0, 4:0, 3:0, 2:0, 1:0 },
                    },
                    recentReviews: [],
                },
                timestamp: new Date().toISOString()
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
                reviews: reviews.slice(0, 5) // Recent 5 reviews
            },
            settings: client.settings || {}, // Include settings from Tenant (if attached to client object or fetched separately)
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
const syncReviewsFromSheet = async (client, tenant, location) => {
    try {
        console.log(`  🔄 Background Sync: Fetching reviews from tab "${client.sheetTab}"...`);
        const sheetReviews = await getReviewsByTab(client.sheetTab, client.gid);
        console.log(`  ✅ Background Sync: Fetched ${sheetReviews.length} reviews from Sheet`);

        const existingReviews = await Review.findAll({
            where: { tenantId: tenant.id },
            attributes: ['id', 'review_key', 'google_review_id']
        });
        
        const existingReviewMap = new Map();
        existingReviews.forEach(r => {
            if (r.review_key) existingReviewMap.set(r.review_key, r.id);
            if (r.google_review_id) existingReviewMap.set(r.google_review_id, r.id);
        });

        const reviewsToUpsert = sheetReviews.map(r => {
            let createdAt = new Date();
            if (r.Timestamp) createdAt = new Date(r.Timestamp);
            else if (r.timestamp) createdAt = new Date(r.timestamp);
            else if (r.review_created_at) createdAt = new Date(r.review_created_at);
            
            if (isNaN(createdAt.getTime())) createdAt = new Date();

            const reviewKey = r.review_key || r.ReviewKey || r.google_review_id || `${(r.reviewer_name || 'anon').replace(/\s+/g, '_')}_${r.rating || 0}`;
            const googleReviewId = r.google_review_id || r['Review ID'] || reviewKey;
            const existingId = existingReviewMap.get(reviewKey) || existingReviewMap.get(googleReviewId);

            let ratingVal = parseInt(r.rating || r['Star Rating'] || 0) || 0;
            if (ratingVal > 5) ratingVal = 5;
            if (ratingVal < 0) ratingVal = 0;

            return {
                id: existingId,
                tenantId: tenant.id,
                locationId: location.id,
                review_key: reviewKey, 
                google_review_id: googleReviewId,
                reviewer_name: r.reviewer_name || r['Reviewer Name'] || 'Anonymous',
                rating: ratingVal,
                review_text: r.review_text || r.Review || '',
                sentiment: ['Positive', 'Negative', 'Neutral'].includes(r.sentiment) ? r.sentiment : 'Neutral',
                review_created_at: createdAt,
                ai_generated_reply: r.ai_generated_reply || r['Auto Reply'],
                final_caption: r.final_caption || r['Final Caption'],
                approval_status: r.approval_status || 'pending',
                approved_at: r.approved_at ? new Date(r.approved_at) : null,
                posted_to_google: !!r.posted_at
            };
        });
        
        const processedIds = new Set();
        const validReviews = [];

        for (const review of reviewsToUpsert) {
            if (review.rating <= 0) continue;
            if (processedIds.has(review.google_review_id)) continue;
            processedIds.add(review.google_review_id);
            validReviews.push(review);
        }

        if (validReviews.length > 0) {
            await Review.bulkCreate(validReviews, {
                updateOnDuplicate: [
                    'reviewer_name', 'rating', 'review_text', 'sentiment', 
                    'ai_generated_reply', 'final_caption', 'approval_status',
                    'review_created_at', 'review_key'
                ],
                conflictAttributes: ['id']
            });
            console.log(`  ✅ Background Sync: Synced ${validReviews.length} reviews to Database`);
        }
    } catch (error) {
        console.error('  ❌ Background Sync Failed:', error.message);
    }
};

const getClientReviews = async (req, res) => {
    try {
        const { replied, rating, page = 1, limit = 20 } = req.query;
        const userSlug = req.user.slug || req.user.tenantSlug;

        console.log('📋 Client Reviews Request:', req.user.email);

        // 1. Get client/tenant configuration
        let client = null;
        try {
            client = await getClientBySlug(userSlug);
        } catch (err) {
            console.warn(`  ⚠️ Warning: Could not fetch client config from Google Sheet: ${err.message}`);
        }

        const tenant = await Tenant.findOne({ where: { slug: userSlug } });

        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found in database' });
        }

        // If client config from sheet is missing, construct a basic one from tenant
        if (!client) {
            client = {
                slug: tenant.slug,
                businessName: tenant.businessName,
                sheetTab: null, // No sync possible without this
            };
        }

        // 2. Ensure a default Location exists
        let location = await Location.findOne({ where: { tenantId: tenant.id } });
        if (!location) {
            console.log('  Creating default location for tenant...');
            location = await Location.create({
                tenantId: tenant.id,
                name: tenant.businessName || 'Main Location',
                slug: userSlug || 'main',
                isActive: true
            });
        }

        // 3. Check for existing data in DB
        const whereClause = { tenantId: tenant.id };
        if (replied === 'true') {
            whereClause[Op.or] = [
                { final_caption: { [Op.ne]: null } }, 
                { ai_generated_reply: { [Op.ne]: null } }
            ];
        } else if (replied === 'false') {
             whereClause.final_caption = null;
             whereClause.ai_generated_reply = null;
        }

        if (rating) {
            whereClause.rating = parseInt(rating);
        }

        // Fetch current DB data
        const { count, rows } = await Review.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            order: [['review_created_at', 'DESC']]
        });

        const responseData = {
             reviews: rows,
             pagination: {
                 total: count,
                 page: parseInt(page),
                 limit: parseInt(limit),
                 totalPages: Math.ceil(count / parseInt(limit))
             },
             client: {
                slug: client.slug,
                businessName: client.businessName,
                reviewURL: client.reviewURL,
                fbPage: client.fbPage,
                igHandle: client.igHandle,
            }
        };

        // 4. Smart Response Strategy
        if (count > 0) {
            // Case A: Data exists. Return FAST, sync in BACKGROUND.
            console.log('  ⚡ Returning cached data immediately');
            res.json({
                success: true,
                data: responseData,
                timestamp: new Date().toISOString()
            });
            
            // Trigger background sync (don't await) if configured
            if (client.sheetTab) {
                syncReviewsFromSheet(client, tenant, location);
            } else {
                console.log('  ⚠️ Skipping sync: Sheet tab not configured');
            }
        } else {
            // Case B: No data. Must sync FIRST, then return.
            if (client.sheetTab) {
                console.log('  ⏳ No local data, syncing first...');
                await syncReviewsFromSheet(client, tenant, location);
            } else {
                console.log('  ⚠️ No local data and no sheet configured. Returning empty.');
            }
            
            // Re-fetch after sync
            const freshData = await Review.findAndCountAll({
                where: whereClause,
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit),
                order: [['review_created_at', 'DESC']]
            });
            
            responseData.reviews = freshData.rows;
            responseData.pagination.total = freshData.count;
            responseData.pagination.totalPages = Math.ceil(freshData.count / parseInt(limit));
            
            res.json({
                success: true,
                data: responseData,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ Error getting/syncing client reviews:', error);
        // Ensure response is sent if error occurs before any response
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to get client reviews',
                error: error.message
            });
        }
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

/**
 * Get client settings
 * @route GET /api/client/settings
 * @access CLIENT_OWNER, STAFF
 */
const getClientSettings = async (req, res) => {
    try {
        const userSlug = req.user.slug || req.user.tenantSlug;
        const tenantId = req.user.tenantId || req.user.tenant;

        console.log(`🔍 Getting settings for: ${userSlug || tenantId}`);

        let tenant;
        if (userSlug) {
            tenant = await Tenant.findOne({ where: { slug: userSlug } });
        } else if (tenantId) {
            tenant = await Tenant.findByPk(tenantId);
        }

        if (!tenant) {
            console.error('❌ Tenant not found for settings request', { userSlug, tenantId });
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        }

        res.json({
            success: true,
            settings: tenant.settings || {},
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting client settings:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error getting settings',
            error: error.message 
        });
    }
};

/**
 * Update Client Settings
 * Updates the 'settings' JSONB column in the Tenant model
 * @route PUT /api/client/settings
 * @access CLIENT_OWNER
 */
const updateClientSettings = async (req, res) => {
    try {
        const { autoApproval, tone, automation, autoPost } = req.body;
        const userSlug = req.user.slug || req.user.tenantSlug;

        // Find the Tenant
        const tenant = await Tenant.findOne({ where: { slug: userSlug } });

        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        }

        // Merge existing settings with updates
        const currentSettings = tenant.settings || {};
        const newSettings = {
            ...currentSettings,
            ...(autoApproval && { autoApproval }),
            ...(tone && { tone }),
            ...(automation && { automation }),
            ...(autoPost && { autoPost })
        };

        // Update the tenant
        tenant.settings = newSettings;
        await tenant.save();

        res.json({
            success: true,
            settings: tenant.settings,
            message: 'Settings updated successfully'
        });

    } catch (error) {
        console.error('Error updating client settings:', error);
        res.status(500).json({ success: false, message: 'Server error updating settings' });
    }
};

module.exports = {
    getClientDashboard,
    getClientReviews,
    getClientSettings,
    fetchGoogleBusinessReviews,
    getSpecificGoogleReview,
    replyToGoogleReview,
    deleteGoogleReply,
    batchFetchGoogleReviews,
    updateClientSettings
};
