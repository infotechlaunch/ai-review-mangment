const express = require('express');
const router = express.Router();
const {
    getClientDashboard,
    getClientReviews,
    fetchGoogleBusinessReviews,
    getSpecificGoogleReview,
    replyToGoogleReview,
    deleteGoogleReply,
    batchFetchGoogleReviews
} = require('../controller/client_controller');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Client Routes
 * @prefix /api/client
 * All routes require CLIENT_OWNER or STAFF role
 */

// Apply authentication and CLIENT authorization to all routes
router.use(authenticate);
router.use(authorize(['CLIENT_OWNER', 'STAFF']));

// ===== Google Sheets Based Routes =====
// Get client dashboard data - returns only the client's configuration
router.get('/dashboard', getClientDashboard);

// Get client reviews - returns only the client's reviews from their sheetTab
router.get('/reviews', getClientReviews);

// ===== Google Business Profile API Routes =====
// Fetch reviews directly from Google Business Profile API
router.get('/google-reviews', fetchGoogleBusinessReviews);

// Get a specific review from Google Business Profile
router.get('/google-reviews/:reviewId', getSpecificGoogleReview);

// Reply to a Google Business review (CLIENT_OWNER only)
router.post('/google-reviews/:reviewId/reply', authorize(['CLIENT_OWNER']), replyToGoogleReview);

// Delete a reply to a Google Business review (CLIENT_OWNER only)
router.delete('/google-reviews/:reviewId/reply', authorize(['CLIENT_OWNER']), deleteGoogleReply);

// Batch fetch reviews from multiple locations
router.post('/google-reviews/batch', batchFetchGoogleReviews);

module.exports = router;
