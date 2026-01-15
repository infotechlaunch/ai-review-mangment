const express = require('express');
const router = express.Router();
const {
    initiateOAuthFlow,
    handleOAuthCallback,
    getConnectionStatus,
    disconnectGoogleAccount,
    fetchAndSyncReviews,
    getLocations,
} = require('../controller/google_oauth_controller');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Google OAuth Routes
 * Handles Google Business Profile OAuth connection
 */

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/google-oauth/connect
 * @desc    Initiate Google OAuth flow - returns authorization URL
 * @access  CLIENT_OWNER only
 */
router.get('/connect', authorize(['CLIENT_OWNER']), initiateOAuthFlow);

/**
 * @route   GET /api/google-oauth/callback
 * @desc    Handle OAuth callback from Google
 * @access  Public (but requires valid state parameter)
 * @note    This endpoint is called by Google redirect, not by frontend directly
 */
router.get('/callback', handleOAuthCallback);

/**
 * @route   GET /api/google-oauth/status
 * @desc    Get Google Business connection status
 * @access  CLIENT_OWNER, STAFF
 */
router.get('/status', authorize(['CLIENT_OWNER', 'STAFF']), getConnectionStatus);

/**
 * @route   POST /api/google-oauth/disconnect
 * @desc    Disconnect Google Business account
 * @access  CLIENT_OWNER only
 */
router.post('/disconnect', authorize(['CLIENT_OWNER']), disconnectGoogleAccount);

/**
 * @route   GET /api/google-oauth/locations
 * @desc    Get all locations for authenticated tenant
 * @access  CLIENT_OWNER, STAFF
 */
router.get('/locations', authorize(['CLIENT_OWNER', 'STAFF']), getLocations);

/**
 * @route   POST /api/google-oauth/sync-reviews
 * @desc    Fetch and sync reviews from Google for all locations
 * @access  CLIENT_OWNER, STAFF
 */
router.post('/sync-reviews', authorize(['CLIENT_OWNER', 'STAFF']), fetchAndSyncReviews);

module.exports = router;
