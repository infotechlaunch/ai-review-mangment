const express = require('express');
const router = express.Router();
const {
    createCheckoutSession,
    handleWebhook,
    getSubscriptionStatus,
    cancelSubscription,
    createPortalSession,
    getPlans,
} = require('../controller/payment_controller');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Payment Routes
 * @prefix /api/payments
 *
 * IMPORTANT: The webhook route must be registered BEFORE the global express.json()
 * middleware reaches it. This is handled in server.js by mounting the router BEFORE
 * express.json(), using a raw-body override specifically on the webhook path.
 */

// ── Public ───────────────────────────────────────────────────────────────────

// List available subscription plans
router.get('/plans', getPlans);

// Stripe webhook — raw body required for signature verification
// express.raw() is applied individually on this route so it receives the raw Buffer,
// not the parsed JSON body that the rest of the API uses.
router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    handleWebhook
);

// ── Protected ────────────────────────────────────────────────────────────────

// All routes below require authentication
router.use(authenticate);

// Get current user's subscription status
router.get('/subscription-status', getSubscriptionStatus);

// Create checkout session — CLIENT_OWNER only
router.post(
    '/create-checkout-session',
    authorize(['CLIENT_OWNER']),
    createCheckoutSession
);

// Cancel active subscription — CLIENT_OWNER only
router.post(
    '/cancel-subscription',
    authorize(['CLIENT_OWNER']),
    cancelSubscription
);

// Create Stripe Customer Portal session — CLIENT_OWNER only
router.post(
    '/create-portal-session',
    authorize(['CLIENT_OWNER']),
    createPortalSession
);

module.exports = router;
