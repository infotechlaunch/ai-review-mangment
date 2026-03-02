const express = require('express');
const router = express.Router();
const { getTenantProfile, updateTenantProfile } = require('../controller/tenant_controller');
const { authenticate, ensureTenantAccess } = require('../middleware/auth');

/**
 * Tenant / Business Profile Routes
 * @prefix /api/tenant
 */

// Authenticate all routes
router.use(authenticate);

// Get profile
router.get('/profile', getTenantProfile);

// Update profile
router.put('/profile', updateTenantProfile);

module.exports = router;
