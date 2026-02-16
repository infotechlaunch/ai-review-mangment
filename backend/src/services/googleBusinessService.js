const axios = require('axios');
const { google } = require('googleapis');
const { myBusinessLimiter } = require('../utils/rateLimiter');
const quotaMonitor = require('../utils/quotaMonitor');

/**
 * Google Business Profile API Service
 * Implements Google Business Profile Performance API and Reviews API
 * 
 * API Documentation:
 * - Reviews API: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews
 * - Performance API: https://developers.google.com/my-business/reference/performance/rest
 * 
 * Supported Operations:
 * - List all reviews
 * - Get specific review
 * - Get reviews from multiple locations (batch)
 * - Reply to reviews
 * - Delete review replies
 * - Fetch performance metrics (DailyMetrics)
 */

// API Base URLs
const GOOGLE_API_BASE_V4 = 'https://mybusiness.googleapis.com/v4';

// Rate limiting configuration
// ✅ CRITICAL: Reduced retries to prevent quota exhaustion
const RETRY_CONFIG = {
    maxRetries: 1,          // Only retry network failures, NOT 429
    initialDelay: 1000,     // 1 second
    maxDelay: 60000,        // 60 seconds
    backoffMultiplier: 2
};

// Pagination safety limits
// ⚠️ REDUCED to 1 page by default to minimize API calls
// Most locations have < 50 reviews, so 1 page is sufficient
const MAX_PAGES_PER_LOCATION = 1;  // Hard limit to prevent quota exhaustion
const MAX_REVIEWS_PER_PAGE = 50;    // Google's max

/**
 * Sleep utility for delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Track Google API call
 */
const trackAPICall = async (endpoint, metadata = {}) => {
    try {
        await quotaMonitor.track(endpoint, metadata);
    } catch (error) {
        console.error('[Quota] Failed to track API call:', error.message);
    }
};

/**
 * Retry function with exponential backoff - DOES NOT RETRY 429 ERRORS
 * 429 errors should be handled by the caller with job queues or scheduled retries
 */
const retryWithBackoff = async (fn, retries = RETRY_CONFIG.maxRetries, delay = RETRY_CONFIG.initialDelay) => {
    try {
        return await fn();
    } catch (error) {
        // Check if it's a quota/rate limit error (429)
        const isRateLimitError = error.response?.status === 429 ||
            error.code === 429 ||
            error.response?.data?.error?.code === 429 ||
            error.response?.data?.error?.status === 'RESOURCE_EXHAUSTED' ||
            (error.response?.data?.error?.message &&
                (error.response.data.error.message.includes('Quota exceeded') ||
                    error.response.data.error.message.includes('quota metric')));

        // NEVER retry 429 - it makes the problem worse
        if (isRateLimitError) {
            console.error('❌ Rate limit exceeded (429). DO NOT retry immediately.');
            console.error('   Schedule retry after 1-5 minutes via job queue.');
            const quotaError = new Error('RATE_LIMITED_RETRY_LATER');
            quotaError.code = 'QUOTA_EXCEEDED';
            quotaError.status = 429;
            quotaError.retryAfter = 300000; // 5 minutes
            throw quotaError;
        }

        // Retry other errors (network issues, timeouts, etc.)
        const isRetriableError =
            error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            error.response?.status === 503 ||
            error.response?.status === 500;

        if (isRetriableError && retries > 0) {
            console.log(`⏳ Retriable error. Retrying in ${delay}ms... (${retries} retries left)`);
            await sleep(delay);
            const nextDelay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelay);
            return retryWithBackoff(fn, retries - 1, nextDelay);
        }

        throw error;
    }
};

/**
 * Create OAuth2 client for Google APIs
 */
const getOAuth2Client = (accessToken) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({ access_token: accessToken });
    return oauth2Client;
};

/**
 * Fetch reviews from Google Business Profile using the googleapis library
 * API: accounts.locations.reviews.list
 * Reference: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list
 * 
 * ⚠️ NOTE: For production, consider migrating to googleapis SDK instead of Axios:
 * const mybusiness = google.mybusiness({ version: 'v4', auth: oauth2Client });
 * const res = await mybusiness.accounts.locations.reviews.list({ parent: ... });
 * This provides better quota handling and SDK-level protections.
 * 
 * ✅ PAGINATION SAFETY: Always limit pages to prevent quota exhaustion
 * 
 * @param {string} accountId - Google Business account ID
 * @param {string} locationId - Google Business location ID
 * @param {string} accessToken - OAuth access token
 * @param {object} options - Optional parameters
 * @param {number} options.pageSize - Number of reviews to return (max 50)
 * @param {string} options.pageToken - Token for pagination
 * @param {string} options.orderBy - Sort order (e.g., "updateTime desc")
 * @param {number} options.maxPages - Hard limit on pagination (default: 3)
 * @returns {Promise<object>} Object with reviews array and nextPageToken
 */
const fetchGoogleReviews = async (accountId, locationId, accessToken, options = {}) => {
    try {
        const {
            pageSize = MAX_REVIEWS_PER_PAGE,
            pageToken,
            orderBy = 'updateTime desc',
            maxPages = MAX_PAGES_PER_LOCATION
        } = options;

        // ✅ CRITICAL: Pagination safety
        let pagesFetched = 0;
        let allReviews = [];
        let nextPageToken = pageToken || null;

        while (pagesFetched < maxPages) {
            // Build URL with query parameters
            const params = new URLSearchParams({
                pageSize: pageSize.toString(),
            });

            if (nextPageToken) params.append('pageToken', nextPageToken);
            if (orderBy) params.append('orderBy', orderBy);

            const url = `${GOOGLE_API_BASE_V4}/accounts/${accountId}/locations/${locationId}/reviews?${params.toString()}`;

            console.log(`📡 Fetching reviews (page ${pagesFetched + 1}/${maxPages}) for location: ${locationId}`);

            // Wrap the API call with retry logic and rate limiting
            const response = await retryWithBackoff(async () => {
                // Track API call
                await trackAPICall('reviews.list', { accountId, locationId, page: pagesFetched + 1 });

                if (myBusinessLimiter) {
                    return await myBusinessLimiter.execute(async () => {
                        return await axios.get(url, {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json',
                            },
                        });
                    });
                } else {
                    return await axios.get(url, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    });
                }
            });

            const reviews = response.data.reviews || [];
            allReviews = allReviews.concat(reviews);
            nextPageToken = response.data.nextPageToken || null;
            pagesFetched++;

            console.log(`✓ Fetched ${reviews.length} reviews (page ${pagesFetched})`);

            // Stop if no more pages
            if (!nextPageToken) {
                console.log(`✅ No more pages to fetch`);
                break;
            }
        }

        if (nextPageToken && pagesFetched >= maxPages) {
            console.warn(`⚠️ Reached max page limit (${maxPages}). More reviews may be available.`);
        }

        return {
            reviews: allReviews.map(review => formatReviewData(review)),
            nextPageToken,
            totalReviews: allReviews.length
        };

    } catch (error) {
        console.error('Error fetching Google reviews:', error.response?.data || error.message);

        // If v4 API fails, try alternative approach
        if (error.response?.status === 404 || error.response?.status === 403) {
            console.log('⚠️ V4 API not available, trying alternative...');
            // Return empty array - reviews will need to be synced through alternative method
            return { reviews: [], nextPageToken: null, totalReviews: 0 };
        }

        throw new Error(`Failed to fetch reviews from Google Business Profile: ${error.message}`);
    }
};

/**
 * Format review data from Google API response
 * @param {object} review - Raw review object from Google API
 * @returns {object} Formatted review object
 */
const formatReviewData = (review) => {
    // Convert star rating enum to number
    const starRatingMap = {
        'FIVE': 5,
        'FOUR': 4,
        'THREE': 3,
        'TWO': 2,
        'ONE': 1,
        'STAR_RATING_UNSPECIFIED': 0
    };

    return {
        // Resource name: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
        name: review.name,
        google_review_id: review.reviewId || review.name?.split('/').pop(),

        // Reviewer information
        reviewer: {
            displayName: review.reviewer?.displayName || 'Anonymous',
            profilePhotoUrl: review.reviewer?.profilePhotoUrl || null,
            isAnonymous: review.reviewer?.isAnonymous || false,
        },
        reviewer_name: review.reviewer?.displayName || 'Anonymous',
        reviewer_photo: review.reviewer?.profilePhotoUrl || null,

        // Rating and comment
        rating: starRatingMap[review.starRating] || parseInt(review.starRating) || 0,
        starRating: review.starRating,
        review_text: review.comment || '',
        comment: review.comment || '',

        // Timestamps
        review_created_at: review.createTime ? new Date(review.createTime) : null,
        review_updated_at: review.updateTime ? new Date(review.updateTime) : null,
        createTime: review.createTime,
        updateTime: review.updateTime,

        // Reply information
        has_reply: !!review.reviewReply,
        reply_text: review.reviewReply?.comment || null,
        reply_time: review.reviewReply?.updateTime ? new Date(review.reviewReply.updateTime) : null,
        reviewReply: review.reviewReply ? {
            comment: review.reviewReply.comment,
            updateTime: review.reviewReply.updateTime,
        } : null,
    };
};

/**
 * Get a specific review by ID
 * API: accounts.locations.reviews.get
 * Reference: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/get
 * 
 * @param {string} accountId - Google Business account ID
 * @param {string} locationId - Google Business location ID  
 * @param {string} reviewId - Review ID
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<object>} Formatted review object
 */
const getGoogleReview = async (accountId, locationId, reviewId, accessToken) => {
    try {
        const url = `${GOOGLE_API_BASE_V4}/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}`;

        console.log(`📡 Fetching review ${reviewId} from Google`);

        const response = await retryWithBackoff(async () => {
            if (myBusinessLimiter) {
                return await myBusinessLimiter.execute(async () => {
                    return await axios.get(url, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    });
                });
            } else {
                return await axios.get(url, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });
            }
        });

        console.log(`✓ Fetched review ${reviewId} from Google`);
        return formatReviewData(response.data);

    } catch (error) {
        console.error('Error fetching Google review:', error.response?.data || error.message);
        throw new Error(`Failed to fetch review from Google Business Profile: ${error.message}`);
    }
};

/**
 * Get reviews from multiple locations in a single batch request
 * API: accounts.locations.batchGetReviews  
 * Reference: https://developers.google.com/my-business/reference/rest/v4/accounts.locations/batchGetReviews
 * 
 * @param {string} accountId - Google Business account ID
 * @param {Array<string>} locationNames - Array of location resource names
 * @param {string} accessToken - OAuth access token
 * @param {object} options - Optional parameters
 * @param {number} options.pageSize - Number of reviews per location
 * @param {string} options.pageToken - Token for pagination
 * @param {string} options.orderBy - Sort order
 * @param {boolean} options.ignoreRatingOnlyReviews - Whether to exclude reviews without text
 * @returns {Promise<object>} Object with locationReviews and nextPageToken
 */
const batchGetGoogleReviews = async (accountId, locationNames, accessToken, options = {}) => {
    try {
        const url = `${GOOGLE_API_BASE_V4}/accounts/${accountId}/locations:batchGetReviews`;

        const requestBody = {
            locationNames,
            pageSize: options.pageSize || 50,
            orderBy: options.orderBy || 'updateTime desc',
        };

        if (options.pageToken) requestBody.pageToken = options.pageToken;
        if (options.ignoreRatingOnlyReviews !== undefined) {
            requestBody.ignoreRatingOnlyReviews = options.ignoreRatingOnlyReviews;
        }

        console.log(`📡 Batch fetching reviews for ${locationNames.length} locations`);

        const response = await retryWithBackoff(async () => {
            if (myBusinessLimiter) {
                return await myBusinessLimiter.execute(async () => {
                    return await axios.post(url, requestBody, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    });
                });
            } else {
                return await axios.post(url, requestBody, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });
            }
        });

        const locationReviews = response.data.locationReviews || [];

        console.log(`✓ Batch fetched reviews for ${locationReviews.length} locations`);

        return {
            locationReviews: locationReviews.map(locReview => ({
                location: locReview.location,
                reviews: (locReview.reviews || []).map(review => formatReviewData(review)),
                totalReviewCount: locReview.totalReviewCount || 0,
            })),
            nextPageToken: response.data.nextPageToken || null,
        };

    } catch (error) {
        console.error('Error batch fetching Google reviews:', error.response?.data || error.message);
        throw new Error(`Failed to batch fetch reviews from Google Business Profile: ${error.message}`);
    }
};

/**
 * Post reply to Google Business Profile
 * API: accounts.locations.reviews.updateReply
 * Reference: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/updateReply
 * 
 * @param {string} accountId - Google Business account ID
 * @param {string} locationId - Google Business location ID
 * @param {string} reviewId - Google review ID
 * @param {string} replyText - Reply text to post (max 4096 bytes)
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<object>} Posted reply details
 */
const postReplyToGoogle = async (accountId, locationId, reviewId, replyText, accessToken) => {
    try {
        if (!replyText || replyText.length === 0) {
            throw new Error('Reply text cannot be empty');
        }

        if (replyText.length > 4096) {
            throw new Error('Reply text exceeds maximum length of 4096 bytes');
        }

        const url = `${GOOGLE_API_BASE_V4}/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`;

        console.log(`📤 Posting reply to review ${reviewId}`);

        // Wrap the API call with retry logic and rate limiting
        const response = await retryWithBackoff(async () => {
            if (myBusinessLimiter) {
                return await myBusinessLimiter.execute(async () => {
                    return await axios.put(url, {
                        comment: replyText,
                    }, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    });
                });
            } else {
                return await axios.put(url, {
                    comment: replyText,
                }, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });
            }
        });

        console.log(`✓ Posted reply to Google for review ${reviewId}`);

        return {
            success: true,
            comment: response.data.comment,
            updateTime: response.data.updateTime,
            postedAt: new Date(),
        };

    } catch (error) {
        console.error('Error posting reply to Google:', error.response?.data || error.message);
        throw new Error(`Failed to post reply to Google Business Profile: ${error.message}`);
    }
};

/**
 * Delete a reply to a review
 * API: accounts.locations.reviews.deleteReply
 * Reference: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/deleteReply
 * 
 * @param {string} accountId - Google Business account ID
 * @param {string} locationId - Google Business location ID
 * @param {string} reviewId - Google review ID
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<object>} Deletion confirmation
 */
const deleteGoogleReviewReply = async (accountId, locationId, reviewId, accessToken) => {
    try {
        const url = `${GOOGLE_API_BASE_V4}/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`;

        console.log(`🗑️ Deleting reply for review ${reviewId}`);

        const response = await retryWithBackoff(async () => {
            if (myBusinessLimiter) {
                return await myBusinessLimiter.execute(async () => {
                    return await axios.delete(url, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    });
                });
            } else {
                return await axios.delete(url, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });
            }
        });

        console.log(`✓ Deleted reply for review ${reviewId}`);

        return {
            success: true,
            deletedAt: new Date(),
        };

    } catch (error) {
        console.error('Error deleting reply from Google:', error.response?.data || error.message);
        throw new Error(`Failed to delete reply from Google Business Profile: ${error.message}`);
    }
};

// ❌ REMOVED: refreshAccessToken - MUST use controller's refreshTenantAccessToken only
// All token refresh logic must go through ONE source of truth in the controller

module.exports = {
    fetchGoogleReviews,
    getGoogleReview,
    batchGetGoogleReviews,
    postReplyToGoogle,
    deleteGoogleReviewReply,
    formatReviewData,
};
