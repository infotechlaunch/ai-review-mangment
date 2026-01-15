const { getClientBySlug, getAllClients } = require('../models/Client');
const { getReviewsByTab, getAllReviews, getReviewByKey, filterReviews, paginateReviews } = require('../models/Review_Sheets');
const { generateReply } = require('../config/openai');

/**
 * Review Controller (Hybrid: Google Sheets + AI Features)
 * Uses Google Sheets for storage but adds AI reply generation
 */

/**
 * Get reviews with filters (Google Sheets version)
 * @route GET /api/reviews
 * @access CLIENT_OWNER, STAFF, ADMIN
 */
const getReviews = async (req, res) => {
    try {
        const { replied, rating, approvalStatus, page = 1, limit = 20 } = req.query;
        const userRole = req.user.role;
        const userSlug = req.user.slug || req.user.tenantSlug;

        let reviews = [];

        if (userRole === 'ADMIN') {
            // Admin can see all reviews
            const clients = await getAllClients();
            reviews = await getAllReviews(clients);
        } else {
            // Client can only see their own reviews
            const client = await getClientBySlug(userSlug);

            if (!client || !client.sheetTab) {
                return res.status(404).json({
                    success: false,
                    message: 'Client configuration not found'
                });
            }

            const clientReviews = await getReviewsByTab(client.sheetTab);
            reviews = clientReviews.map(review => ({
                ...review,
                businessName: client.businessName,
                slug: client.slug,
            }));
        }

        // Apply filters
        const filtered = filterReviews(reviews, { replied, rating, approvalStatus });

        // Apply pagination
        const result = paginateReviews(filtered, page, limit);

        res.json({
            success: true,
            data: result
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
 * Get single review by ReviewKey
 * @route GET /api/reviews/:reviewKey
 * @access CLIENT_OWNER, STAFF, ADMIN
 */
const getReviewById = async (req, res) => {
    try {
        const { reviewKey } = req.params;
        const { slug } = req.query;
        const userRole = req.user.role;
        const userSlug = req.user.slug || req.user.tenantSlug;

        // Determine which client's sheet to read from
        let targetSlug = slug;

        // If user is CLIENT, they can only view their own reviews
        if (userRole !== 'ADMIN') {
            targetSlug = userSlug;
        }

        if (!targetSlug) {
            return res.status(400).json({
                success: false,
                message: 'Client slug is required'
            });
        }

        // Get client configuration
        const client = await getClientBySlug(targetSlug);

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

        // Get the review
        const review = await getReviewByKey(client.sheetTab, reviewKey);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        res.json({
            success: true,
            data: {
                ...review,
                businessName: client.businessName,
                slug: client.slug,
            }
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
 * Generate AI reply for a review (NEW FEATURE)
 * @route POST /api/reviews/:reviewKey/generate-reply
 * @access CLIENT_OWNER, ADMIN
 */
const generateAIReply = async (req, res) => {
    try {
        const { reviewKey } = req.params;
        const { slug } = req.body;
        const userRole = req.user.role;
        const userSlug = req.user.slug || req.user.tenantSlug;

        // Determine target slug
        let targetSlug = slug;
        if (userRole !== 'ADMIN') {
            targetSlug = userSlug;
        }

        if (!targetSlug) {
            return res.status(400).json({
                success: false,
                message: 'Client slug is required'
            });
        }

        // Get client
        const client = await getClientBySlug(targetSlug);
        if (!client || !client.sheetTab) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        // Get review
        const review = await getReviewByKey(client.sheetTab, reviewKey);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Extract review data using normalized fields
        const reviewText = review.review_text || '';
        const rating = parseInt(review.rating || 5);
        const businessName = client.businessName;

        // Generate AI reply
        const aiReply = await generateReply(reviewText, rating, businessName);

        console.log(`✓ Generated AI reply for review ${reviewKey}`);

        res.json({
            success: true,
            message: 'AI reply generated successfully',
            data: {
                reviewKey,
                reviewText,
                rating,
                aiReply,
                generatedAt: new Date().toISOString(),
                note: 'This reply has been generated but not saved to Google Sheets. Copy it to your sheet manually or use the approve endpoint when write operations are enabled.'
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
 * Get dashboard statistics
 * @route GET /api/reviews/stats
 * @access CLIENT_OWNER, ADMIN
 */
const getReviewStats = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userSlug = req.user.slug || req.user.tenantSlug;

        let reviews = [];

        if (userRole === 'ADMIN') {
            const clients = await getAllClients();
            reviews = await getAllReviews(clients);
        } else {
            const client = await getClientBySlug(userSlug);
            if (client && client.sheetTab) {
                reviews = await getReviewsByTab(client.sheetTab);
            }
        }

        // Calculate statistics using normalized fields
        const totalReviews = reviews.length;
        const repliedReviews = reviews.filter(r => r.ai_generated_reply || r.edited_reply || r.final_caption).length;
        const pendingReviews = totalReviews - repliedReviews;

        const ratingBreakdown = {
            5: reviews.filter(r => parseInt(r.rating) === 5).length,
            4: reviews.filter(r => parseInt(r.rating) === 4).length,
            3: reviews.filter(r => parseInt(r.rating) === 3).length,
            2: reviews.filter(r => parseInt(r.rating) === 2).length,
            1: reviews.filter(r => parseInt(r.rating) === 1).length,
        };

        const averageRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + parseInt(r.rating || 0), 0) / reviews.length
            : 0;

        res.json({
            success: true,
            data: {
                totalReviews,
                repliedReviews,
                pendingReviews,
                averageRating: averageRating.toFixed(2),
                ratingBreakdown,
            }
        });

    } catch (error) {
        console.error('Error getting review stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get review statistics',
            error: error.message
        });
    }
};

module.exports = {
    getReviews,
    getReviewById,
    generateAIReply,
    getReviewStats,
};
