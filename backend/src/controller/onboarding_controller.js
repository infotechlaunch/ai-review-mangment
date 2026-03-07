const { appendToGoogleSheet } = require('../services/googleSheetsWrite');
const { appendClientConfigRow } = require('../services/googleSheetsWrite');
const { fetchReviewsFromSearchApi } = require('../services/googleBusinessService');
const { generateReply } = require('../config/openai');
const axios = require('axios');

const Location = require('../models/Location');
const Tenant = require('../models/Tenant');
const Review = require('../models/Review');

/**
 * Handle Onboarding Form Data submission
 * @route POST /api/onboarding/submit
 */
const submitOnboardingForm = async (req, res) => {
    try {
        const { businessName, ownerName, email, phone, address, planSelected } = req.body;

        // Basic validation
        if (!businessName || !ownerName || !email) {
            return res.status(400).json({
                success: false,
                message: 'Business Name, Owner Name, and Email are required.'
            });
        }

        // Map data appropriately to pass to Google Sheets service
        const formData = {
            businessName,
            ownerName,
            email,
            phone,
            address,
            planSelected
        };

        // Write directly to Google Sheets
        const sheetResult = await appendToGoogleSheet(formData);

        if (!sheetResult || !sheetResult.success) {
            // Depending on architecture, you may choose to throw error or continue
            console.warn("Could not save to Google Sheets:", sheetResult?.message);
        }

        return res.status(201).json({
            success: true,
            message: 'Onboarding form data submitted successfully to Google Sheets.',
        });

    } catch (error) {
        console.error('Error submitting onboarding form:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit onboarding form',
            error: error.message
        });
    }
};

/**
 * Update Google Place ID for development mode (Option B)
 * @route POST /api/onboarding/update-place-id
 * @access PRIVATE
 */
const updatePlaceId = async (req, res) => {
    try {
        const { googlePlaceId } = req.body;
        console.log("updatePlaceId called. googlePlaceId:", googlePlaceId);
        console.log("req.user is:", req.user);
        
        const tenantId = req.user.tenantId || req.user.tenant;

        if (!googlePlaceId) {
            return res.status(400).json({
                success: false,
                message: 'googlePlaceId is required'
            });
        }

        if (!tenantId) {
             return res.status(400).json({
                success: false,
                message: 'Tenant ID is missing from user session'
            });
        }

        // Get tenant by id
        const tenant = await Tenant.findByPk(tenantId);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        // Find existing location (create if doesn't exist)
        let location = await Location.findOne({ where: { tenantId: tenant.id } });

        if (location) {
            location.googlePlaceId = googlePlaceId;
            await location.save();
        } else {
            location = await Location.create({
                tenantId: tenant.id,
                name: tenant.businessName || 'Main Location',
                slug: tenant.slug || 'main',
                googlePlaceId: googlePlaceId,
                isActive: true
            });
        }

        return res.json({
            success: true,
            message: 'Place ID updated successfully',
            location: location
        });

    } catch (error) {
        console.error('Error updating Place ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update Place ID',
            error: error.message,
            stack: error.stack
        });
    }
}

/**
 * Search for a business using Nominatim (OSM) with optional SearchApi fallback.
 * Saves all technical fields, creates/updates Location record, auto-fetches reviews,
 * and syncs Google Sheets.
 * @route POST /api/onboarding/search-place
 * @access PRIVATE (authenticated)
 */
const searchAndSavePlaceId = async (req, res) => {
    try {
        const { googleSearchName } = req.body;
        const tenantId = req.user.tenantId || req.user.tenant;

        if (!googleSearchName) {
            return res.status(400).json({ success: false, message: 'googleSearchName is required' });
        }
        if (!tenantId) {
            return res.status(400).json({ success: false, message: 'Tenant ID is missing from session' });
        }

        console.log(`🔍 Searching for business: "${googleSearchName}"`);

        let placeId = '', gid = '', rating = null, reviewsCountMeta = 0;
        let businessTitle = '', address = '', type = '', googleReviewLink = '';
        let searchSource = 'nominatim';

        // ── 1a. Try SearchApi (Google Maps) if key exists ──────────────────────
        const searchApiKey = process.env.SEARCHAPI_KEY || process.env.SEARCH_API_KEY || process.env.SEARCHAPI_API_KEY;
        if (searchApiKey) {
            try {
                const saResp = await axios.get('https://www.searchapi.io/api/v1/search', {
                    params: { engine: 'google_maps', q: googleSearchName, type: 'search' },
                    headers: { 'Authorization': `Bearer ${searchApiKey}` },
                    timeout: 10000
                });
                const localResults = saResp.data.local_results || [];
                if (localResults.length > 0) {
                    const top = localResults[0];
                    placeId        = top.place_id || '';
                    gid            = top.data_id  || '';
                    rating         = top.rating   || null;
                    reviewsCountMeta = top.reviews || top.reviews_count || 0;
                    businessTitle  = top.title    || '';
                    address        = top.address  || '';
                    type           = top.type     || '';
                    searchSource   = 'searchapi';
                    if (placeId) {
                        googleReviewLink = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
                    }
                }
            } catch (saErr) {
                const statusCode = saErr.response?.status;
                const errMsg = saErr.response?.data?.error || saErr.message;
                console.warn(`⚠️ SearchApi failed (${statusCode}): ${errMsg} — falling back to Nominatim`);
            }
        }

        // ── 1b. Fallback to Nominatim (OpenStreetMap) ─────────────────────────
        if (!businessTitle) {
            try {
                const nomResp = await axios.get('https://nominatim.openstreetmap.org/search', {
                    params: { q: googleSearchName, format: 'json', limit: 1, addressdetails: 1, extratags: 1 },
                    headers: { 'User-Agent': 'AI-Review-Mgnt/1.0 (review management)' },
                    timeout: 8000
                });
                const nomResults = nomResp.data || [];
                if (nomResults.length > 0) {
                    const top = nomResults[0];
                    placeId       = `osm_${top.osm_id}`;
                    gid           = String(top.osm_id);
                    rating        = null;
                    reviewsCountMeta = 0;
                    businessTitle = top.name || (top.display_name || '').split(',')[0].trim();
                    address       = top.display_name || '';
                    type          = top.type || top.class || '';
                    searchSource  = 'nominatim';
                    googleReviewLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleSearchName)}`;
                }
            } catch (nomErr) {
                console.warn('⚠️ Nominatim search failed:', nomErr.message);
            }
        }

        if (!businessTitle) {
            return res.status(404).json({
                success: false,
                message: `No results found for "${googleSearchName}". Try a more specific name with city, e.g. "Joy's Biryani Raigarh".`
            });
        }

        console.log(`✅ Found via ${searchSource}: "${businessTitle}"`);


        // ── 2. Derive technical fields ─────────────────────────────────────────
        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

        const ReviewKey = `RVWK_${tenant.slug}_${placeId.substring(0, 8)}`;

        // ScreenshotOneHTML: use ScreenshotOne API if key available, else a plain URL string
        const screenshotApiKey = process.env.SCREENSHOTONE_API_KEY || '';
        const ScreenshotOneHTML = screenshotApiKey
            ? `https://api.screenshotone.com/take?access_key=${screenshotApiKey}&url=${encodeURIComponent(googleReviewLink)}&full_page=false&viewport_width=400&viewport_height=300&format=jpg`
            : googleReviewLink;

        // account_resource and locationId: not available without GMB OAuth flow
        // Keep existing ones if already set, otherwise leave empty
        const existingSP = tenant.social_profiles || {};
        const account_resource = existingSP.account_resource || '';

        // ── 3. Create / update Location record ───────────────────────────────
        let location = await Location.findOne({ where: { tenantId: tenant.id } });
        if (location) {
            location.googlePlaceId = placeId;
            location.name = businessTitle || tenant.businessName || 'Main Location';
            location.address = address || location.address;
            await location.save();
        } else {
            const locSlug = (tenant.slug || 'main').toLowerCase().replace(/[^a-z0-9-]/g, '-');
            location = await Location.create({
                tenantId: tenant.id,
                name: businessTitle || tenant.businessName || 'Main Location',
                slug: locSlug,
                address: address || '',
                googlePlaceId: placeId,
                isActive: true
            });
        }

        const locationDbId = location.id; // UUID of Location record

        // ── 4. Save ALL fields to Tenant.social_profiles ──────────────────────
        tenant.googleSearchName = googleSearchName;
        tenant.social_profiles = {
            ...existingSP,
            placeId,
            googleReviewLink,
            gid,
            rating,
            reviewsCount: reviewsCountMeta,
            account_resource,
            locationId: locationDbId,
            ReviewKey,
            ScreenshotOneHTML,
            businessTitle,
            type
        };
        tenant.changed('social_profiles', true);
        await tenant.save();

        console.log(`✅ placeId + technical fields saved for tenant ${tenantId}: ${placeId}`);

        // ── 5. Auto-fetch reviews from SearchApi and store in DB ──────────────
        let newReviewsCount  = 0;
        let fetchErrorMsg    = null;

        try {
            console.log(`📡 Auto-fetching reviews via SearchApi for place: ${placeId}`);
            const reviewResult = await fetchReviewsFromSearchApi(
                placeId, searchApiKey,
                { engine: 'google_maps_reviews', maxPages: 1 }
            );
            const fetchedReviews = reviewResult.reviews || [];
            console.log(`📦 Fetched ${fetchedReviews.length} reviews from SearchApi`);

            for (const gr of fetchedReviews) {
                try {
                    const exists = await Review.findOne({ where: { google_review_id: gr.google_review_id } });
                    if (exists) continue;

                    const reviewData = {
                        tenantId: tenant.id,
                        locationId: location.id,
                        google_review_id: gr.google_review_id,
                        reviewer_name: gr.reviewer_name || 'Anonymous',
                        rating: gr.rating || 5,
                        review_text: gr.review_text || '',
                        review_created_at: gr.review_created_at || new Date(),
                        has_reply: false,
                        source: 'SEARCHAPI',
                        review_key: `${ReviewKey}_${gr.google_review_id}`.substring(0, 255)
                    };

                    // Generate AI reply automatically
                    try {
                        const tenantSettings = tenant.settings || {};
                        const aiReply = await generateReply(
                            reviewData.review_text,
                            reviewData.rating,
                            tenant.businessName,
                            tenantSettings.tone || {}
                        );
                        reviewData.ai_generated_reply = aiReply;
                        reviewData.ai_reply_generated_at = new Date();
                        reviewData.edited_reply = aiReply;
                        reviewData.final_caption = aiReply;
                        reviewData.sentiment =
                            reviewData.rating >= 4 ? 'Positive' :
                            reviewData.rating <= 2 ? 'Negative' : 'Neutral';
                    } catch (aiErr) {
                        console.warn('⚠️ AI reply generation skipped:', aiErr.message);
                    }

                    await Review.create(reviewData);
                    newReviewsCount++;
                } catch (innerErr) {
                    console.error('⚠️ Error saving review:', innerErr.message);
                }
            }
            console.log(`✅ ${newReviewsCount} new reviews saved to DB`);
        } catch (fetchErr) {
            fetchErrorMsg = fetchErr.message;
            console.warn('⚠️ Auto-fetch reviews failed (non-blocking):', fetchErrorMsg);
        }

        // ── 6. Sync everything to Google Sheets ───────────────────────────────
        try {
            await appendClientConfigRow({
                slug:             tenant.slug,
                businessName:     tenant.businessName,
                businessType:     tenant.industry,
                reviewURL:        googleReviewLink,
                fbPage:           existingSP.facebookPage || '',
                igHandle:         existingSP.instagramHandle || '',
                whatsAppLink:     tenant.communication_settings?.whatsappLink || '',
                gmbConnName:      existingSP.gmbConnName || '',
                fbConnName:       existingSP.fbConnName  || '',
                igConnName:       existingSP.igConnName  || '',
                placeId,
                account_resource,
                locationId:       locationDbId,
                ReviewKey,
                gid,
                ScreenshotOneHTML,
                packageTier:      'Basic',
                waitForApproval:  true,
                socialPostSetup:  false
            });
            console.log('✅ Google Sheets updated with all technical fields');
        } catch (sheetErr) {
            console.warn('⚠️ Google Sheets update failed (non-blocking):', sheetErr.message);
        }

        return res.json({
            success: true,
            message: `Google Business connected: "${businessTitle}"`,
            data: {
                placeId,
                googleReviewLink,
                gid,
                rating,
                reviewsCount: reviewsCountMeta,
                ReviewKey,
                ScreenshotOneHTML,
                account_resource,
                locationId: locationDbId,
                businessTitle,
                address,
                reviewsFetched: newReviewsCount,
                fetchError: fetchErrorMsg
            }
        });

    } catch (error) {
        const statusCode = error.response?.status;
        const apiError = error.response?.data?.error || error.message;
        console.error('Error in searchAndSavePlaceId:', apiError);

        if (statusCode === 429) {
            return res.status(503).json({
                success: false,
                message: 'Search service is temporarily unavailable (quota exceeded). Please enter your business details manually.',
                error: apiError
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to search for your business. Please try again or enter details manually.',
            error: error.message
        });
    }
};

/**
 * Return live business search suggestions for the dropdown.
 * Uses Nominatim (OSM) with SearchApi as optional upgrade when quota available.
 * @route GET /api/onboarding/search-suggestions?q=Joy+Biryani+Raigarh
 * @access PRIVATE (authenticated)
 */
const searchPlaceSuggestions = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();

        if (!q || q.length < 2) {
            return res.json({ success: true, results: [] });
        }

        let results = [];

        // ── Try SearchApi first if key exists ──────────────────────────────────
        const searchApiKey = process.env.SEARCHAPI_KEY || process.env.SEARCH_API_KEY || process.env.SEARCHAPI_API_KEY;
        if (searchApiKey) {
            try {
                const saResp = await axios.get('https://www.searchapi.io/api/v1/search', {
                    params: { engine: 'google_maps', q, type: 'search' },
                    headers: { 'Authorization': `Bearer ${searchApiKey}` },
                    timeout: 8000
                });
                const localResults = saResp.data.local_results || [];
                if (localResults.length > 0) {
                    results = localResults.slice(0, 6).map(r => ({
                        title: r.title || '',
                        address: r.address || '',
                        placeId: r.place_id || '',
                        gid: r.data_id || '',
                        rating: r.rating || null,
                        reviewsCount: r.reviews || r.reviews_count || 0,
                        type: r.type || '',
                        thumbnail: r.thumbnail || null
                    }));
                    return res.json({ success: true, results });
                }
            } catch (saErr) {
                const statusCode = saErr.response?.status;
                const errMsg = saErr.response?.data?.error || saErr.message;
                console.warn(`⚠️ SearchApi suggestions failed (${statusCode}): ${errMsg} — falling back to Nominatim`);
            }
        }

        // ── Fallback: Nominatim (OpenStreetMap) ────────────────────────────────
        const nomResp = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: { q, format: 'json', limit: 6, addressdetails: 1, extratags: 1 },
            headers: { 'User-Agent': 'AI-Review-Mgnt/1.0 (review management)' },
            timeout: 8000
        });

        results = (nomResp.data || []).map(r => ({
            title: r.name || (r.display_name || '').split(',')[0].trim(),
            address: r.display_name || '',
            placeId: `osm_${r.osm_id}`,
            gid: String(r.osm_id),
            rating: null,
            reviewsCount: 0,
            type: r.type || r.class || '',
            thumbnail: null
        }));

        return res.json({ success: true, results });

    } catch (error) {
        console.error('searchPlaceSuggestions error:', error.message);
        res.status(500).json({ success: false, message: 'Search failed', results: [] });
    }
};

module.exports = {
    submitOnboardingForm,
    updatePlaceId,
    searchAndSavePlaceId,
    searchPlaceSuggestions
};
