const Review = require('../models/Review');
const Location = require('../models/Location');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const { generateReply } = require('../config/openai');
const { fetchGoogleReviews, postReplyToGoogle, fetchPlacesReviews, fetchReviewsFromSearchApi } = require('../services/googleBusinessService');
const { Op } = require('sequelize');

// Import quota cooldown map from google_oauth_controller
const { quotaCooldowns } = require('./google_oauth_controller');

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
                // Create new review object
                // Prepare review data structure
                const reviewData = {
                    tenantId: location.tenant.id,
                    locationId: location.id,
                    ...googleReview,
                };

                // --- AI Auto-Reply Logic ---
                let aiGenerated = {};

                if (!reviewData.has_reply) {
                    try {
                        const tenantSettings = tenant.settings || {};
                        const toneSettings = tenantSettings.tone || {};
                        const autoApproval = tenantSettings.autoApproval || {
                            positive: true,
                            neutral: false,
                            negative: false,
                            minRating: 4
                        };

                        // Generate AI Reply
                        const generatedReply = await generateReply(
                            reviewData.review_text,
                            reviewData.rating,
                            tenant.businessName,
                            toneSettings
                        );

                        reviewData.ai_generated_reply = generatedReply;
                        reviewData.ai_reply_generated_at = new Date();
                        reviewData.edited_reply = generatedReply;
                        reviewData.final_caption = generatedReply;

                        // Determine Sentiment (Simple Rating-based)
                        let sentiment = 'NEUTRAL';
                        if (reviewData.rating >= 4) sentiment = 'POSITIVE';
                        else if (reviewData.rating <= 2) sentiment = 'NEGATIVE';

                        reviewData.sentiment = sentiment; // Explicitly set sentiment if not from Google

                        // Check Auto-Approval Rules
                        let shouldAutoApprove = false;
                        if (reviewData.rating >= (autoApproval.minRating || 4)) {
                            if (sentiment === 'POSITIVE' && autoApproval.positive) shouldAutoApprove = true;
                            if (sentiment === 'NEUTRAL' && autoApproval.neutral) shouldAutoApprove = true;
                            if (sentiment === 'NEGATIVE' && autoApproval.negative) shouldAutoApprove = true;
                        }

                        if (shouldAutoApprove) {
                            // Post to Google
                            const postResult = await postReplyToGoogle(
                                tenant.gbp_accountId,
                                location.googleLocationId,
                                reviewData.google_review_id,
                                generatedReply,
                                tenant.gbp_accessToken
                            );

                            reviewData.approval_status = 'posted';
                            reviewData.posted_to_google = true;
                            reviewData.posted_at = new Date();
                            reviewData.google_reply_id = postResult.replyId;
                            reviewData.has_reply = true;
                            reviewData.approved_by = userId; // Attributed to the user triggering fetch, or system

                            console.log(`✓ Auto-approved and posted reply for review ${reviewData.google_review_id}`);
                        } else {
                            console.log(`✓ Generated draft reply for review ${reviewData.google_review_id}`);
                        }
                    } catch (aiError) {
                        console.error('Error in auto-reply generation:', aiError);
                        // Continue saving review even if AI fails
                    }
                }

                await Review.create(reviewData);
                newReviewsCount++;
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
        if (userRole !== 'ADMIN' && review.tenant.id.toString() !== userTenant.toString()) {
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
        if (userRole !== 'ADMIN' && review.tenant.id.toString() !== userTenant.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if review already has a reply posted to Google
        if (review.posted_to_google) {
            return res.status(400).json({
                success: false,
                message: 'This review already has a reply posted to Google'
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
            message: 'Failed to generate AI reply',
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
        if (userRole !== 'ADMIN' && review.tenant.id.toString() !== userTenant.toString()) {
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

        // Post reply to Google
        const postResult = await postReplyToGoogle(
            review.tenant.gbp_accountId,
            review.location.googleLocationId,
            review.google_review_id,
            replyToPost,
            review.tenant.gbp_accessToken
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

        res.json({
            success: true,
            message: 'Reply approved and posted to Google successfully',
            data: {
                reviewId: review.id,
                finalCaption: review.final_caption,
                editedReply: review.edited_reply,
                approvedAt: review.approved_at,
                postedAt: review.posted_at,
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

module.exports = {
    fetchReviews,
    fetchReviewsFromPlaces,
    fetchReviewsFromThirdParty,
    getReviews,
    getReviewById,
    generateAIReply,
    approveAndPostReply,
    updateReply,
};
