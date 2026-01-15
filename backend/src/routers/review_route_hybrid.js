const express = require('express');
const router = express.Router();
const {
    getReviews,
    getReviewById,
    generateAIReply,
    getReviewStats,
} = require('../controller/review_controller_hybrid');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Review Routes (Hybrid: Google Sheets + AI)
 * @prefix /api/reviews
 */

// Apply authentication to all routes
router.use(authenticate);

// Get review statistics
router.get('/stats', authorize(['ADMIN', 'CLIENT_OWNER', 'STAFF']), getReviewStats);

// Get all reviews with filters
router.get('/', authorize(['ADMIN', 'CLIENT_OWNER', 'STAFF']), getReviews);

// Get single review by ReviewKey
router.get('/:reviewKey', authorize(['ADMIN', 'CLIENT_OWNER', 'STAFF']), getReviewById);

// Generate AI reply for a review (NEW!)
router.post('/:reviewKey/generate-reply', authorize(['ADMIN', 'CLIENT_OWNER']), generateAIReply);

module.exports = router;
