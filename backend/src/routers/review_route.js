const express = require('express');
const router = express.Router();
const {
    fetchReviews,
    fetchReviewsFromPlaces,
    fetchReviewsFromThirdParty,
    getReviews,
    getReviewById,
    generateAIReply,
    approveAndPostReply,
    updateReply,
} = require('../controller/review_controller');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Review Routes
 * @prefix /api/reviews
 */

// Apply authentication to all routes
router.use(authenticate);

// Fetch reviews from Google
router.post('/fetch', authorize(['ADMIN', 'CLIENT_OWNER']), fetchReviews);
router.post('/fetch-places', authorize(['ADMIN', 'CLIENT_OWNER']), fetchReviewsFromPlaces);
router.post('/fetch-third-party', authorize(['ADMIN', 'CLIENT_OWNER']), fetchReviewsFromThirdParty);

// Get all reviews with filters
router.get('/', authorize(['ADMIN', 'CLIENT_OWNER', 'STAFF']), getReviews);

// Get single review by ID
router.get('/:id', authorize(['ADMIN', 'CLIENT_OWNER', 'STAFF']), getReviewById);

// Generate AI reply for a review
router.post('/:id/generate-reply', authorize(['ADMIN', 'CLIENT_OWNER']), generateAIReply);

// Update reply (edit before posting)
router.put('/:id/reply', authorize(['ADMIN', 'CLIENT_OWNER']), updateReply);

// Approve and post reply to Google
router.post('/:id/approve-reply', authorize(['ADMIN', 'CLIENT_OWNER']), approveAndPostReply);

module.exports = router;
