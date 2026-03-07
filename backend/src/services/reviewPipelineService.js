/**
 * Review Pipeline Service
 * Orchestrates: AI analysis → auto-approval decision → Google post (or mark pending)
 *
 * Called by:
 *  1. fetchReviews controller  — after saving a new review
 *  2. Cron job                 — every 15 min for unprocessed reviews
 *  3. Manual trigger endpoint  — POST /api/reviews/pipeline/run
 */
const Review = require('../models/Review');
const Location = require('../models/Location');
const Tenant = require('../models/Tenant');
const { analyzeAndGenerateReply } = require('../config/openai');
const { postReplyToGoogle } = require('./googleBusinessService');

/**
 * Get a valid (non-expired) access token for a tenant, refreshing if needed.
 */
const getValidAccessToken = async (tenant) => {
    const expiry = tenant.gbp_tokenExpiry ? new Date(tenant.gbp_tokenExpiry) : null;
    const bufferMs = 5 * 60 * 1000;
    if (!expiry || Date.now() >= expiry.getTime() - bufferMs) {
        console.log(`🔄 Access token expired for tenant ${tenant.slug || tenant.id}, refreshing…`);
        const { refreshTenantAccessToken } = require('../controller/google_oauth_controller');
        return await refreshTenantAccessToken(tenant.id);
    }
    return tenant.gbp_accessToken;
};

// ─────────────────────────────────────────────────────────────────────────────
// Auto-approval decision
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Decide whether to auto-approve a review based on tenant settings.
 * Negative reviews (≤2★) are NEVER auto-approved.
 *
 * Expected tenant.settings.autoApproval shape:
 * {
 *   enabled: true,
 *   autoApproveMinRating: 4,      // min star rating for auto-approve
 *   autoApprovePositive: true,    // auto-approve Positive sentiment
 *   autoApproveNeutral: false,    // auto-approve Neutral/3-star
 *   autoApproveIfNoText: true,    // auto-approve reviews with no text
 * }
 */
const shouldAutoApprove = (review, tenantSettings = {}) => {
    const cfg = tenantSettings.autoApproval || {};
    if (!cfg.enabled) return false;

    const rating = review.rating;
    const hasText = !!(review.review_text || '').trim();
    const sentiment = (review.sentimentResult || review.sentiment || '').toLowerCase();

    // Never auto-approve negative reviews
    if (rating <= 2) return false;

    // No-text reviews bypass rating check when configured
    if (!hasText && cfg.autoApproveIfNoText) return true;

    // Rating must meet minimum threshold
    const minRating = cfg.autoApproveMinRating || 4;
    if (rating < minRating) return false;

    // 5-star / positive
    if (rating >= 4 && cfg.autoApprovePositive !== false) return true;

    // 3-star / neutral
    if (rating === 3 && cfg.autoApproveNeutral) return true;

    return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// Core pipeline — run on a single review
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Run the full pipeline for a review that already exists in the DB.
 * Safe to call multiple times — skips reviews already posted to Google.
 *
 * @param {string} reviewId  DB UUID
 * @param {string|null} systemUserId  optional userId to credit auto-approvals to
 * @returns {{ skipped, approved, posted, reply }}
 */
const runPipelineForReview = async (reviewId, systemUserId = null) => {
    const review = await Review.findByPk(reviewId, {
        include: [
            { model: Tenant, as: 'tenant' },
            { model: Location, as: 'location' },
        ],
    });

    if (!review) throw new Error(`Review ${reviewId} not found`);

    // Skip if already fully processed
    if (review.posted_to_google) {
        return { skipped: true, reason: 'already posted to Google' };
    }

    const tenant = review.tenant;
    const location = review.location;
    const tenantSettings = tenant.settings || {};
    const toneSettings = tenantSettings.tone || {};

    // ── STEP 1: Analyse + generate reply in one AI call ──────────────────────
    let analysis;
    try {
        analysis = await analyzeAndGenerateReply(
            review.review_text,
            review.rating,
            review.reviewer_name,
            tenant.businessName,
            toneSettings
        );
    } catch (err) {
        console.error(`Pipeline AI error for review ${reviewId}:`, err.message);
        // Save whatever we got so far (mark as pending for manual review)
        review.approval_status = 'pending';
        await review.save();
        return { skipped: false, approved: false, posted: false, error: err.message };
    }

    // ── STEP 2: Persist AI results ────────────────────────────────────────────
    review.ai_generated_reply = analysis.reply;
    review.ai_reply_generated_at = new Date();
    review.edited_reply = analysis.reply;
    review.final_caption = analysis.reply;
    review.sentiment = analysis.sentimentResult;          // enum field
    review.sentiment_score = analysis.sentimentScore;
    review.emotion_primary = analysis.emotionPrimary;
    review.topic_primary = analysis.topicPrimary;

    // Attach AI analysis to object for decision making
    review.sentimentResult = analysis.sentimentResult;

    // ── STEP 3: Auto-approval decision ────────────────────────────────────────
    const autoApprove = shouldAutoApprove(review, tenantSettings);

    if (autoApprove && (tenant.gbp_accessToken || tenant.gbp_refreshToken)) {
        // ── PATH A: Auto-approve → post to Google ─────────────────────────────
        try {
            const accessToken = await getValidAccessToken(tenant);
            const postResult = await postReplyToGoogle(
                tenant.gbp_accountId,
                location.googleLocationId,
                review.google_review_id,
                analysis.reply,
                accessToken
            );

            review.approval_status = 'posted';
            review.posted_to_google = true;
            review.posted_at = postResult.postedAt || new Date();
            review.has_reply = true;
            review.is_auto_approved = true;
            if (systemUserId) review.approved_by = systemUserId;

            await review.save();

            console.log(`✅ [Pipeline] Auto-approved & posted reply for review ${reviewId} (${review.rating}★)`);
            return { skipped: false, approved: true, posted: true, reply: analysis.reply };

        } catch (postErr) {
            console.error(`[Pipeline] Failed to post to Google for review ${reviewId}:`, postErr.message);
            // Fall through to Path B — save as pending
        }
    }

    // ── PATH B: Pending — awaiting manual approval ────────────────────────────
    review.approval_status = 'pending';
    review.is_auto_approved = false;
    await review.save();

    console.log(`📋 [Pipeline] Review ${reviewId} saved as pending (${review.rating}★ | ${analysis.sentimentResult})`);
    return { skipped: false, approved: false, posted: false, reply: analysis.reply };
};

// ─────────────────────────────────────────────────────────────────────────────
// Batch: process all unprocessed reviews for a tenant (or globally for admins)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Find all reviews that have no AI reply yet and run the pipeline.
 *
 * @param {string|null} tenantId  restrict to one tenant; null = all tenants (admin/cron)
 * @returns {{ processed, failed, skipped }}
 */
const processPendingReviews = async (tenantId = null) => {
    const where = {
        ai_generated_reply: null,
        posted_to_google: false,
    };
    if (tenantId) where.tenantId = tenantId;

    const unprocessed = await Review.findAll({ where, limit: 50 }); // cap per run
    let processed = 0, failed = 0, skipped = 0;

    for (const review of unprocessed) {
        try {
            const result = await runPipelineForReview(review.id);
            if (result.skipped) skipped++;
            else processed++;
        } catch (err) {
            console.error(`[Pipeline batch] Error on review ${review.id}:`, err.message);
            failed++;
        }
    }

    console.log(`[Pipeline batch] Done — processed: ${processed}, skipped: ${skipped}, failed: ${failed}`);
    return { processed, skipped, failed };
};

// ─────────────────────────────────────────────────────────────────────────────
// Cron worker: poll Google for new reviews + run pipeline
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Called by the cron job every 15 minutes.
 * Fetches new reviews from Google for all active tenants,
 * saves them, and runs the AI pipeline on each new one.
 */
const cronPollAndProcess = async () => {
    console.log('⏱  [Cron] Starting review poll cycle…');
    const { fetchGoogleReviews } = require('./googleBusinessService');

    try {
        // Find all tenants that have an active GBP connection
        const tenants = await Tenant.findAll({
            where: { isActive: true, gbp_initialSyncDone: true },
            include: [{ model: Location, as: 'locations', where: { isActive: true }, required: false }],
        });

        let totalNew = 0;

        for (const tenant of tenants) {
            if (!tenant.gbp_accessToken) continue;
            const locations = tenant.locations || [];

            for (const location of locations) {
                try {
                    const googleResult = await fetchGoogleReviews(
                        tenant.gbp_accountId,
                        location.googleLocationId,
                        tenant.gbp_accessToken,
                        { maxPages: 1 }
                    );

                    const googleReviews = googleResult.reviews || [];

                    for (const gr of googleReviews) {
                        // Check if already in DB
                        const existing = await Review.findOne({
                            where: { google_review_id: gr.google_review_id },
                        });

                        if (existing) {
                            // Update reply status if Google now has a reply we didn't post
                            if (gr.has_reply && !existing.has_reply) {
                                existing.has_reply = true;
                                await existing.save();
                            }
                            continue;
                        }

                        // New review — save it
                        const newReview = await Review.create({
                            tenantId: tenant.id,
                            locationId: location.id,
                            ...gr,
                        });

                        totalNew++;

                        // Run pipeline (non-blocking per review — catch errors)
                        runPipelineForReview(newReview.id).catch(err =>
                            console.error(`[Cron pipeline] Review ${newReview.id}:`, err.message)
                        );
                    }
                } catch (locErr) {
                    console.error(`[Cron] Error for location ${location.id} (${tenant.slug}):`, locErr.message);
                }
            }

            // Update last sync timestamp
            tenant.gbp_lastSyncAt = new Date();
            await tenant.save();
        }

        console.log(`✅ [Cron] Poll complete — ${totalNew} new review(s) queued for processing`);
    } catch (err) {
        console.error('[Cron] Poll cycle error:', err.message);
    }
};

module.exports = {
    shouldAutoApprove,
    runPipelineForReview,
    processPendingReviews,
    cronPollAndProcess,
};
