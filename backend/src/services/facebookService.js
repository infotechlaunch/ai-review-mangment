/**
 * Facebook & Instagram Graph API Service
 *
 * Requires in Tenant.settings.social:
 *   fb_page_access_token  – Page-level access token
 *   fb_page_id            – Facebook Page ID
 *   ig_user_id            – Instagram Business Account ID (linked to the Page)
 *
 * Set these via the onboarding / settings API, or directly in the DB.
 */

const https = require('https');

const GRAPH_API = 'https://graph.facebook.com/v19.0';

/**
 * Low-level helper: POST to Facebook Graph API
 */
const graphPost = (endpoint, params) => {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(params);
        const url = new URL(`${GRAPH_API}${endpoint}`);

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        reject(new Error(`Graph API error: ${parsed.error.message}`));
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    reject(new Error('Invalid JSON from Graph API'));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
};

/**
 * Post a text update to a Facebook Page
 * Returns { postUrl, postId }
 */
const postToFacebook = async ({ pageId, pageAccessToken, message }) => {
    if (!pageId || !pageAccessToken) {
        throw new Error('Facebook Page ID and access token are required.');
    }

    const result = await graphPost(`/${pageId}/feed`, {
        message,
        access_token: pageAccessToken,
    });

    const postId = result.id; // format: "pageId_postId"
    const postUrl = `https://www.facebook.com/${postId.replace('_', '/posts/')}`;

    console.log(`✓ Posted to Facebook Page ${pageId}: ${postUrl}`);
    return { postUrl, postId };
};

/**
 * Post a text-only (caption) post to an Instagram Business Account
 * Uses the two-step media-container → publish flow.
 * Note: Instagram requires a media_type; for text-only we use REELS or a workaround.
 * Most businesses post with an image. Here we post as a text "caption-only" reel
 * by omitting image_url and setting media_type=REELS only if video_url is provided.
 * For a simple text share, we fall back to a plain Facebook feed post only.
 * Returns { postUrl, postId } or null if ig_user_id is not configured.
 */
const postToInstagram = async ({ igUserId, pageAccessToken, caption }) => {
    if (!igUserId || !pageAccessToken) {
        console.warn('⚠️  Instagram Business Account ID or token missing – skipping Instagram post.');
        return null;
    }

    // Step 1: Create media container (text-only caption via image_url workaround is not supported).
    // Instagram Graph API requires an image/video for feed posts.
    // We create a "quote" image using a public placeholder + caption.
    // For production, replace placeholder_image_url with a dynamically generated image.
    const placeholderImageUrl = process.env.IG_DEFAULT_IMAGE_URL || null;

    if (!placeholderImageUrl) {
        console.warn('⚠️  IG_DEFAULT_IMAGE_URL not set – skipping Instagram post. Set it in .env to enable.');
        return null;
    }

    // Step 1: Create container
    const container = await graphPost(`/${igUserId}/media`, {
        image_url: placeholderImageUrl,
        caption,
        access_token: pageAccessToken,
    });

    // Step 2: Publish
    const published = await graphPost(`/${igUserId}/media_publish`, {
        creation_id: container.id,
        access_token: pageAccessToken,
    });

    const postId = published.id;
    const postUrl = `https://www.instagram.com/p/${postId}/`;
    console.log(`✓ Posted to Instagram account ${igUserId}: ${postUrl}`);
    return { postUrl, postId };
};

/**
 * Master function: post a 5-star review to social media
 * @param {object} options
 * @param {object} options.tenant - Tenant DB record (with settings JSONB)
 * @param {string} options.caption - The social caption to post
 * @returns {{ facebookPostUrl, instagramPostUrl }}
 */
const postReviewToSocialMedia = async ({ tenant, caption }) => {
    const socialSettings = tenant.settings?.social || {};
    const fbPageId = socialSettings.fb_page_id || tenant.social_profiles?.facebookPageId;
    const fbToken = socialSettings.fb_page_access_token;
    const igUserId = socialSettings.ig_user_id;

    const result = {
        facebookPostUrl: null,
        instagramPostUrl: null,
    };

    // Facebook
    if (fbPageId && fbToken) {
        try {
            const fb = await postToFacebook({ pageId: fbPageId, pageAccessToken: fbToken, message: caption });
            result.facebookPostUrl = fb.postUrl;
        } catch (err) {
            console.error('❌ Facebook post failed:', err.message);
        }
    } else {
        console.warn('⚠️  Facebook Page ID or token not configured – skipping Facebook post.');
    }

    // Instagram
    if (igUserId && fbToken) {
        try {
            const ig = await postToInstagram({ igUserId, pageAccessToken: fbToken, caption });
            if (ig) result.instagramPostUrl = ig.postUrl;
        } catch (err) {
            console.error('❌ Instagram post failed:', err.message);
        }
    }

    return result;
};

module.exports = { postReviewToSocialMedia, postToFacebook, postToInstagram };
