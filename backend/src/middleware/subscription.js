const User = require('../models/User');

/**
 * Subscription Middleware
 * Verifies that the authenticated user holds an active subscription
 * before allowing access to premium endpoints.
 *
 * Must be used AFTER the `authenticate` middleware so that req.user is populated.
 *
 * Usage:
 *   router.use(authenticate);
 *   router.use(requireActiveSubscription);
 *   router.post('/generate-reply', generateAIReply);
 *
 * Or per-route:
 *   router.post('/generate-reply', authenticate, requireActiveSubscription, generateAIReply);
 */

const ACTIVE_STATUSES = ['active', 'trialing'];

const requireActiveSubscription = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        // ADMIN and SUPER_ADMIN are never subscription-blocked
        if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        // Fetch the user's billing state from the database
        const user = await User.findByPk(req.user.userId, {
            attributes: ['id', 'subscriptionStatus', 'subscriptionEndDate', 'plan'],
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            });
        }

        const { subscriptionStatus, subscriptionEndDate } = user;

        // Subscription is valid when status is active/trialing AND the end date (if set)
        // has not yet passed — this handles cases where Stripe webhooks are delayed.
        const isActive = ACTIVE_STATUSES.includes(subscriptionStatus);
        const notExpired = !subscriptionEndDate || new Date(subscriptionEndDate) > new Date();

        if (isActive && notExpired) {
            // Attach billing info for downstream handlers if needed
            req.user.plan = user.plan;
            req.user.subscriptionStatus = subscriptionStatus;
            return next();
        }

        // Distinguish between specific failure types for clear frontend messaging
        if (subscriptionStatus === 'past_due') {
            return res.status(402).json({
                success: false,
                error: 'PAYMENT_PAST_DUE',
                message: 'Your payment is overdue. Please update your billing details to continue.',
            });
        }

        if (subscriptionStatus === 'canceled') {
            return res.status(403).json({
                success: false,
                error: 'SUBSCRIPTION_CANCELED',
                message: 'Your subscription has been canceled. Please subscribe to a plan to access this feature.',
            });
        }

        // Default: no subscription or incomplete/unpaid
        return res.status(403).json({
            success: false,
            error: 'SUBSCRIPTION_REQUIRED',
            message: 'An active subscription is required to access this feature.',
        });

    } catch (error) {
        console.error('requireActiveSubscription error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error verifying subscription status',
        });
    }
};

module.exports = requireActiveSubscription;
