const express = require('express');
const router = express.Router();
const { getClientDashboard, getClientReviews } = require('../controller/client_controller');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Client Routes
 * @prefix /api/client
 * All routes require CLIENT_OWNER or STAFF role
 */

// Apply authentication and CLIENT authorization to all routes
router.use(authenticate);
router.use(authorize(['CLIENT_OWNER', 'STAFF']));

// Get client dashboard data - returns only the client's configuration
router.get('/dashboard', getClientDashboard);

// Get client reviews - returns only the client's reviews from their sheetTab
router.get('/reviews', getClientReviews);

module.exports = router;
