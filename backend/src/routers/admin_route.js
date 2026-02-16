const express = require('express');
const router = express.Router();
const { getDashboardStats, getClients, toggleClientStatus } = require('../controller/admin_controller');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Admin Routes
 * @prefix /api/admin
 * All routes require ADMIN role
 */

// Apply authentication and ADMIN authorization to all routes
router.use(authenticate);
router.use(authorize(['ADMIN', 'SUPER_ADMIN']));

// Get admin dashboard statistics
router.get('/dashboard', getDashboardStats);

// Get all clients
router.get('/clients', getClients);

// Toggle client status (enable/disable)
router.put('/clients/:id/toggle-status', toggleClientStatus);

module.exports = router;
