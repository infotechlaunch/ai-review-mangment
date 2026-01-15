const { readSheetAsJSON, REVIEW_TRACKER_SHEET_ID } = require('../config/googleSheets');

/**
 * Review Model (Google Sheets Version)
 * Handles review operations using Google Sheets as database
 */

/**
 * Map Google Sheets columns to backend field names
 * @param {object} sheetRow - Raw row from Google Sheets
 * @returns {object} Normalized review object
 */
const normalizeReviewFields = (sheetRow) => {
    return {
        review_key: sheetRow.ReviewKey || sheetRow.review_key,
        google_review_id: sheetRow['Review ID'] || sheetRow.google_review_id,
        reviewer_name: sheetRow['Reviewer Name'] || sheetRow.reviewer_name,
        rating: parseInt(sheetRow['Star Rating'] || sheetRow.rating || 0),
        review_text: sheetRow.Review || sheetRow.review_text || '',
        ai_generated_reply: sheetRow['Auto Reply'] || sheetRow.ai_generated_reply,
        edited_reply: sheetRow['Edited Reply'] || sheetRow.edited_reply,
        approval_status: sheetRow['Approval Status'] || sheetRow.approval_status || 'pending',
        final_caption: sheetRow['Final Caption'] || sheetRow.final_caption,
        sentiment: sheetRow.SentimentResult || sheetRow.sentiment || 'Neutral',
        approved_by: sheetRow['Editor User'] || sheetRow.approved_by,
        approved_at: sheetRow['Edit TS'] || sheetRow.approved_at,
        // Keep original sheet columns for backward compatibility
        ...sheetRow,
    };
};

/**
 * Get reviews by sheet tab (client-specific)
 * @param {string} sheetTab - Sheet tab name (e.g., "Client1_Reviews")
 * @param {string} gid - Sheet GID (optional, if not provided will try to use sheetTab as gid)
 * @returns {Promise<Array>} Array of review objects
 */
const getReviewsByTab = async (sheetTab, gid = null) => {
    try {
        // If gid is not provided, try using sheetTab as the gid (client.gid)
        const tabId = gid || sheetTab || '0';

        const reviews = await readSheetAsJSON(REVIEW_TRACKER_SHEET_ID, sheetTab, tabId);

        // Normalize field names
        const normalizedReviews = reviews.map(normalizeReviewFields);

        console.log(`✓ Fetched ${normalizedReviews.length} reviews from ${sheetTab} (GID: ${tabId})`);
        return normalizedReviews;
    } catch (error) {
        console.error(`Error fetching reviews from ${sheetTab}:`, error.message);
        throw error;
    }
};

/**
 * Get all reviews from all client tabs
 * @param {Array} clients - Array of client objects with sheetTab property
 * @returns {Promise<Array>} Array of all reviews with client info
 */
const getAllReviews = async (clients) => {
    try {
        const allReviews = [];

        for (const client of clients) {
            if (!client.sheetTab) continue;

            try {
                // Use client.gid if available, otherwise use sheetTab
                const gid = client.gid || client.sheetTab;
                const reviews = await getReviewsByTab(client.sheetTab, gid);

                // Add client info to each review
                const reviewsWithClient = reviews.map(review => ({
                    ...review,
                    businessName: client.businessName,
                    slug: client.slug,
                    clientSheetTab: client.sheetTab,
                }));

                allReviews.push(...reviewsWithClient);
            } catch (error) {
                console.error(`Error fetching reviews for ${client.slug}:`, error.message);
                // Continue with other clients even if one fails
            }
        }

        console.log(`✓ Fetched total ${allReviews.length} reviews from all clients`);
        return allReviews;
    } catch (error) {
        console.error('Error fetching all reviews:', error.message);
        throw error;
    }
};

/**
 * Get a single review by ReviewKey from a specific sheet tab
 * @param {string} sheetTab - Sheet tab name
 * @param {string} reviewKey - Review key to find
 * @returns {Promise<object|null>} Review object or null
 */
const getReviewByKey = async (sheetTab, reviewKey) => {
    try {
        const reviews = await getReviewsByTab(sheetTab);
        const review = reviews.find(r => r.review_key === reviewKey || r.ReviewKey === reviewKey);

        if (!review) {
            console.log(`Review with key "${reviewKey}" not found in ${sheetTab}`);
        }

        return review || null;
    } catch (error) {
        console.error(`Error fetching review by key ${reviewKey}:`, error.message);
        throw error;
    }
};

/**
 * Filter reviews by criteria
 * @param {Array} reviews - Array of reviews
 * @param {object} filters - Filter criteria
 * @returns {Array} Filtered reviews
 */
const filterReviews = (reviews, filters = {}) => {
    let filtered = [...reviews];

    // Filter by replied status
    if (filters.replied !== undefined) {
        const hasReply = filters.replied === 'true' || filters.replied === true;
        filtered = filtered.filter(review => {
            const replied = review.ai_generated_reply || review.edited_reply || review.final_caption;
            return hasReply ? !!replied : !replied;
        });
    }

    // Filter by rating
    if (filters.rating) {
        const targetRating = parseInt(filters.rating);
        filtered = filtered.filter(review => {
            const rating = parseInt(review.rating || 0);
            return rating === targetRating;
        });
    }

    // Filter by approval status
    if (filters.approvalStatus) {
        filtered = filtered.filter(review => {
            const status = review.approval_status || 'pending';
            return status.toLowerCase() === filters.approvalStatus.toLowerCase();
        });
    }

    // Filter by sentiment
    if (filters.sentiment) {
        filtered = filtered.filter(review => {
            const sentiment = review.sentiment || 'Neutral';
            return sentiment.toLowerCase() === filters.sentiment.toLowerCase();
        });
    }

    return filtered;
};

/**
 * Paginate reviews
 * @param {Array} reviews - Array of reviews
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {object} Paginated result
 */
const paginateReviews = (reviews, page = 1, limit = 20) => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
        reviews: reviews.slice(startIndex, endIndex),
        pagination: {
            total: reviews.length,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(reviews.length / limit),
        }
    };
};

module.exports = {
    getReviewsByTab,
    getAllReviews,
    getReviewByKey,
    filterReviews,
    paginateReviews,
};
