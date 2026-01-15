const Review = require('../models/Review');
const Location = require('../models/Location');
const Tenant = require('../models/Tenant');
const { generateReply } = require('../config/openai');
const { fetchGoogleReviews, postReplyToGoogle } = require('../services/googleBusinessService');

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

        // Validate location
        const location = await Location.findById(locationId).populate('tenant');

        if (!location) {
            return res.status(404).json({
                success: false,
                message: 'Location not found'
            });
        }

        // Ensure tenant access
        if (userRole !== 'ADMIN' && location.tenant._id.toString() !== userTenant.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get tenant Google credentials
        const tenant = await Tenant.findById(location.tenant._id);

        if (!tenant.googleBusinessProfile?.accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Google Business Profile not connected. Please connect your account first.'
            });
        }

        // Fetch reviews from Google
        const googleReviews = await fetchGoogleReviews(
            tenant.googleBusinessProfile.accountId,
            location.googleLocationId,
            tenant.googleBusinessProfile.accessToken
        );

        let newReviewsCount = 0;
        let updatedReviewsCount = 0;

        // Process each review
        for (const googleReview of googleReviews) {
            // Check if review already exists
            const existingReview = await Review.findOne({
                google_review_id: googleReview.google_review_id
            });

            if (existingReview) {
                // Update existing review
                existingReview.has_reply = googleReview.has_reply;
                await existingReview.save();
                updatedReviewsCount++;
            } else {
                // Create new review
                await Review.create({
                    tenant: location.tenant._id,
                    location: location._id,
                    ...googleReview,
                });
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
        const query = {};

        // Tenant isolation (except for admin)
        if (userRole !== 'ADMIN') {
            query.tenant = userTenant;
        }

        // Filter by replied status
        if (replied !== undefined) {
            query.has_reply = replied === 'true';
        }

        // Filter by rating
        if (rating) {
            query.rating = parseInt(rating);
        }

        // Execute query with pagination
        const skip = (page - 1) * limit;
        const reviews = await Review.find(query)
            .populate('location', 'name slug')
            .populate('tenant', 'businessName slug')
            .populate('approved_by', 'email firstName lastName')
            .sort({ review_created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Review.countDocuments(query);

        res.json({
            success: true,
            data: {
                reviews,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit),
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

        const review = await Review.findById(id)
            .populate('location', 'name slug')
            .populate('tenant', 'businessName slug')
            .populate('approved_by', 'email firstName lastName');

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Ensure tenant access
        if (userRole !== 'ADMIN' && review.tenant._id.toString() !== userTenant.toString()) {
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

        const review = await Review.findById(id).populate('tenant', 'businessName');

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Ensure tenant access
        if (userRole !== 'ADMIN' && review.tenant._id.toString() !== userTenant.toString()) {
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

        // Generate AI reply
        const aiReply = await generateReply(
            review.review_text,
            review.rating,
            review.tenant.businessName
        );

        // Update review with AI-generated reply
        review.ai_generated_reply = aiReply;
        review.ai_reply_generated_at = new Date();
        review.edited_reply = aiReply; // Set as initial editable reply
        review.final_caption = aiReply; // Set as final caption (can be approved)
        await review.save();

        console.log(`✓ Generated AI reply for review ${review._id}`);

        res.json({
            success: true,
            message: 'AI reply generated successfully',
            data: {
                reviewId: review._id,
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

        const review = await Review.findById(id)
            .populate('tenant')
            .populate('location');

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Ensure tenant access
        if (userRole !== 'ADMIN' && review.tenant._id.toString() !== userTenant.toString()) {
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
            review.tenant.googleBusinessProfile.accountId,
            review.location.googleLocationId,
            review.google_review_id,
            replyToPost,
            review.tenant.googleBusinessProfile.accessToken
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

        console.log(`✓ Reply approved and posted to Google for review ${review._id}`);

        res.json({
            success: true,
            message: 'Reply approved and posted to Google successfully',
            data: {
                reviewId: review._id,
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

        const review = await Review.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Ensure tenant access
        if (userRole !== 'ADMIN' && review.tenant.toString() !== userTenant.toString()) {
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

        console.log(`✓ Reply updated for review ${review._id}`);

        res.json({
            success: true,
            message: 'Reply updated successfully',
            data: {
                reviewId: review._id,
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

module.exports = {
    fetchReviews,
    getReviews,
    getReviewById,
    generateAIReply,
    approveAndPostReply,
    updateReply,
};
