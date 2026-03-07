const { stripe, getPriceId } = require('../config/stripe');
const User = require('../models/User');

/**
 * Payment Controller
 * Handles Stripe subscription management for the AI Review Management System
 * @prefix /api/payments
 */

/**
 * Create a Stripe Checkout session for subscription
 * @route POST /api/payments/create-checkout-session
 * @access Private (CLIENT_OWNER)
 */
const createCheckoutSession = async (req, res) => {
    try {
        const { plan } = req.body;

        if (!plan) {
            return res.status(400).json({
                success: false,
                message: 'Plan is required. Available plans: starter, pro, growth, agency',
            });
        }

        let priceId;
        try {
            priceId = getPriceId(plan);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message,
            });
        }

        // Load full user record to check for existing Stripe customer
        const user = await User.findByPk(req.user.userId, {
            attributes: ['id', 'email', 'firstName', 'lastName', 'stripeCustomerId'],
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Build customer_email / customer param for Checkout
        const sessionParams = {
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${process.env.FRONTEND_URL}/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
            cancel_url:  `${process.env.FRONTEND_URL}/billing?status=canceled`,
            metadata: {
                userId: user.id,
                plan: plan.toLowerCase(),
            },
            subscription_data: {
                metadata: {
                    userId: user.id,
                    plan: plan.toLowerCase(),
                },
                // Uncomment to enable free trial:
                // trial_period_days: parseInt(process.env.STRIPE_TRIAL_DAYS || '0') || undefined,
            },
        };

        if (user.stripeCustomerId) {
            sessionParams.customer = user.stripeCustomerId;
        } else {
            sessionParams.customer_email = user.email;
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        console.log(`✅ Checkout session created for user ${user.email} — plan: ${plan}`);

        res.json({
            success: true,
            sessionId: session.id,
            sessionUrl: session.url,
        });
    } catch (error) {
        console.error('Create checkout session error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create checkout session',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * Handle Stripe webhook events
 * IMPORTANT: This route must use express.raw() body parser, NOT express.json()
 * @route POST /api/payments/webhook
 * @access Public (Stripe only — verified by signature)
 */
const handleWebhook = async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
        console.warn('⚠️  Webhook received without stripe-signature header');
        return res.status(400).json({ success: false, message: 'Missing stripe-signature header' });
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,                              // raw Buffer
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('⚠️  Webhook signature verification failed:', err.message);
        return res.status(400).json({ success: false, message: `Webhook signature error: ${err.message}` });
    }

    console.log(`📩 Stripe webhook received: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event.data.object);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object);
                break;

            default:
                console.log(`ℹ️  Unhandled webhook event type: ${event.type}`);
        }

        // Always acknowledge receipt to Stripe
        res.json({ received: true });
    } catch (error) {
        console.error(`❌ Error processing webhook event ${event.type}:`, error);
        // Return 200 anyway to prevent Stripe from retrying indefinitely
        // Log the error internally for investigation
        res.json({ received: true });
    }
};

/**
 * Get the current user's subscription status
 * @route GET /api/payments/subscription-status
 * @access Private
 */
const getSubscriptionStatus = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.userId, {
            attributes: [
                'id', 'email', 'plan', 'subscriptionStatus',
                'subscriptionStartDate', 'subscriptionEndDate',
                'stripeCustomerId', 'stripeSubscriptionId',
            ],
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if subscription is currently valid (active or trialing)
        const isActive = ['active', 'trialing'].includes(user.subscriptionStatus);

        // Treat expired subscriptions: status is 'active' but endDate has passed
        const effectiveStatus =
            isActive && user.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date()
                ? 'expired'
                : user.subscriptionStatus;

        res.json({
            success: true,
            subscription: {
                plan: user.plan,
                status: effectiveStatus,
                isActive: isActive && effectiveStatus !== 'expired',
                subscriptionStartDate: user.subscriptionStartDate,
                subscriptionEndDate: user.subscriptionEndDate,
                stripeSubscriptionId: user.stripeSubscriptionId,
            },
        });
    } catch (error) {
        console.error('Get subscription status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve subscription status',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * Cancel the user's active Stripe subscription (at period end)
 * @route POST /api/payments/cancel-subscription
 * @access Private (CLIENT_OWNER)
 */
const cancelSubscription = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.userId, {
            attributes: ['id', 'email', 'stripeSubscriptionId', 'subscriptionStatus'],
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.stripeSubscriptionId) {
            return res.status(400).json({
                success: false,
                message: 'No active subscription found for this account',
            });
        }

        if (user.subscriptionStatus === 'canceled') {
            return res.status(400).json({
                success: false,
                message: 'Subscription is already canceled',
            });
        }

        // Cancel at period end — user retains access until billing cycle ends
        const updatedSubscription = await stripe.subscriptions.update(
            user.stripeSubscriptionId,
            { cancel_at_period_end: true }
        );

        // Reflect scheduled cancellation in our DB
        await user.update({
            subscriptionEndDate: new Date(updatedSubscription.current_period_end * 1000),
        });

        console.log(`✅ Subscription scheduled for cancellation: user ${user.email}`);

        res.json({
            success: true,
            message: 'Subscription will be canceled at the end of the current billing period',
            subscriptionEndDate: new Date(updatedSubscription.current_period_end * 1000),
            cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel subscription',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * Create a Stripe Customer Portal session for self-service billing management
 * @route POST /api/payments/create-portal-session
 * @access Private (CLIENT_OWNER)
 */
const createPortalSession = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.userId, {
            attributes: ['id', 'email', 'stripeCustomerId'],
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.stripeCustomerId) {
            return res.status(400).json({
                success: false,
                message: 'No billing account found. Please subscribe to a plan first.',
            });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL ||
                        `${process.env.FRONTEND_URL}/billing`,
        });

        res.json({
            success: true,
            portalUrl: portalSession.url,
        });
    } catch (error) {
        console.error('Create portal session error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create billing portal session',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * Return available plans and their price information (no pricing IDs exposed)
 * @route GET /api/payments/plans
 * @access Public
 */
const getPlans = (req, res) => {
    res.json({
        success: true,
        plans: [
            {
                key: 'starter',
                name: 'Starter',
                description: 'For small businesses getting started with review management',
                configured: !!(process.env.STRIPE_PRICE_ID_STARTER || process.env.STRIPE_PRICE_STARTER),
            },
            {
                key: 'pro',
                name: 'Pro',
                description: 'For growing businesses needing advanced AI features',
                configured: !!(process.env.STRIPE_PRICE_ID_PRO || process.env.STRIPE_PRICE_GROWTH),
            },
            {
                key: 'agency',
                name: 'Agency',
                description: 'For agencies managing multiple business locations',
                configured: !!process.env.STRIPE_PRICE_AGENCY,
            },
        ],
    });
};

// ── Private webhook handler helpers ─────────────────────────────────────────

async function handleCheckoutSessionCompleted(session) {
    const userId = session.metadata?.userId;
    if (!userId) {
        console.warn('checkout.session.completed: no userId in metadata');
        return;
    }

    const plan = session.metadata?.plan || 'starter';
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    // Fetch subscription to get period dates
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    await User.update(
        {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            plan,
            subscriptionStatus: subscription.status,
            subscriptionStartDate: new Date(subscription.current_period_start * 1000),
            subscriptionEndDate:   new Date(subscription.current_period_end   * 1000),
        },
        { where: { id: userId } }
    );

    console.log(`✅ Subscription activated for userId=${userId} — plan: ${plan}`);
}

async function handleSubscriptionUpdated(subscription) {
    const userId = subscription.metadata?.userId;
    if (!userId) {
        console.warn('customer.subscription.updated: no userId in metadata, looking up by stripeSubscriptionId');
        await syncSubscriptionByStripeId(subscription);
        return;
    }

    await User.update(
        {
            subscriptionStatus: subscription.status,
            subscriptionEndDate: new Date(subscription.current_period_end * 1000),
        },
        { where: { id: userId } }
    );

    console.log(`✅ Subscription updated for userId=${userId} — status: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription) {
    const userId = subscription.metadata?.userId;

    const whereClause = userId
        ? { id: userId }
        : { stripeSubscriptionId: subscription.id };

    await User.update(
        {
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null,
            subscriptionEndDate: new Date(subscription.current_period_end * 1000),
        },
        { where: whereClause }
    );

    console.log(`✅ Subscription canceled — ${userId ? `userId=${userId}` : `subId=${subscription.id}`}`);
}

async function handleInvoicePaymentSucceeded(invoice) {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;

    const whereClause = userId
        ? { id: userId }
        : { stripeSubscriptionId: subscriptionId };

    await User.update(
        {
            subscriptionStatus: 'active',
            subscriptionEndDate: new Date(subscription.current_period_end * 1000),
        },
        { where: whereClause }
    );

    console.log(`✅ Invoice payment succeeded — subscription ${subscriptionId} renewed`);
}

async function handleInvoicePaymentFailed(invoice) {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;

    const whereClause = userId
        ? { id: userId }
        : { stripeSubscriptionId: subscriptionId };

    await User.update(
        { subscriptionStatus: 'past_due' },
        { where: whereClause }
    );

    console.warn(`⚠️  Invoice payment failed — subscription ${subscriptionId} marked as past_due`);
}

/**
 * Fallback: sync subscription status when metadata lacks userId
 * Looks up the user by their stored stripeSubscriptionId
 */
async function syncSubscriptionByStripeId(subscription) {
    const user = await User.findOne({ where: { stripeSubscriptionId: subscription.id } });
    if (!user) {
        console.warn(`syncSubscriptionByStripeId: no user found for subscription ${subscription.id}`);
        return;
    }

    await user.update({
        subscriptionStatus: subscription.status,
        subscriptionEndDate: new Date(subscription.current_period_end * 1000),
    });

    console.log(`✅ Subscription synced by stripeSubscriptionId for userId=${user.id}`);
}

module.exports = {
    createCheckoutSession,
    handleWebhook,
    getSubscriptionStatus,
    cancelSubscription,
    createPortalSession,
    getPlans,
};
