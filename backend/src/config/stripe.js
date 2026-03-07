const Stripe = require('stripe');

/**
 * Stripe Configuration
 * Initializes Stripe client with secret key and validates required env vars at startup
 */

const REQUIRED_VARS = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
];

// Validate required environment variables on startup
const missingVars = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
    throw new Error(
        `Stripe configuration error: missing environment variables: ${missingVars.join(', ')}`
    );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
});

/**
 * Map a plan name to its Stripe Price ID from environment variables.
 * Supported plan keys: 'starter', 'pro', 'growth', 'agency'
 * @param {string} plan
 * @returns {string} Stripe Price ID
 */
const getPriceId = (plan) => {
    const planMap = {
        starter: process.env.STRIPE_PRICE_ID_STARTER || process.env.STRIPE_PRICE_STARTER,
        pro:     process.env.STRIPE_PRICE_ID_PRO     || process.env.STRIPE_PRICE_GROWTH,
        growth:  process.env.STRIPE_PRICE_GROWTH,
        agency:  process.env.STRIPE_PRICE_AGENCY,
    };

    const priceId = planMap[plan?.toLowerCase()];
    if (!priceId) {
        throw new Error(`Unknown or unconfigured plan: "${plan}". Available: ${Object.keys(planMap).join(', ')}`);
    }
    return priceId;
};

module.exports = { stripe, getPriceId };
