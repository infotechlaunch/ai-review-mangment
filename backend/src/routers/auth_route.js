const express = require('express');
const router = express.Router();
const { login, verifyTokenEndpoint, registerClientOwner } = require('../controller/auth_controller');
const { authenticate } = require('../middleware/auth');

/**
 * Authentication Routes
 * @prefix /api/auth
 */

// Login endpoint - handles both ADMIN and CLIENT authentication
router.post('/login', login);

// Register Client Owner endpoint - creates a new CLIENT_OWNER user and their tenant
router.post('/register/client', registerClientOwner);

// Verify token endpoint - validates JWT and returns user info
router.get('/verify', authenticate, verifyTokenEndpoint);

module.exports = router;