const Review = require('../models/Review');
const Location = require('../models/Location');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const { generateReply, generateSocialCaption } = require('../config/openai');
const { fetchGoogleReviews, postReplyToGoogle, fetchPlacesReviews, fetchReviewsFromSearchApi } = require('../services/googleBusinessService');
const { runPipelineForReview, processPendingReviews } = require('../services/reviewPipelineService');
const { postReviewToSocialMedia } = require('../services/facebookService');
const { Op } = require('sequelize');

// Import quota helpers from google_oauth_controller
const { quotaCooldowns, refreshTenantAccessToken, getGoogleAccountId, getOAuth2Client, fetchAndSaveLocations } = require('./google_oauth_controller');

/**
 * Get a valid (non-expired) access token for a tenant, refreshing if needed.
 * @param {object} tenant  Sequelize Tenant instance with gbp_accessToken, gbp_tokenExpiry
 * @returns {Promise<string>} valid access token
 */
async function getValidAccessToken(tenant) {
    // Not connected at all
    if (!tenant.gbp_accessToken && !tenant.gbp_refreshToken) {
        throw new Error('GOOGLE_NOT_CONNECTED');
    }
    const expiry = tenant.gbp_tokenExpiry ? new Date(tenant.gbp_tokenExpiry) : null;
    const bufferMs = 5 * 60 * 1000; // refresh 5 min before actual expiry
    if (!expiry || Date.now() >= expiry.getTime() - bufferMs) {
        console.log(`🔄 Access token expired for tenant ${tenant.slug || tenant.id}, refreshing…`);
        return await refreshTenantAccessToken(tenant.id);
    }
    return tenant.gbp_accessToken;
}

/**
 * Review Controller
 * Handles review operations: fetch, AI generation, approval, and posting
 */

/**
 * Fetch reviews from Google and store in database
 * @route POST /api/reviews/fetch
 * @access CLIENT_OWNER, ADMIN
 */
const fetchReviews = async (req, res) => {
    try {
        const { locationId } = req.body;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const userTenant = req.user.tenant;

        // 🔥 CRITICAL: Check quota cooldown FIRST (before ANY processing)
        const cooldownKey = `quota_${userTenant}`;

        if (quotaCooldowns.has(cooldownKey)) {
            const cooldownUntil = quotaCooldowns.get(cooldownKey);
            const remainingSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000);
            console.log(`⛔ fetchReviews blocked - quota cooldown active (${Math.ceil(remainingSeconds / 60)} min remaining)`);
            return res.status(429).json({
                success: false,
                message: 'Google API quota cooldown active. Please retry later.',
                retryAfter: remainingSeconds
            });
        }

        // Validate location
        const location = await Location.findByPk(locationId, {
            include: [{ model: Tenant, as: 'tenant' }]
        });

        if (!location) {
            return res.status(404).json({
                success: false,
                message: 'Location not found'
            });
        }

        // Ensure tenant access
        if (userRole !== 'ADMIN' && location.tenant.id !== userTenant.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get tenant Google credentials
        // The tenant is already included in the location query
        const tenant = location.tenant;

        if (!tenant.gbp_accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Google Business Profile not connected. Please connect your account first.'
            });
        }

        // 🔥 LOGGING: Track Google API call source
        console.log('🔥 GOOGLE API CALL FROM:', req.originalUrl, '| Tenant:', tenant.slug);

        // Fetch reviews from Google (only first page to minimize API calls)
        const googleReviewsResult = await fetchGoogleReviews(
            tenant.gbp_accountId,
            location.googleLocationId,
            tenant.gbp_accessToken,
            { maxPages: 1 } // Only fetch first page
        );

        let newReviewsCount = 0;
        let updatedReviewsCount = 0;

        // FIX: Extract reviews array from result object
        const googleReviews = googleReviewsResult.reviews || [];

        // Process each review
        for (const googleReview of googleReviews) {
            // Check if review already exists
            const existingReview = await Review.findOne({
                where: { google_review_id: googleReview.google_review_id }
            });

            if (existingReview) {
                // Update existing review
                existingReview.has_reply = googleReview.has_reply;
                await existingReview.save();
                updatedReviewsCount++;
            } else {
                // Save new review, then kick off AI pipeline asynchronously
                const newReview = await Review.create({
                    tenantId: location.tenant.id,
                    locationId: location.id,
                    ...googleReview,
                });
                newReviewsCount++;

                // Pipeline runs in the background — don't block the HTTP response
                if (!googleReview.has_reply) {
                    runPipelineForReview(newReview.id, userId).catch(err =>
                        console.error(`[fetchReviews pipeline] review ${newReview.id}:`, err.message)
                    );
                }
            }
        }

        console.log(`✓ Fetched reviews: ${newReviewsCount} new, ${updatedReviewsCount} updated`);

        res.json({
            success: true,
            message: 'Reviews fetched successfully',
            data: {
                totalFetched: googleReviews.length,
                newReviews: newReviewsCount,
                updatedReviews: updatedReviewsCount,
            }
        });

    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews',
            error: error.message
        });
    }
};

/**
 * Fetch reviews from Google Places API (Alternative for Development Mode)
 * @route POST /api/reviews/fetch-places
 * @access CLIENT_OWNER, ADMIN
 */
const fetchReviewsFromPlaces = async (req, res) => {
    try {
        let { locationId, placeId: requestedPlaceId } = req.body;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const userTenantId = req.user.tenantId || req.user.tenant; // Handle different token structures

        // Validation: SearchAPI key must be in environment
        const apiKey = process.env.SEARCH_API_KEY;
        console.log('apiKey', apiKey);
        if (!apiKey) {
            return res.status(400).json({
                success: false,
                message: 'SEARCH_API_KEY is not configured in the server environment.'
            });
        }

        let location;
        if (!locationId) {
            // Find the FIRST location for this tenant
            const userSlug = req.user.slug || req.user.tenantSlug;
            const tenant = await Tenant.findOne({ where: { slug: userSlug } });
            
            if (!tenant) {
                 return res.status(404).json({ success: false, message: 'Tenant not found' });
            }

            location = await Location.findOne({ 
                where: { tenantId: tenant.id },
                include: [{ model: Tenant, as: 'tenant' }]
            });
        } else {
            // Validate specific location
            location = await Location.findByPk(locationId, {
                include: [{ model: Tenant, as: 'tenant' }]
            });
        }

        if (!location) {
            return res.status(404).json({
                success: false,
                message: 'No location found for this account. Please set up a location first.'
            });
        }

        // Ensure tenant access
        if (userRole !== 'ADMIN') {
             const userTid = userTenantId ? userTenantId.toString() : null;
             const locTid = (location && location.tenant && location.tenant.id) ? location.tenant.id.toString() : null;

             if (!userTid || !locTid || userTid !== locTid) {
                console.warn(`🛑 Forbidden: User tenant ${userTid} attempted to access location tenant ${locTid}`);
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: You do not have permission for this location.'
                });
             }
        }

        // Use requested placeId, or location's placeId, or fallback to the one user requested for testing
        const placeId = requestedPlaceId || location.googlePlaceId || location.googleLocationId || 'ChIJOW6f8wclJzoRMyn7Cz98L5Q';
        
        if (!placeId) {
             return res.status(400).json({
                success: false,
                message: 'No Google Place ID found.'
            });
        }

        console.log(`📡 Using SearchAPI (instead of Places API) for location: ${location.name} (ID: ${placeId})`);

        // Fetch reviews from SearchAPI
        const result = await fetchReviewsFromSearchApi(placeId, apiKey, { engine: 'google_maps_reviews', maxPages: 1 });
        const googleReviews = result.reviews || [];

        console.log(`📦 Fetched ${googleReviews.length} reviews from SearchAPI`);

        let newReviewsCount = 0;
        let updatedReviewsCount = 0;

        const currentTenant = location.tenant;

        // Process each review
        for (const googleReview of googleReviews) {
            try {
                // Check if review already exists
                const existingReview = await Review.findOne({
                    where: { google_review_id: googleReview.google_review_id }
                });

                if (existingReview) {
                    updatedReviewsCount++;
                } else {
                    // Explicitly map model fields to avoid data type or extra property errors
                    const reviewData = {
                        tenantId: currentTenant.id,
                        locationId: location.id,
                        google_review_id: googleReview.google_review_id,
                        reviewer_name: googleReview.reviewer_name || 'Anonymous',
                        rating: googleReview.rating || 5,
                        review_text: googleReview.review_text || '',
                        review_created_at: googleReview.review_created_at || new Date(),
                        has_reply: false,
                        source: 'SEARCHAPI'
                    };

                    // --- AI Auto-Reply Logic ---
                    try {
                        const tenantSettings = currentTenant.settings || {};
                        const toneSettings = tenantSettings.tone || {};
                        
                        // Generate AI Draft
                        const generatedReply = await generateReply(
                            reviewData.review_text,
                            reviewData.rating,
                            currentTenant.businessName,
                            toneSettings
                        );

                        reviewData.ai_generated_reply = generatedReply;
                        reviewData.ai_reply_generated_at = new Date();
                        reviewData.edited_reply = generatedReply;
                        reviewData.final_caption = generatedReply;

                        let sentiment = 'Neutral';
                        if (reviewData.rating >= 4) sentiment = 'Positive';
                        else if (reviewData.rating <= 2) sentiment = 'Negative';
                        reviewData.sentiment = sentiment;

                    } catch (aiError) {
                        console.error('Error in auto-reply generation for review:', aiError);
                    }

                    await Review.create(reviewData);
                    newReviewsCount++;
                }
            } catch (innerError) {
                console.error(`⚠️ Error processing review ${googleReview.google_review_id}:`, innerError);
            }
        }

        res.json({
            success: true,
            message: 'Reviews fetched from SearchAPI successfully.',
            data: {
                totalFetched: googleReviews.length,
                newReviews: newReviewsCount,
                updatedReviews: updatedReviewsCount,
                source: 'SEARCHAPI'
            }
        });

    } catch (error) {
        console.error('❌ Error fetching reviews via SearchAPI:', error);
        
        let errorMessage = 'Failed to fetch reviews: ' + error.message;

        // Make the error more descriptive if it's related to the API key missing or being invalid.
        if (error.message.includes('401') || error.message.includes('Invalid API key') || process.env.SEARCH_API_KEY === 'YOUR_SEARCHAPI_API_KEY_HERE') {
             errorMessage = 'SearchAPI key is missing or invalid. Please sign up at searchapi.io, get an API key, and add it to your backend/.env file as SEARCH_API_KEY.';
        }

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: errorMessage,
                error: error.message
            });
        }
    }
};

/**
 * Get reviews with filters
 * @route GET /api/reviews
 * @access CLIENT_OWNER, STAFF, ADMIN
 */
const getReviews = async (req, res) => {
    try {
        const { replied, rating, page = 1, limit = 20 } = req.query;
        const userRole = req.user.role;
        const userTenant = req.user.tenant;

        // Build query
        const whereClause = {};

        // Tenant isolation (except for admin)
        if (userRole !== 'ADMIN') {
            whereClause.tenantId = userTenant;
        }

        // Filter by replied status
        if (replied !== undefined) {
            whereClause.has_reply = replied === 'true';
        }

        // Filter by rating
        if (rating) {
            whereClause.rating = parseInt(rating);
        }

        // Execute query with pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows: reviews } = await Review.findAndCountAll({
            where: whereClause,
            include: [
                { model: Location, as: 'location', attributes: ['name', 'slug'] },
                { model: Tenant, as: 'tenant', attributes: ['businessName', 'slug'] },
                { model: User, as: 'approver', attributes: ['email', 'firstName', 'lastName'] }
            ],
            order: [['review_created_at', 'DESC']],
            offset: offset,
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                reviews,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(count / parseInt(limit)),
                }
            }
        });

    } catch (error) {
        console.error('Error getting reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get reviews',
            error: error.message
        });
    }
};

/**
 * Get single review by ID
 * @route GET /api/reviews/:id
 * @access CLIENT_OWNER, STAFF, ADMIN
 */
const getReviewById = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.user.role;
        const userTenant = req.user.tenant;

        const review = await Review.findByPk(id, {
            include: [
                { model: Location, as: 'location', attributes: ['name', 'slug'] },
                { model: Tenant, as: 'tenant', attributes: ['businessName', 'slug'] },
                { model: User, as: 'approver', attributes: ['email', 'firstName', 'lastName'] }
            ]
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Ensure tenant access
        if (userRole !== 'ADMIN' && review.tenantId.toString() !== userTenant.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: review
        });

    } catch (error) {
        console.error('Error getting review:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get review',
            error: error.message
        });
    }
};

/**
 * Generate AI reply for a review
 * @route POST /api/reviews/:id/generate-reply
 * @access CLIENT_OWNER, ADMIN
 */
const generateAIReply = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.user.role;
        const userTenant = req.user.tenant;

        const review = await Review.findByPk(id, {
            include: [{ model: Tenant, as: 'tenant', attributes: ['businessName', 'settings'] }]
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Ensure tenant access
        if (userRole !== 'ADMIN' && review.tenantId.toString() !== userTenant.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Generate AI reply with tenant settings
        const tenantSettings = review.tenant.settings || {};
        const toneSettings = tenantSettings.tone || {};

        const aiReply = await generateReply(
            review.review_text,
            review.rating,
            review.tenant.businessName,
            toneSettings
        );

        // Update review with AI-generated reply
        review.ai_generated_reply = aiReply;
        review.ai_reply_generated_at = new Date();
        review.edited_reply = aiReply; // Set as initial editable reply
        review.final_caption = aiReply; // Set as final caption (can be approved)
        await review.save();

        console.log(`✓ Generated AI reply for review ${review.id}`);

        res.json({
            success: true,
            message: 'AI reply generated successfully',
            data: {
                reviewId: review.id,
                aiReply,
                generatedAt: review.ai_reply_generated_at,
            }
        });

    } catch (error) {
        console.error('Error generating AI reply:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate AI reply',
            error: error.message
        });
    }
};

/**
 * Approve and post reply to Google
 * @route POST /api/reviews/:id/approve-reply
 * @access CLIENT_OWNER, ADMIN
 */
const approveAndPostReply = async (req, res) => {
    try {
        const { id } = req.params;
        const { editedReply } = req.body;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const userTenant = req.user.tenant;

        const review = await Review.findByPk(id, {
            include: [
                { model: Tenant, as: 'tenant' },
                { model: Location, as: 'location' }
            ]
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Ensure tenant access
        if (userRole !== 'ADMIN' && review.tenantId.toString() !== userTenant.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if review already has a reply posted
        if (review.posted_to_google) {
            return res.status(400).json({
                success: false,
                message: 'Reply already posted to Google'
            });
        }

        // Use edited reply if provided, otherwise use final_caption, edited_reply, or AI-generated
        const replyToPost = editedReply || review.final_caption || review.edited_reply || review.ai_generated_reply;

        if (!replyToPost) {
            return res.status(400).json({
                success: false,
                message: 'No reply available to post. Please generate or provide a reply first.'
            });
        }

        // Ensure we have a valid (non-expired) access token before posting
        let accessToken;
        try {
            accessToken = await getValidAccessToken(review.tenant);
        } catch (tokenErr) {
            if (tokenErr.message === 'GOOGLE_NOT_CONNECTED') {
                // Google not connected — save reply as approved so it's ready to post later
                review.edited_reply = editedReply || review.edited_reply;
                review.final_caption = replyToPost;
                review.approved_by = userId;
                review.approved_at = new Date();
                review.approval_status = 'approved';
                await review.save();
                console.log(`⚠️  Reply saved as approved (Google not connected) for review ${review.id}`);
                return res.json({
                    success: true,
                    googleNotConnected: true,
                    message: 'Reply saved! Google Business Profile is not connected — reconnect Google to publish the reply.',
                    data: { reviewId: review.id, finalCaption: replyToPost, approvalStatus: 'approved' }
                });
            }
            throw tokenErr;
        }

        // Resolve Google account ID — fetch from API and cache if not yet stored
        let accountId = review.tenant.gbp_accountId;
        let locationId = review.location?.googleLocationId;

        if (!accountId || !locationId) {
            try {
                const oauth2Client = getOAuth2Client();
                oauth2Client.setCredentials({
                    access_token: accessToken,
                    refresh_token: review.tenant.gbp_refreshToken,
                });

                if (!accountId) {
                    accountId = await getGoogleAccountId({ tenantId: review.tenantId, authClient: oauth2Client });
                    // Refresh tenant in memory so postReplyToGoogle gets the right value
                    review.tenant.gbp_accountId = accountId;
                }

                if (!locationId) {
                    await fetchAndSaveLocations(review.tenant, oauth2Client, accountId);
                    // Reload the location to get the newly-populated googleLocationId
                    const updatedLocation = await require('../models/Location').findByPk(review.locationId);
                    locationId = updatedLocation?.googleLocationId;
                    if (!locationId) {
                        return res.status(400).json({
                            success: false,
                            message: 'Google location ID not found. Please complete Google Business Profile setup in Settings.'
                        });
                    }
                }
            } catch (syncErr) {
                if (syncErr.code === 'QUOTA_EXCEEDED' || syncErr.message === 'RATE_LIMITED_RETRY_LATER') {
                    return res.status(429).json({ success: false, message: 'Google API quota exceeded. Please try again in a few minutes.' });
                }
                throw syncErr;
            }
        }

        // Post reply to Google (use resolved accountId/locationId, not raw model fields which may be null)
        const postResult = await postReplyToGoogle(
            accountId,
            locationId,
            review.google_review_id,
            replyToPost,
            accessToken
        );

        // Update review with approval and posting info
        review.edited_reply = editedReply || review.edited_reply; // Keep edited version if provided
        review.final_caption = replyToPost; // Final caption is what was actually posted
        review.approved_by = userId;
        review.approved_at = new Date();
        review.approval_status = 'posted';
        review.posted_to_google = true;
        review.posted_at = postResult.postedAt;
        review.google_reply_id = postResult.replyId;
        review.has_reply = true;
        await review.save();

        console.log(`✓ Reply approved and posted to Google for review ${review.id}`);

        // Auto-post to social media if it's a 5-star review
        let socialData = {};
        if (review.rating >= 5) {
            try {
                const caption = await generateSocialCaption(
                    review.review_text,
                    review.reviewer_name,
                    review.tenant.businessName
                );
                const { facebookPostUrl, instagramPostUrl } = await postReviewToSocialMedia({
                    tenant: review.tenant,
                    caption,
                });
                review.social_caption = caption;
                review.facebook_post_url = facebookPostUrl || null;
                review.instagram_post_url = instagramPostUrl || null;
                review.social_posted_at = new Date();
                await review.save();
                socialData = { caption, facebookPostUrl, instagramPostUrl };
                console.log(`✓ Auto-posted 5-star review to social media: FB=${facebookPostUrl}, IG=${instagramPostUrl}`);
            } catch (socialErr) {
                console.error('⚠️  Social auto-post failed (non-blocking):', socialErr.message);
            }
        }

        res.json({
            success: true,
            message: 'Reply approved and posted to Google successfully',
            data: {
                reviewId: review.id,
                finalCaption: review.final_caption,
                editedReply: review.edited_reply,
                approvedAt: review.approved_at,
                postedAt: review.posted_at,
                social: socialData,
            }
        });

    } catch (error) {
        console.error('Error approving and posting reply:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve and post reply',
            error: error.message
        });
    }
};

/**
 * Update reply (edit before posting)
 * @route PUT /api/reviews/:id/reply
 * @access CLIENT_OWNER, ADMIN
 */
const updateReply = async (req, res) => {
    try {
        const { id } = req.params;
        const { editedReply } = req.body;
        const userRole = req.user.role;
        const userTenant = req.user.tenant;

        if (!editedReply) {
            return res.status(400).json({
                success: false,
                message: 'Edited reply is required'
            });
        }

        const review = await Review.findByPk(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Ensure tenant access
        if (userRole !== 'ADMIN' && review.tenantId.toString() !== userTenant.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if already posted
        if (review.posted_to_google) {
            return res.status(400).json({
                success: false,
                message: 'Cannot edit reply that has already been posted to Google'
            });
        }

        // Update edited reply and final caption
        review.edited_reply = editedReply;
        review.final_caption = editedReply; // Update final caption with edited version
        await review.save();

        console.log(`✓ Reply updated for review ${review.id}`);

        res.json({
            success: true,
            message: 'Reply updated successfully',
            data: {
                reviewId: review.id,
                editedReply: review.edited_reply,
                finalCaption: review.final_caption,
            }
        });

    } catch (error) {
        console.error('Error updating reply:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update reply',
            error: error.message
        });
    }
};

/**
 * Fetch reviews from SearchAPI (Third-party Scraper)
 * @route POST /api/reviews/fetch-third-party
 * @access CLIENT_OWNER, ADMIN
 */
const fetchReviewsFromThirdParty = async (req, res) => {
    try {
        let { locationId, engine = 'google_maps_reviews', maxPages = 1 } = req.body;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const userTenantId = req.user.tenantId || req.user.tenant;

        // Validation: SearchAPI key must be in environment
        const apiKey = process.env.SEARCH_API_KEY;
        if (!apiKey) {
            return res.status(400).json({
                success: false,
                message: 'SEARCH_API_KEY is not configured in the server environment.'
            });
        }

        let location;
        if (!locationId) {
            // Find the FIRST location for this tenant
            const userSlug = req.user.slug || req.user.tenantSlug;
            const tenant = await Tenant.findOne({ where: { slug: userSlug } });
            
            if (!tenant) {
                 return res.status(404).json({ success: false, message: 'Tenant not found' });
            }

            location = await Location.findOne({ 
                where: { tenantId: tenant.id },
                include: [{ model: Tenant, as: 'tenant' }]
            });
        } else {
            location = await Location.findByPk(locationId, {
                include: [{ model: Tenant, as: 'tenant' }]
            });
        }

        if (!location) {
            return res.status(404).json({
                success: false,
                message: 'No location found. Please set up a location first.'
            });
        }

        const placeId = location.googlePlaceId || location.googleLocationId;
        if (!placeId) {
             return res.status(400).json({
                success: false,
                message: 'No Google Place ID found for this location.'
            });
        }

        console.log(`📡 Using SearchAPI (${engine}) for location: ${location.name} (ID: ${placeId})`);

        // Fetch reviews from SearchAPI
        const result = await fetchReviewsFromSearchApi(placeId, apiKey, { engine, maxPages });
        const googleReviews = result.reviews || [];

        console.log(`📦 Fetched ${googleReviews.length} reviews from SearchAPI`);

        let newReviewsCount = 0;
        let updatedReviewsCount = 0;

        const currentTenant = location.tenant;

        for (const googleReview of googleReviews) {
            try {
                const existingReview = await Review.findOne({
                    where: { google_review_id: googleReview.google_review_id }
                });

                if (existingReview) {
                    updatedReviewsCount++;
                } else {
                    const reviewData = {
                        tenantId: currentTenant.id,
                        locationId: location.id,
                        google_review_id: googleReview.google_review_id,
                        reviewer_name: googleReview.reviewer_name || 'Anonymous',
                        rating: googleReview.rating || 5,
                        review_text: googleReview.review_text || '',
                        review_created_at: googleReview.review_created_at || new Date(),
                        has_reply: false,
                        source: 'SEARCHAPI'
                    };

                    // AI Auto-Reply Logic
                    try {
                        const tenantSettings = currentTenant.settings || {};
                        const toneSettings = tenantSettings.tone || {};
                        
                        const generatedReply = await generateReply(
                            reviewData.review_text,
                            reviewData.rating,
                            currentTenant.businessName,
                            toneSettings
                        );

                        reviewData.ai_generated_reply = generatedReply;
                        reviewData.ai_reply_generated_at = new Date();
                        reviewData.edited_reply = generatedReply;
                        reviewData.final_caption = generatedReply;

                        let sentiment = 'Neutral';
                        if (reviewData.rating >= 4) sentiment = 'Positive';
                        else if (reviewData.rating <= 2) sentiment = 'Negative';
                        reviewData.sentiment = sentiment;

                    } catch (aiError) {
                        console.error('AI error for SearchAPI review:', aiError);
                    }

                    await Review.create(reviewData);
                    newReviewsCount++;
                }
            } catch (innerError) {
                console.error(`⚠️ Error processing SearchAPI review ${googleReview.google_review_id}:`, innerError);
            }
        }

        res.json({
            success: true,
            message: 'Reviews fetched from SearchAPI successfully',
            data: {
                totalFetched: googleReviews.length,
                newReviews: newReviewsCount,
                updatedReviews: updatedReviewsCount,
                source: `SEARCHAPI_${engine.toUpperCase()}`
            }
        });

    } catch (error) {
        console.error('❌ Error fetching reviews from SearchAPI:', error);

        let errorMessage = 'Failed to fetch reviews: ' + error.message;

        if (error.message.includes('401') || error.message.includes('Invalid API key') || apiKey === 'YOUR_SEARCHAPI_API_KEY_HERE') {
             errorMessage = 'SearchAPI key is missing or invalid. Please sign up at searchapi.io, get an API key, and add it to your backend/.env file as SEARCH_API_KEY.';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

/**
 * Post a review to social media (Facebook / Instagram)
 * Called manually OR auto-triggered after 5-star approval
 * @route POST /api/reviews/:id/post-social
 * @access CLIENT_OWNER, ADMIN
 */
const postToSocial = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.user.role;
        const userTenant = req.user.tenant;

        const review = await Review.findByPk(id, {
            include: [{ model: Tenant, as: 'tenant' }]
        });

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        if (userRole !== 'ADMIN' && review.tenantId.toString() !== userTenant.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Generate social media caption using AI
        const caption = await generateSocialCaption(
            review.review_text,
            review.reviewer_name,
            review.tenant.businessName
        );

        // Post to Facebook and Instagram
        const { facebookPostUrl, instagramPostUrl } = await postReviewToSocialMedia({
            tenant: review.tenant,
            caption,
        });

        // Save results to review
        review.social_caption = caption;
        review.facebook_post_url = facebookPostUrl || review.facebook_post_url;
        review.instagram_post_url = instagramPostUrl || review.instagram_post_url;
        review.social_posted_at = new Date();
        await review.save();

        console.log(`✓ Social post sent for review ${review.id}: FB=${facebookPostUrl}, IG=${instagramPostUrl}`);

        return res.json({
            success: true,
            message: 'Review posted to social media successfully',
            data: {
                reviewId: review.id,
                caption,
                facebookPostUrl,
                instagramPostUrl,
                postedAt: review.social_posted_at,
            }
        });

    } catch (error) {
        console.error('Error posting to social media:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to post to social media',
            error: error.message
        });
    }
};

/**
 * Manually trigger (or re-run) the AI pipeline for unprocessed reviews.
 * @route POST /api/reviews/pipeline/run
 * @access ADMIN, CLIENT_OWNER
 */
const runPipelineManually = async (req, res) => {
    try {
        const { reviewId } = req.body;  // optional — omit to process ALL pending
        const userRole = req.user.role;
        const userTenant = req.user.tenant;

        if (reviewId) {
            // Single review
            const review = await Review.findByPk(reviewId);
            if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
            if (userRole !== 'ADMIN' && review.tenantId.toString() !== userTenant.toString()) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
            const result = await runPipelineForReview(reviewId, req.user.userId);
            return res.json({ success: true, message: 'Pipeline completed', data: result });
        }

        // Batch: restrict to the calling tenant unless admin
        const tenantFilter = userRole === 'ADMIN' ? null : userTenant;
        const result = await processPendingReviews(tenantFilter);
        res.json({ success: true, message: 'Batch pipeline completed', data: result });

    } catch (error) {
        console.error('Error running pipeline:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    fetchReviews,
    fetchReviewsFromPlaces,
    fetchReviewsFromThirdParty,
    getReviews,
    getReviewById,
    generateAIReply,
    approveAndPostReply,
    updateReply,
    postToSocial,
    runPipelineManually,
};
