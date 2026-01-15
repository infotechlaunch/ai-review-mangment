const axios = require('axios');

/**
 * Google Business Profile API Service
 * Handles fetching reviews and posting replies to Google
 */

const GOOGLE_API_BASE = 'https://mybusiness.googleapis.com/v4';

/**
 * Fetch reviews from Google Business Profile
 * @param {string} accountId - Google Business account ID
 * @param {string} locationId - Google Business location ID
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<Array>} Array of reviews
 */
const fetchGoogleReviews = async (accountId, locationId, accessToken) => {
    try {
        const url = `${GOOGLE_API_BASE}/accounts/${accountId}/locations/${locationId}/reviews`;

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const reviews = response.data.reviews || [];
        console.log(`✓ Fetched ${reviews.length} reviews from Google`);

        return reviews.map(review => ({
            google_review_id: review.reviewId,
            reviewer_name: review.reviewer?.displayName || 'Anonymous',
            rating: review.starRating === 'FIVE' ? 5 :
                review.starRating === 'FOUR' ? 4 :
                    review.starRating === 'THREE' ? 3 :
                        review.starRating === 'TWO' ? 2 : 1,
            review_text: review.comment || '',
            review_created_at: new Date(review.createTime),
            has_reply: !!review.reviewReply,
        }));

    } catch (error) {
        console.error('Error fetching Google reviews:', error.response?.data || error.message);
        throw new Error('Failed to fetch reviews from Google Business Profile');
    }
};

/**
 * Post reply to Google Business Profile
 * @param {string} accountId - Google Business account ID
 * @param {string} locationId - Google Business location ID
 * @param {string} reviewId - Google review ID
 * @param {string} replyText - Reply text to post
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<object>} Posted reply details
 */
const postReplyToGoogle = async (accountId, locationId, reviewId, replyText, accessToken) => {
    try {
        const url = `${GOOGLE_API_BASE}/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`;

        const response = await axios.put(url, {
            comment: replyText,
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        console.log(`✓ Posted reply to Google for review ${reviewId}`);

        return {
            success: true,
            replyId: response.data.name,
            postedAt: new Date(),
        };

    } catch (error) {
        console.error('Error posting reply to Google:', error.response?.data || error.message);
        throw new Error('Failed to post reply to Google Business Profile');
    }
};

/**
 * Refresh OAuth access token
 * @param {string} refreshToken - OAuth refresh token
 * @returns {Promise<object>} New access token and expiry
 */
const refreshAccessToken = async (refreshToken) => {
    try {
        const response = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        });

        return {
            accessToken: response.data.access_token,
            expiresIn: response.data.expires_in,
            tokenExpiry: new Date(Date.now() + response.data.expires_in * 1000),
        };

    } catch (error) {
        console.error('Error refreshing access token:', error.response?.data || error.message);
        throw new Error('Failed to refresh Google OAuth token');
    }
};

module.exports = {
    fetchGoogleReviews,
    postReplyToGoogle,
    refreshAccessToken,
};
