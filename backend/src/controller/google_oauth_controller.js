const { google } = require('googleapis');
const Tenant = require('../models/Tenant');
const Location = require('../models/Location');
const Review = require('../models/Review');
const { fetchGoogleReviews } = require('../services/googleBusinessService');
const { accountManagementLimiter, businessInfoLimiter } = require('../utils/rateLimiter');

// --- CONFIGURATION ---

// Retry config - DO NOT retry 429, only server errors
const RETRY_CONFIG = {
    maxRetries: 2,          // Reduced retries
    initialDelay: 5000,     // 5 seconds
    maxDelay: 30000,        // 30 seconds
    backoffMultiplier: 2
};

// Extended cache for locations (they don't change often)
const locationCache = new Map();
const LOCATION_CACHE_TTL = 6 * 60 * 60 * 1000;  // 6 hours

// GLOBAL  LOCK MAP (in-memory) - Prevents concurrent API calls for same tenant
const accountFetchLocks = new Map();

// QUOTA COOLDOWN MAP - Blocks API calls after 429 for 10 minutes (prod) or 30 seconds (dev)
const quotaCooldowns = new Map();
const QUOTA_COOLDOWN_DURATION = process.env.NODE_ENV === 'production'
    ? 10 * 60 * 1000  // 10 minutes in production
    : 30 * 1000;       // 30 seconds in development

// SYNC LOCK MAP - Prevents concurrent review syncs for same tenant
const activeSyncs = new Map();

// Delay between API calls to prevent quota issues
const API_CALL_DELAY = 1200; // 1.2 seconds between calls

// Scopes required for Google Business Profile API
const SCOPES = [
    'https://www.googleapis.com/auth/business.manage',
];

// --- UTILITIES ---

/**
 * Sleep utility for delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Robust Retry function with exponential backoff
 * CRITICAL FIX: DO NOT retry 429 errors - they make quota worse!
 */
async function retryWithBackoff(fn, retries = RETRY_CONFIG.maxRetries, delay = RETRY_CONFIG.initialDelay) {
    try {
        return await fn();
    } catch (error) {
        const errorCode = error.code || (error.response && error.response.status);
        const errorMessage = error.message || (error.response && error.response.data && error.response.data.error && error.response.data.error.message) || '';

        // Check for 429 rate limit - STOP immediately, don't retry
        const isRateLimitError =
            errorCode === 429 ||
            errorMessage.includes('Quota exceeded') ||
            errorMessage.includes('Too Many Requests') ||
            errorMessage.includes('quota metric') ||
            errorMessage.includes('RESOURCE_EXHAUSTED');

        if (isRateLimitError) {
            console.error('❌ QUOTA EXCEEDED (429) - Stopping all retries');
            console.error('   This request consumed quota. Schedule retry after 5+ minutes.');
            const quotaError = new Error('RATE_LIMITED_RETRY_LATER');
            quotaError.code = 'QUOTA_EXCEEDED';
            quotaError.status = 429;
            throw quotaError;
        }

        // Retry only network/server errors, NOT quota errors
        const isRetriableError =
            errorCode === 503 ||
            errorCode === 500 ||
            error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT';

        if (isRetriableError && retries > 0) {
            console.log(`⏳ Server error. Waiting ${delay}ms before retry... (${retries} attempts left)`);
            await sleep(delay);
            const nextDelay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelay);
            return retryWithBackoff(fn, retries - 1, nextDelay);
        }

        throw error;
    }
}

/**
 * SINGLE SOURCE OF TRUTH for Google Account ID
 * This is the ONLY function that calls accounts.list()
 * Uses: 1) Cooldown check, 2) DB cache, 3) In-flight lock, 4) API call (last resort)
 */
async function getGoogleAccountId({ tenantId, authClient }) {
    // 0️⃣ Check cooldown FIRST - if quota exceeded recently, STOP
    const cooldownKey = `quota_${tenantId}`;
    if (quotaCooldowns.has(cooldownKey)) {
        const cooldownUntil = quotaCooldowns.get(cooldownKey);
        if (Date.now() < cooldownUntil) {
            const remainingMinutes = Math.ceil((cooldownUntil - Date.now()) / 60000);
            console.log(`⛔ Quota cooldown active - ${remainingMinutes} min remaining`);
            const error = new Error('RATE_LIMITED_RETRY_LATER');
            error.remainingMinutes = remainingMinutes;
            throw error;
        } else {
            // Cooldown expired, remove it
            quotaCooldowns.delete(cooldownKey);
        }
    }

    // 1️⃣ Check DB first - SINGLE SOURCE OF TRUTH
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
        throw new Error('TENANT_NOT_FOUND');
    }

    if (tenant.gbp_accountId) {
        console.log('✅ Using stored Google Account ID from database');
        return tenant.gbp_accountId;
    }

    // 2️⃣ If another request is already fetching → WAIT for it
    if (accountFetchLocks.has(tenantId)) {
        console.log('⏳ Waiting for in-flight Google account fetch...');
        return accountFetchLocks.get(tenantId);
    }

    // 3️⃣ Create a LOCKED fetch (only one per tenant at a time)
    const fetchPromise = (async () => {
        console.log('⚠️ Fetching accounts from Google API (LOCKED)');
        console.log('🔥 GOOGLE API CALL: accounts.list() | Tenant:', tenantId);

        try {
            const accountMgmt = google.mybusinessaccountmanagement({
                version: 'v1',
                auth: authClient,
            });

            // Add delay to prevent rapid requests
            await sleep(API_CALL_DELAY);

            const res = await accountMgmt.accounts.list();

            if (!res.data.accounts?.length) {
                throw new Error('NO_GOOGLE_ACCOUNTS_FOUND');
            }

            const accountId = res.data.accounts[0].name;

            // Save to database for future use - PERMANENT CACHE
            await Tenant.update(
                { gbp_accountId: accountId },
                { where: { id: tenantId } }
            );

            console.log('💾 Google Account ID cached in DB:', accountId);
            return accountId;

        } catch (err) {
            // DO NOT retry 429 errors - SET COOLDOWN
            if (err.code === 429 || err.response?.status === 429) {
                const cooldownUntil = Date.now() + QUOTA_COOLDOWN_DURATION;
                quotaCooldowns.set(cooldownKey, cooldownUntil);
                console.error(`❌ QUOTA EXCEEDED – cooldown set for ${QUOTA_COOLDOWN_DURATION / 60000} minutes`);
                const quotaError = new Error('RATE_LIMITED_RETRY_LATER');
                quotaError.remainingMinutes = QUOTA_COOLDOWN_DURATION / 60000;
                throw quotaError;
            }
            throw err;
        }
    })();

    accountFetchLocks.set(tenantId, fetchPromise);

    try {
        return await fetchPromise;
    } finally {
        accountFetchLocks.delete(tenantId);
    }
}

function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

/**
 * Helper: Refresh access token if expired
 * CRITICAL: Never refresh token during quota cooldown
 */
async function ensureValidToken(tenant, tenantId) {
    const cooldownKey = `quota_${tenantId}`;

    // 🚫 Never refresh token during quota cooldown
    if (quotaCooldowns.has(cooldownKey)) {
        throw new Error('QUOTA_COOLDOWN_ACTIVE');
    }

    const expiryDate = new Date(tenant.gbp_tokenExpiry);
    const now = new Date();

    if (now >= new Date(expiryDate.getTime() - 5 * 60 * 1000)) {
        console.log(`🔄 Token expiring for tenant ${tenant.slug}, refreshing...`);
        return await refreshTenantAccessToken(tenant.id);
    }

    return tenant.gbp_accessToken;
}

/**
 * Fetch and save Google Business locations for a tenant
 * CRITICAL FIX: Serialize API calls with delays to prevent quota exceeded
 */
async function fetchAndSaveLocations(tenant, oauth2Client, accountId) {
    try {
        const mybusiness = google.mybusinessbusinessinformation({ version: 'v1', auth: oauth2Client });

        // Check cache first
        const cacheKey = `locations_${tenant.id}`;
        let locations = [];

        if (locationCache.has(cacheKey)) {
            const cached = locationCache.get(cacheKey);
            if (Date.now() - cached.timestamp < LOCATION_CACHE_TTL) {
                console.log(`✅ Using cached location data for tenant ${tenant.slug}`);
                locations = cached.data;
            }
        }

        // Fetch from API if not cached
        if (locations.length === 0) {
            console.log(`📍 Fetching locations from Google API for account: ${accountId}`); console.log('🔥 GOOGLE API CALL: accounts.locations.list() | Tenant:', tenant.slug);
            // Add delay before API call
            await sleep(API_CALL_DELAY);

            const response = await mybusiness.accounts.locations.list({
                parent: accountId,
                readMask: 'name,title,storefrontAddress'
            });

            locations = response.data.locations || [];
            console.log(`✅ Found ${locations.length} location(s)`);

            // Cache the results
            locationCache.set(cacheKey, {
                data: locations,
                timestamp: Date.now()
            });
        }

        // Get existing locations from database
        const existingLocations = await Location.findAll({
            where: { tenantId: tenant.id },
            attributes: ['googleLocationId']
        });

        const existingLocationIds = new Set(existingLocations.map(l => l.googleLocationId));

        let savedCount = 0;
        let skippedCount = 0;

        // CRITICAL: Process locations SERIALLY with delays, NOT in parallel
        for (const location of locations) {
            const locationId = location.name;

            if (existingLocationIds.has(locationId)) {
                console.log(`  ⏩ Location already exists: ${location.title}`);
                skippedCount++;
                continue;
            }

            // Add delay between operations
            await sleep(API_CALL_DELAY);

            await Location.create({
                tenantId: tenant.id,
                googleLocationId: locationId,
                locationName: location.title || 'Unnamed Location',
                address: location.storefrontAddress ?
                    `${location.storefrontAddress.addressLines?.[0] || ''}, ${location.storefrontAddress.locality || ''}` :
                    null,
                isActive: true,
            });

            console.log(`  ✅ Saved new location: ${location.title}`);
            savedCount++;
        }

        console.log(`🎯 Location sync complete: ${savedCount} new, ${skippedCount} existing`);

        return {
            total: locations.length,
            saved: savedCount,
            skipped: skippedCount,
        };

    } catch (error) {
        // Handle quota exceeded errors specially
        if (error.code === 'QUOTA_EXCEEDED' || error.status === 429) {
            console.error('❌ Quota exceeded while fetching locations');
            console.error('   Location sync will be retried later via background job');
            throw error;
        }

        console.error('Error fetching and saving locations:', error.message);
        throw error;
    }
}

// --- CONTROLLERS ---

/**
 * Initiate Google OAuth flow
 * @route GET /api/google-oauth/connect
 */
const initiateOAuthFlow = async (req, res) => {
    try {
        let tenantId;

        if (req.params.tenantId) {
            tenantId = req.params.tenantId;
        } else if (req.user) {
            tenantId = req.user.tenant || req.user.tenantId;
        }

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required. Please log in again or complete registration.'
            });
        }

        // Sequelize: findByPk
        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        const oauth2Client = getOAuth2Client();

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent',
            state: tenantId.toString(),
        });

        res.json({
            success: true,
            authUrl,
            message: 'Redirect user to this URL to authorize Google Business access'
        });

    } catch (error) {
        console.error('OAuth initiation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate OAuth flow',
            error: error.message
        });
    }
};

/**
 * Handle OAuth callback and store tokens
 * FIXED: ONLY saves tokens, does NOT call Google APIs
 * @route GET /api/google-oauth/callback
 */
const handleOAuthCallback = async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).json({
                success: false,
                message: 'Authorization code and state are required'
            });
        }

        const tenantId = state;
        // Sequelize: findByPk
        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
            console.warn('⚠️ No refresh token received. User may need to re-authorize with consent.');
        }

        // FIXED: Update flat fields in Sequelize model
        tenant.gbp_accessToken = tokens.access_token;
        if (tokens.refresh_token) {
            tenant.gbp_refreshToken = tokens.refresh_token;
        }
        tenant.gbp_tokenExpiry = new Date(tokens.expiry_date || (Date.now() + 3600 * 1000));
        // Don't set gbp_accountId to null - let it persist or be fetched later

        await tenant.save();
        console.log(`✓ Google Business tokens saved for tenant: ${tenant.slug}`);

        // FIXED: Immediately redirect, don't call any Google APIs here
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/onboarding/success?connected=true`);

    } catch (error) {
        console.error('OAuth callback error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/onboarding/success?connected=false&error=${encodeURIComponent(error.message)}`);
    }
};

/**
 * NEW: Sync Google Business locations (separate from OAuth)
 * Call this AFTER OAuth callback completes
 * CRITICAL FIX: Uses cached account data to prevent quota issues
 * @route POST /api/google-oauth/sync-locations
 */
const syncGoogleLocations = async (req, res) => {
    try {
        const tenantId = req.user.tenant || req.user.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // CRITICAL FIX: Check cooldown at ROUTE LEVEL (before any processing)
        const cooldownKey = `quota_${tenantId}`;
        if (quotaCooldowns.has(cooldownKey)) {
            const cooldownUntil = quotaCooldowns.get(cooldownKey);
            const remainingMinutes = Math.ceil((cooldownUntil - Date.now()) / 60000);
            console.log(`⛔ Route blocked - quota cooldown active (${remainingMinutes} min remaining)`);
            return res.status(429).json({
                success: false,
                message: `Google API quota cooldown active. Please retry in ${remainingMinutes} minutes.`,
                retryAfter: 600
            });
        }

        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        if (!tenant.gbp_refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Google Business Profile not connected. Please connect first.'
            });
        }

        // Set up OAuth client
        const oauth2Client = getOAuth2Client();
        const accessToken = await ensureValidToken(tenant);

        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: tenant.gbp_refreshToken
        });

        // Get account ID using SINGLE source of truth
        let accountId;

        try {
            accountId = await getGoogleAccountId({
                tenantId,
                authClient: oauth2Client
            });
            console.log(`✅ Account ID obtained: ${accountId}`);
        } catch (error) {
            // Handle quota exceeded - STOP immediately
            if (error.message === 'RATE_LIMITED_RETRY_LATER') {
                console.warn('⛔ Skipping Google calls – retry after 5+ minutes');
                return res.status(429).json({
                    success: false,
                    message: 'Google API quota exceeded. Please try again in 5+ minutes.',
                    error: 'QUOTA_EXCEEDED',
                    retryAfter: 300
                });
            }

            if (error.message === 'NO_GOOGLE_ACCOUNTS_FOUND') {
                return res.status(404).json({
                    success: false,
                    message: 'No Google Business accounts found'
                });
            }

            throw error;
        }

        // Fetch and save locations (with serialization and delays)
        console.log('📍 Starting location sync...');
        const result = await fetchAndSaveLocations(tenant, oauth2Client, accountId);

        res.json({
            success: true,
            message: 'Locations synced successfully',
            accountId,
            locationsFound: result.total,
            locationsSaved: result.saved,
            locationsSkipped: result.skipped
        });

    } catch (error) {
        console.error('❌ Sync locations error:', error);

        // Handle quota exceeded errors
        if (error.message === 'RATE_LIMITED_RETRY_LATER' || error.code === 'QUOTA_EXCEEDED' || error.status === 429) {
            return res.status(429).json({
                success: false,
                message: 'Google API quota exceeded. Please try again in 5+ minutes.',
                error: 'QUOTA_EXCEEDED',
                retryAfter: 300
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to sync locations',
            error: error.message
        });
    }


};

/**
 * Refresh access token using refresh token
 * ✅ Modern & recommended method
 */
async function refreshTenantAccessToken(tenantId) {
    try {
        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant || !tenant.gbp_refreshToken) {
            throw new Error('Tenant or refresh token not found');
        }

        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({
            refresh_token: tenant.gbp_refreshToken
        });

        // ✅ Modern & recommended method
        const { token } = await oauth2Client.getAccessToken();

        if (!token) {
            throw new Error('Failed to obtain access token');
        }

        tenant.gbp_accessToken = token;
        tenant.gbp_tokenExpiry = new Date(Date.now() + 3600 * 1000);
        await tenant.save();

        console.log(`✓ Access token refreshed for tenant: ${tenant.slug}`);
        return token;

    } catch (error) {
        console.error('Token refresh error:', error);
        throw new Error('Failed to refresh access token');
    }
}

/**
 * Fetch and sync reviews for all locations of a tenant
 * @route POST /api/google-oauth/sync-reviews
 */
const fetchAndSyncReviews = async (req, res) => {
    try {
        const tenantId = req.user.tenant || req.user.tenantId;

        if (!tenantId) {
            return res.status(400).json({ success: false, message: 'Tenant ID is required' });
        }

        // 🔒 Check if sync is already in progress for this tenant
        if (activeSyncs.has(tenantId)) {
            const syncStartTime = activeSyncs.get(tenantId);
            const elapsedMinutes = Math.floor((Date.now() - syncStartTime) / 60000);
            console.log(`⚠️ Sync already in progress for tenant ${tenantId} (started ${elapsedMinutes} min ago)`);
            return res.status(409).json({
                success: false,
                message: 'Review sync is already in progress. Please wait for it to complete.',
                syncInProgress: true
            });
        }

        // Mark sync as active
        activeSyncs.set(tenantId, Date.now());

        let tenant = await Tenant.findByPk(tenantId);
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        }

        if (!tenant.gbp_refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Google Business Profile not connected.'
            });
        }

        // 🚫 CRITICAL: Account must be verified FIRST (don't call accounts.list here)
        if (!tenant.gbp_accountId) {
            return res.status(400).json({
                success: false,
                message: 'Account not verified yet. Please verify your Google Business account first.',
                action: 'VERIFY_ACCOUNT_FIRST'
            });
        }

        let accessToken;
        try {
            accessToken = await ensureValidToken(tenant, tenantId);
        } catch (tokenError) {
            if (tokenError.message === 'QUOTA_COOLDOWN_ACTIVE') {
                return res.status(429).json({
                    success: false,
                    message: 'Google API cooldown active. Please retry later.',
                    retryAfter: 600
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Failed to refresh Google access token. Please reconnect account.',
                error: tokenError.message
            });
        }

        // Sequelize: findAll({ where: ... })
        const locations = await Location.findAll({
            where: {
                tenantId: tenantId,
                isActive: true
            }
        });

        if (locations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No locations found. Please sync locations first.'
            });
        }

        let totalNewReviews = 0;
        let totalUpdatedReviews = 0;
        const locationResults = [];

        console.log(`📊 Syncing ${locations.length} locations...`);

        for (const location of locations) {
            // CRITICAL: 2-second delay between locations to prevent rate limiting
            await sleep(2000);

            try {
                // Determine accountId (might be in tenant or location)
                const accountId = tenant.gbp_accountId || location.googleAccountId;

                console.log('🔥 GOOGLE API CALL: fetchGoogleReviews | Location:', location.locationName, '| Tenant:', tenant.slug);

                const googleReviewsResult = await fetchGoogleReviews(
                    accountId,
                    location.googleLocationId,
                    accessToken,
                    { maxPages: 1 } // Only fetch first page to minimize API calls
                );

                let newReviewsCount = 0;
                let updatedReviewsCount = 0;

                // FIX: googleReviewsResult.reviews is the array, not googleReviewsResult directly
                const googleReviews = googleReviewsResult.reviews || [];

                for (const googleReview of googleReviews) {
                    const existingReview = await Review.findOne({
                        where: { google_review_id: googleReview.google_review_id }
                    });

                    if (existingReview) {
                        existingReview.has_reply = googleReview.has_reply;
                        existingReview.rating = googleReview.rating;
                        existingReview.review_text = googleReview.review_text;
                        await existingReview.save();
                        updatedReviewsCount++;
                    } else {
                        await Review.create({
                            tenantId: tenant.id,
                            locationId: location.id,
                            ...googleReview,
                        });
                        newReviewsCount++;
                    }
                }

                totalNewReviews += newReviewsCount;
                totalUpdatedReviews += updatedReviewsCount;

                locationResults.push({
                    locationId: location.id,
                    locationName: location.name,
                    status: 'success',
                    new: newReviewsCount,
                    updated: updatedReviewsCount
                });

            } catch (locError) {
                console.error(`Error syncing reviews for location ${location.name}:`, locError.message);

                // If it's a 429 error, stop sync immediately and set cooldown
                if (locError.code === 'QUOTA_EXCEEDED' || locError.status === 429 ||
                    locError.response?.status === 429 || locError.message?.includes('429')) {
                    console.error('🚨 429 ERROR - Stopping sync and activating cooldown');

                    // Set cooldown
                    const cooldownKey = `quota_${tenantId}`;
                    quotaCooldowns.set(cooldownKey, Date.now() + QUOTA_COOLDOWN_DURATION);

                    return res.status(429).json({
                        success: false,
                        message: 'Google API rate limit reached. Sync stopped. Please try again later.',
                        retryAfter: Math.ceil(QUOTA_COOLDOWN_DURATION / 1000),
                        partialResults: {
                            totalNewReviews,
                            totalUpdatedReviews,
                            locationsProcessed: locationResults.length,
                            locationResults
                        }
                    });
                }

                locationResults.push({
                    locationId: location.id,
                    locationName: location.name,
                    status: 'failed',
                    error: locError.message
                });
            }
        }

        res.json({
            success: true,
            message: 'Reviews sync process completed',
            data: {
                totalNewReviews,
                totalUpdatedReviews,
                locationsProcessed: locations.length,
                locationResults
            }
        });

    } catch (error) {
        console.error('Sync reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync reviews',
            error: error.message
        });
    } finally {
        // Always release the sync lock
        activeSyncs.delete(req.user.tenant || req.user.tenantId);
    }
};

/**
 * Get Google Business connection status
 */
const getConnectionStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenant || req.user.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID not found in token. Please login again.'
            });
        }

        const tenant = await Tenant.findByPk(tenantId);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: `Tenant not found for ID: ${tenantId}. Please contact support.`
            });
        }

        const isConnected = !!(tenant.gbp_accessToken && tenant.gbp_refreshToken);

        const response = {
            success: true,
            isConnected,
        };

        if (isConnected) {
            response.accountId = tenant.gbp_accountId;
            response.tokenExpiry = tenant.gbp_tokenExpiry;
            response.isTokenExpired = new Date() > new Date(tenant.gbp_tokenExpiry);

            response.locationsCount = await Location.count({
                where: {
                    tenantId: tenantId,
                    isActive: true
                }
            });

        }

        res.json(response);
        console.log(response);

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Disconnect Google Business account
 */
const disconnectGoogleAccount = async (req, res) => {
    try {
        const tenantId = req.user.tenant || req.user.tenantId;
        const tenant = await Tenant.findByPk(tenantId);

        if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

        if (tenant.gbp_accessToken) {
            try {
                const oauth2Client = getOAuth2Client();
                await oauth2Client.revokeToken(tenant.gbp_accessToken);
            } catch (e) {
                console.warn('Could not revoke token with Google (might already be invalid):', e.message);
            }
        }

        // Use update or set properties
        tenant.gbp_accountId = null;
        tenant.gbp_accessToken = null;
        tenant.gbp_refreshToken = null;
        tenant.gbp_tokenExpiry = null;

        await tenant.save();

        res.json({
            success: true,
            message: 'Google Business account disconnected successfully'
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to disconnect', error: error.message });
    }
};

/**
 * Verify if the connected Google account has a Google Business Profile
 * @route GET /api/google-oauth/verify-business-account
 */
const verifyGoogleBusinessAccount = async (req, res) => {
    try {
        const tenantId = req.user.tenant || req.user.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // CRITICAL FIX: Check cooldown at ROUTE LEVEL (before any processing)
        const cooldownKey = `quota_${tenantId}`;
        if (quotaCooldowns.has(cooldownKey)) {
            const cooldownUntil = quotaCooldowns.get(cooldownKey);
            const remainingMinutes = Math.ceil((cooldownUntil - Date.now()) / 60000);
            console.log(`⛔ Route blocked - quota cooldown active (${remainingMinutes} min remaining)`);
            return res.status(429).json({
                success: false,
                message: `Google API quota cooldown active. Please retry in ${remainingMinutes} minutes.`,
                retryAfter: 600
            });
        }

        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        if (!tenant.gbp_refreshToken) {
            return res.status(400).json({
                success: false,
                hasBusinessAccount: false,
                message: 'Google account not connected. Please connect first.'
            });
        }

        // OPTIMIZATION: If we already have the account ID stored, skip the API call
        if (tenant.gbp_accountId) {
            console.log(`✓ Using cached account ID for tenant ${tenant.slug}: ${tenant.gbp_accountId}`);
            return res.json({
                success: true,
                hasBusinessAccount: true,
                accountId: tenant.gbp_accountId,
                message: 'Google Business Profile already verified!',
                cached: true
            });
        }

        // Set up OAuth client
        const oauth2Client = getOAuth2Client();

        let accessToken;
        try {
            accessToken = await ensureValidToken(tenant, tenantId);
        } catch (err) {
            if (err.message === 'QUOTA_COOLDOWN_ACTIVE') {
                return res.status(429).json({
                    success: false,
                    message: 'Google API cooldown active. Please retry later.',
                    retryAfter: 600
                });
            }
            throw err;
        }

        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: tenant.gbp_refreshToken
        });

        try {
            // Use SINGLE source of truth for account ID
            const accountId = await getGoogleAccountId({
                tenantId,
                authClient: oauth2Client
            });

            // Extract just the ID number from "accounts/123456789"
            const accountIdOnly = accountId.includes('/') ? accountId.split('/')[1] : accountId;

            console.log(`✅ Account ID retrieved: ${accountId}`);

            return res.json({
                success: true,
                hasBusinessAccount: true,
                accountId: accountIdOnly,
                message: 'Google Business Profile found successfully!'
            });

        } catch (apiError) {
            console.error('Google API error during verification:', apiError);

            // STOP on quota exceeded - NO RETRIES
            if (apiError.message === 'RATE_LIMITED_RETRY_LATER') {
                console.warn('⛔ Skipping verification – retry after 5+ minutes');
                return res.status(429).json({
                    success: false,
                    message: 'Google API quota exceeded. Please try again in 5+ minutes.',
                    error: 'QUOTA_EXCEEDED',
                    retryAfter: 300
                });
            }

            // No Google accounts found
            if (apiError.message === 'NO_GOOGLE_ACCOUNTS_FOUND') {
                return res.json({
                    success: true,
                    hasBusinessAccount: false,
                    message: "You don't have a Google Business account. Please create a Google Business Profile first to use this feature."
                });
            }

            // Check if it's a 403 error (no permission/no business account)
            const errorCode = apiError.code || (apiError.response && apiError.response.status);
            if (errorCode === 403) {
                return res.json({
                    success: true,
                    hasBusinessAccount: false,
                    message: "You don't have a Google Business account or the required permissions. Please create a Google Business Profile first."
                });
            }

            throw apiError;
        }

    } catch (error) {
        console.error('Verify business account error:', error);

        // Check if it's a quota error
        const errorCode = error.code || (error.response && error.response.status);
        if (errorCode === 429 || error.message?.includes('Quota exceeded')) {
            return res.status(429).json({
                success: false,
                message: 'Google API quota exceeded. Please try again in a few minutes.',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to verify Google Business account',
            error: error.message
        });
    }
};

/**
 * Get all locations for the authenticated tenant
 */
const getLocations = async (req, res) => {
    try {
        const tenantId = req.user.tenant || req.user.tenantId;
        const locations = await Location.findAll({
            where: {
                tenantId: tenantId,
                isActive: true
            },
            attributes: ['name', 'slug', 'address', 'googleLocationId', 'createdAt']
        });

        res.json({
            success: true,
            data: locations,
            count: locations.length
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get locations', error: error.message });
    }
};

/**
 * Initial sync after OAuth - runs ONCE to fetch and store all Google data
 * @route POST /api/google-oauth/initial-sync
 */
const initialGoogleSync = async (req, res) => {
    try {
        const tenantId = req.user.tenant || req.user.tenantId;

        if (!tenantId) {
            return res.status(400).json({ success: false, message: 'Tenant ID is required' });
        }

        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        }

        // Check if already synced
        if (tenant.gbp_initialSyncDone) {
            return res.json({
                success: true,
                message: 'Initial sync already completed',
                alreadySynced: true
            });
        }

        if (!tenant.gbp_refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Google Business Profile not connected.'
            });
        }

        console.log('🚀 Starting INITIAL SYNC for tenant:', tenant.slug);

        // Set up OAuth client
        const oauth2Client = getOAuth2Client();

        let accessToken;
        try {
            accessToken = await ensureValidToken(tenant, tenantId);
        } catch (tokenError) {
            if (tokenError.message === 'QUOTA_COOLDOWN_ACTIVE') {
                return res.status(429).json({
                    success: false,
                    message: 'Google API cooldown active. Initial sync will retry automatically.',
                    retryAfter: 600
                });
            }
            throw tokenError;
        }

        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: tenant.gbp_refreshToken
        });

        // STEP 1: Get account ID
        console.log('Step 1/3: Fetching Google account...');
        let accountId;
        try {
            accountId = await getGoogleAccountId({
                tenantId,
                authClient: oauth2Client
            });
        } catch (accountError) {
            if (accountError.message === 'RATE_LIMITED_RETRY_LATER') {
                const remainingMinutes = Math.ceil(accountError.remainingMinutes || 0.5);
                return res.status(429).json({
                    success: false,
                    message: `Google API quota exceeded. Please retry in ${remainingMinutes} minute(s).`,
                    error: 'RATE_LIMITED_RETRY_LATER',
                    retryAfter: remainingMinutes * 60
                });
            }
            throw accountError;
        }

        // STEP 2: Fetch and save locations
        console.log('Step 2/3: Fetching locations...');
        const locationResult = await fetchAndSaveLocations(tenant, oauth2Client, accountId);

        // STEP 3: Fetch and save reviews for all locations
        console.log('Step 3/3: Fetching reviews...');
        const locations = await Location.findAll({
            where: {
                tenantId: tenantId,
                isActive: true
            }
        });

        let totalNewReviews = 0;
        let totalUpdatedReviews = 0;

        for (const location of locations) {
            await sleep(1000); // Delay between locations

            try {
                const googleReviews = await fetchGoogleReviews(
                    accountId,
                    location.googleLocationId,
                    accessToken
                );

                for (const googleReview of googleReviews.reviews || []) {
                    const existingReview = await Review.findOne({
                        where: { google_review_id: googleReview.google_review_id }
                    });

                    if (existingReview) {
                        existingReview.has_reply = googleReview.has_reply;
                        existingReview.rating = googleReview.rating;
                        existingReview.review_text = googleReview.review_text;
                        await existingReview.save();
                        totalUpdatedReviews++;
                    } else {
                        await Review.create({
                            tenantId: tenant.id,
                            locationId: location.id,
                            ...googleReview,
                        });
                        totalNewReviews++;
                    }
                }
            } catch (locError) {
                console.error(`Error fetching reviews for location ${location.locationName}:`, locError.message);
            }
        }

        // Mark sync as completed
        tenant.gbp_initialSyncDone = true;
        tenant.gbp_lastSyncAt = new Date();
        await tenant.save();

        console.log(`✅ INITIAL SYNC COMPLETE: ${totalNewReviews} new, ${totalUpdatedReviews} updated`);

        res.json({
            success: true,
            message: 'Initial sync completed successfully',
            data: {
                accountId,
                locationsFound: locationResult.total,
                locationsSaved: locationResult.saved,
                reviewsNew: totalNewReviews,
                reviewsUpdated: totalUpdatedReviews
            }
        });

    } catch (error) {
        console.error('❌ Initial sync error:', error);

        // Handle rate limit errors
        if (error.message === 'RATE_LIMITED_RETRY_LATER' || error.code === 'QUOTA_EXCEEDED' || error.status === 429) {
            const remainingMinutes = Math.ceil(error.remainingMinutes || 5);
            return res.status(429).json({
                success: false,
                message: `Google API quota exceeded. Please retry in ${remainingMinutes} minute(s).`,
                error: 'RATE_LIMITED_RETRY_LATER',
                retryAfter: remainingMinutes * 60
            });
        }

        res.status(500).json({
            success: false,
            message: 'Initial sync failed. Please try again later.',
            error: error.message
        });
    }
};

module.exports = {
    initiateOAuthFlow,
    handleOAuthCallback,
    syncGoogleLocations,
    getConnectionStatus,
    disconnectGoogleAccount,
    refreshTenantAccessToken,
    fetchAndSyncReviews,
    getLocations,
    verifyGoogleBusinessAccount,
    initialGoogleSync,
    // Export quota cooldown map for other controllers
    quotaCooldowns,
    QUOTA_COOLDOWN_DURATION,
};