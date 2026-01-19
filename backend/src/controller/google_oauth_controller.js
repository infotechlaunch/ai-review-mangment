const { google } = require('googleapis');
const Tenant = require('../models/Tenant');
const Location = require('../models/Location');
const Review = require('../models/Review');
const { fetchGoogleReviews } = require('../services/googleBusinessService');
const { accountManagementLimiter, businessInfoLimiter } = require('../utils/rateLimiter');

// Rate limiting and retry configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 60000, // 60 seconds
    backoffMultiplier: 2
};

// Simple in-memory cache for account data
const accountCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Sleep utility for delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry function with exponential backoff
 */
const retryWithBackoff = async (fn, retries = RETRY_CONFIG.maxRetries, delay = RETRY_CONFIG.initialDelay) => {
    try {
        return await fn();
    } catch (error) {
        // Check if it's a quota error
        const isQuotaError = error.code === 429 ||
            error.status === 429 ||
            (error.message && error.message.includes('Quota exceeded'));

        if (isQuotaError && retries > 0) {
            console.log(`⏳ Quota exceeded. Retrying in ${delay}ms... (${retries} retries left)`);
            await sleep(delay);
            const nextDelay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelay);
            return retryWithBackoff(fn, retries - 1, nextDelay);
        }
        throw error;
    }
};

/**
 * Google OAuth Controller
 * Handles Google Business Profile OAuth connection flow
 */

// OAuth2 client configuration
const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/google-oauth/callback'
    );
};

// Scopes required for Google Business Profile API
const SCOPES = [
    'https://www.googleapis.com/auth/business.manage',
];

/**
 * Initiate Google OAuth flow
 * @route GET /api/google-oauth/connect
 * @returns {object} Authorization URL to redirect user
 */
const initiateOAuthFlow = async (req, res) => {
    try {
        // Support both authenticated and onboarding flow
        let tenantId;

        if (req.params.tenantId) {
            // Onboarding flow - tenantId from URL parameter
            tenantId = req.params.tenantId;
        } else if (req.user) {
            // Authenticated flow - tenantId from JWT
            tenantId = req.user.tenant || req.user.tenantId;
        }

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required. Please log in again or complete registration.'
            });
        }

        // Verify tenant exists
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        const oauth2Client = getOAuth2Client();

        // Generate authorization URL
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline', // Required to get refresh token
            scope: SCOPES,
            prompt: 'consent', // Force consent screen to get refresh token every time
            state: tenantId.toString(), // Pass tenant ID in state for callback
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
 * @route GET /api/google-oauth/callback
 * @param {string} code - Authorization code from Google
 * @param {string} state - Tenant ID passed in state parameter
 * @returns {object} Success message
 */
const handleOAuthCallback = async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Authorization code is required'
            });
        }

        const tenantId = state;
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid state parameter. Tenant ID not found.'
            });
        }

        // Verify tenant exists
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        const oauth2Client = getOAuth2Client();

        // Exchange authorization code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token not received. Please try again with consent prompt.'
            });
        }

        // Set credentials to use the access token
        oauth2Client.setCredentials(tokens);

        // Check cache first to avoid unnecessary API calls
        const cacheKey = `accounts_${tenantId}`;
        let accountId;

        const cachedData = accountCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
            console.log('✓ Using cached account data');
            accountId = cachedData.accountId;
        } else {
            // Fetch Google Business accounts with retry logic
            const mybusiness = google.mybusinessaccountmanagement({ version: 'v1', auth: oauth2Client });

            const accountsResponse = await retryWithBackoff(async () => {
                return await accountManagementLimiter.execute(async () => {
                    return await mybusiness.accounts.list();
                });
            });

            const accounts = accountsResponse.data.accounts || [];
            if (accounts.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No Google Business accounts found for this Google account'
                });
            }

            // Use the first account (or you can let user choose)
            const accountName = accounts[0].name; // Format: "accounts/123456789"
            accountId = accountName.split('/')[1];

            // Cache the account data
            accountCache.set(cacheKey, {
                accountId,
                timestamp: Date.now()
            });
            console.log('✓ Cached account data for future requests');
        }

        // Calculate token expiry
        const tokenExpiry = new Date(Date.now() + (tokens.expiry_date || 3600 * 1000));

        // Update tenant with OAuth credentials
        tenant.googleBusinessProfile = {
            accountId: accountId,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiry: tokenExpiry,
        };

        await tenant.save();

        console.log(`✓ Google Business account connected for tenant: ${tenant.slug}`);

        // Fetch and save locations with retry logic
        try {
            await fetchAndSaveLocations(tenant, oauth2Client, accountId);
        } catch (locError) {
            console.warn('Warning: Could not fetch locations:', locError.message);
            // Continue even if location fetch fails
        }

        // Add delay before syncing reviews to avoid quota issues
        console.log('⏳ Waiting before syncing reviews to avoid rate limits...');
        await sleep(2000); // 2 second delay

        // Sync reviews after connection - do this in background to avoid blocking the response
        // We'll skip this during initial connection to reduce API calls
        console.log('ℹ️ Skipping initial review sync to avoid quota issues. Reviews will be synced later.');

        // Optional: You can uncomment this to sync reviews, but it may cause quota issues
        /*
        try {
            const locations = await Location.find({ tenant: tenant._id, isActive: true });
            for (const location of locations) {
                try {
                    await sleep(1000); // Delay between each location
                    await fetchGoogleReviews(accountId, location.googleLocationId, tokens.access_token);
                } catch (reviewError) {
                    console.warn(`Warning: Could not fetch reviews for location ${location.name}:`, reviewError.message);
                }
            }
        } catch (syncError) {
            console.warn('Warning: Could not sync reviews:', syncError.message);
        }
        */

        // Redirect to frontend success page
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/onboarding/success?connected=true`);

    } catch (error) {
        console.error('OAuth callback error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/onboarding/success?connected=false&error=${encodeURIComponent(error.message)}`);
    }
};

/**
 * Fetch and save Google Business locations for a tenant
 * @param {object} tenant - Tenant document
 * @param {object} oauth2Client - Configured OAuth2 client
 * @param {string} accountId - Google Business account ID
 */
const fetchAndSaveLocations = async (tenant, oauth2Client, accountId) => {
    try {
        const mybusiness = google.mybusinessbusinessinformation({ version: 'v1', auth: oauth2Client });

        // Use retry logic and rate limiting for location fetching
        const locationsResponse = await retryWithBackoff(async () => {
            return await businessInfoLimiter.execute(async () => {
                return await mybusiness.accounts.locations.list({
                    parent: `accounts/${accountId}`,
                    readMask: 'name,title,storefrontAddress',
                });
            });
        });

        const locations = locationsResponse.data.locations || [];

        for (const googleLocation of locations) {
            const locationId = googleLocation.name.split('/').pop();
            const locationName = googleLocation.title || `Location ${locationId}`;

            // Create slug from location name
            const slug = locationName
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            // Check if location already exists
            const existingLocation = await Location.findOne({
                tenant: tenant._id,
                googleLocationId: locationId
            });

            if (!existingLocation) {
                const location = new Location({
                    tenant: tenant._id,
                    slug: `${slug}-${locationId.substring(0, 6)}`, // Ensure uniqueness
                    name: locationName,
                    googleLocationId: locationId,
                    googleAccountId: accountId,
                    address: googleLocation.storefrontAddress?.addressLines?.join(', ') || '',
                    isActive: true,
                });

                await location.save();
                console.log(`✓ Location saved: ${locationName}`);
            }
        }

        console.log(`✓ Fetched ${locations.length} locations for tenant: ${tenant.slug}`);

    } catch (error) {
        console.error('Error fetching locations:', error);
        throw error;
    }
};

/**
 * Get Google Business connection status
 * @route GET /api/google-oauth/status
 * @returns {object} Connection status and details
 */
const getConnectionStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenant || req.user.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        const isConnected = !!(
            tenant.googleBusinessProfile?.accountId &&
            tenant.googleBusinessProfile?.refreshToken
        );

        const response = {
            success: true,
            isConnected,
        };

        if (isConnected) {
            response.accountId = tenant.googleBusinessProfile.accountId;
            response.tokenExpiry = tenant.googleBusinessProfile.tokenExpiry;
            response.isTokenExpired = new Date() > new Date(tenant.googleBusinessProfile.tokenExpiry);

            // Get locations count
            const locationsCount = await Location.countDocuments({
                tenant: tenantId,
                isActive: true
            });
            response.locationsCount = locationsCount;
        }

        res.json(response);

    } catch (error) {
        console.error('Get connection status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get connection status',
            error: error.message
        });
    }
};

/**
 * Disconnect Google Business account
 * @route POST /api/google-oauth/disconnect
 * @returns {object} Success message
 */
const disconnectGoogleAccount = async (req, res) => {
    try {
        const tenantId = req.user.tenant || req.user.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        // Clear Google Business credentials
        tenant.googleBusinessProfile = {
            accountId: null,
            locationId: null,
            accessToken: null,
            refreshToken: null,
            tokenExpiry: null,
        };

        await tenant.save();

        console.log(`✓ Google Business account disconnected for tenant: ${tenant.slug}`);

        res.json({
            success: true,
            message: 'Google Business account disconnected successfully'
        });

    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to disconnect Google Business account',
            error: error.message
        });
    }
};

/**
 * Refresh access token using refresh token
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<string>} New access token
 */
const refreshTenantAccessToken = async (tenantId) => {
    try {
        const tenant = await Tenant.findById(tenantId);
        if (!tenant || !tenant.googleBusinessProfile?.refreshToken) {
            throw new Error('Tenant or refresh token not found');
        }

        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({
            refresh_token: tenant.googleBusinessProfile.refreshToken
        });

        const { credentials } = await oauth2Client.refreshAccessToken();

        // Update tenant with new access token
        tenant.googleBusinessProfile.accessToken = credentials.access_token;
        tenant.googleBusinessProfile.tokenExpiry = new Date(credentials.expiry_date);
        await tenant.save();

        console.log(`✓ Access token refreshed for tenant: ${tenant.slug}`);

        return credentials.access_token;

    } catch (error) {
        console.error('Token refresh error:', error);
        throw new Error('Failed to refresh access token');
    }
};

/**
 * Fetch and sync reviews for all locations of a tenant
 * @route POST /api/google-oauth/sync-reviews
 * @returns {object} Sync results
 */
const fetchAndSyncReviews = async (req, res) => {
    try {
        const tenantId = req.user.tenant || req.user.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        if (!tenant.googleBusinessProfile?.accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Google Business Profile not connected. Please connect your account first.'
            });
        }

        // Get all locations for this tenant
        const locations = await Location.find({
            tenant: tenantId,
            isActive: true
        });

        if (locations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No locations found. Please ensure your Google Business locations are synced.'
            });
        }

        let totalNewReviews = 0;
        let totalUpdatedReviews = 0;
        const locationResults = [];

        // Fetch reviews for each location
        for (const location of locations) {
            try {
                const googleReviews = await fetchGoogleReviews(
                    tenant.googleBusinessProfile.accountId,
                    location.googleLocationId,
                    tenant.googleBusinessProfile.accessToken
                );

                let newReviewsCount = 0;
                let updatedReviewsCount = 0;

                // Process each review
                for (const googleReview of googleReviews) {
                    const existingReview = await Review.findOne({
                        google_review_id: googleReview.google_review_id
                    });

                    if (existingReview) {
                        // Update existing review
                        existingReview.has_reply = googleReview.has_reply;
                        existingReview.rating = googleReview.rating;
                        existingReview.review_text = googleReview.review_text;
                        await existingReview.save();
                        updatedReviewsCount++;
                    } else {
                        // Create new review
                        await Review.create({
                            tenant: tenant._id,
                            location: location._id,
                            ...googleReview,
                        });
                        newReviewsCount++;
                    }
                }

                totalNewReviews += newReviewsCount;
                totalUpdatedReviews += updatedReviewsCount;

                locationResults.push({
                    locationId: location._id,
                    locationName: location.name,
                    totalFetched: googleReviews.length,
                    newReviews: newReviewsCount,
                    updatedReviews: updatedReviewsCount
                });

                console.log(`✓ Synced reviews for ${location.name}: ${newReviewsCount} new, ${updatedReviewsCount} updated`);

            } catch (locError) {
                console.error(`Error syncing reviews for location ${location.name}:`, locError.message);
                locationResults.push({
                    locationId: location._id,
                    locationName: location.name,
                    error: locError.message
                });
            }
        }

        res.json({
            success: true,
            message: 'Reviews synced successfully',
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
    }
};

/**
 * Get all locations for the authenticated tenant
 * @route GET /api/google-oauth/locations
 * @returns {object} List of locations
 */
const getLocations = async (req, res) => {
    try {
        const tenantId = req.user.tenant || req.user.tenantId;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        const locations = await Location.find({
            tenant: tenantId,
            isActive: true
        }).select('name slug address googleLocationId createdAt');

        res.json({
            success: true,
            data: locations,
            count: locations.length
        });

    } catch (error) {
        console.error('Get locations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get locations',
            error: error.message
        });
    }
};

module.exports = {
    initiateOAuthFlow,
    handleOAuthCallback,
    getConnectionStatus,
    disconnectGoogleAccount,
    refreshTenantAccessToken,
    fetchAndSyncReviews,
    getLocations,
};
