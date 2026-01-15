const axios = require('axios');

/**
 * Complete Google Business Profile Integration Test
 * Tests the full flow: Login → Connect Google → Sync Reviews → View → Reply
 */

const BASE_URL = 'http://localhost:4000/api';
let authToken = '';
let reviewId = '';

// Test credentials (update these with your test account)
const TEST_USER = {
    email: 'testuser@example.com',
    password: 'Test123!@#'
};

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(70));
    log(title, 'cyan');
    console.log('='.repeat(70));
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Step 1: Login to get authentication token
 */
async function testLogin() {
    logSection('STEP 1: User Login');

    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);

        if (response.data.success && response.data.token) {
            authToken = response.data.token;
            log('✓ Login successful', 'green');
            log(`  User: ${response.data.user.email}`, 'blue');
            log(`  Role: ${response.data.user.role}`, 'blue');
            log(`  Token: ${authToken.substring(0, 20)}...`, 'blue');
            return true;
        } else {
            log('✗ Login failed: No token received', 'red');
            return false;
        }
    } catch (error) {
        log('✗ Login failed', 'red');
        log(`  Error: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

/**
 * Step 2: Check Google OAuth connection status
 */
async function testConnectionStatus() {
    logSection('STEP 2: Check Google Connection Status');

    try {
        const response = await axios.get(`${BASE_URL}/google-oauth/status`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        log('✓ Connection status retrieved', 'green');
        log(`  Connected: ${response.data.isConnected}`, 'blue');

        if (response.data.isConnected) {
            log(`  Account ID: ${response.data.accountId}`, 'blue');
            log(`  Locations: ${response.data.locationsCount}`, 'blue');
            log(`  Token Expired: ${response.data.isTokenExpired}`, 'blue');
        } else {
            log('  ⚠ Google account not connected', 'yellow');
            log('  Please run: GET /api/google-oauth/connect', 'yellow');
        }

        return response.data.isConnected;
    } catch (error) {
        log('✗ Failed to check connection status', 'red');
        log(`  Error: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

/**
 * Step 3: Initiate Google OAuth (manual step)
 */
async function testInitiateOAuth() {
    logSection('STEP 3: Initiate Google OAuth Flow');

    try {
        const response = await axios.get(`${BASE_URL}/google-oauth/connect`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        log('✓ OAuth URL generated', 'green');
        log('  → Redirect user to this URL:', 'yellow');
        log(`  ${response.data.authUrl}`, 'cyan');
        log('\n  ⚠ Manual step: User must authorize on Google', 'yellow');
        log('  After authorization, Google will redirect to callback URL', 'yellow');

        return true;
    } catch (error) {
        log('✗ Failed to generate OAuth URL', 'red');
        log(`  Error: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

/**
 * Step 4: Get business locations
 */
async function testGetLocations() {
    logSection('STEP 4: Get Business Locations');

    try {
        const response = await axios.get(`${BASE_URL}/google-oauth/locations`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        log(`✓ Retrieved ${response.data.count} location(s)`, 'green');

        response.data.data.forEach((location, index) => {
            log(`\n  Location ${index + 1}:`, 'blue');
            log(`    Name: ${location.name}`, 'blue');
            log(`    Slug: ${location.slug}`, 'blue');
            log(`    Address: ${location.address || 'N/A'}`, 'blue');
            log(`    Google Location ID: ${location.googleLocationId}`, 'blue');
        });

        return response.data.count > 0;
    } catch (error) {
        log('✗ Failed to get locations', 'red');
        log(`  Error: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

/**
 * Step 5: Sync reviews from Google
 */
async function testSyncReviews() {
    logSection('STEP 5: Sync Reviews from Google');

    try {
        log('⏳ Fetching reviews from Google...', 'yellow');

        const response = await axios.post(`${BASE_URL}/google-oauth/sync-reviews`, {}, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        log('✓ Reviews synced successfully', 'green');
        log(`  New reviews: ${response.data.data.totalNewReviews}`, 'blue');
        log(`  Updated reviews: ${response.data.data.totalUpdatedReviews}`, 'blue');
        log(`  Locations processed: ${response.data.data.locationsProcessed}`, 'blue');

        log('\n  Location breakdown:', 'blue');
        response.data.data.locationResults.forEach(loc => {
            if (loc.error) {
                log(`    ✗ ${loc.locationName}: ${loc.error}`, 'red');
            } else {
                log(`    ✓ ${loc.locationName}: ${loc.totalFetched} total (${loc.newReviews} new, ${loc.updatedReviews} updated)`, 'green');
            }
        });

        return true;
    } catch (error) {
        log('✗ Failed to sync reviews', 'red');
        log(`  Error: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

/**
 * Step 6: Get all reviews with filters
 */
async function testGetReviews() {
    logSection('STEP 6: Get Reviews (Filter: 5-star, no reply)');

    try {
        const response = await axios.get(`${BASE_URL}/reviews?rating=5&replied=false&limit=5`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        const { reviews, pagination } = response.data.data;

        log(`✓ Retrieved ${reviews.length} review(s)`, 'green');
        log(`  Total matching: ${pagination.total}`, 'blue');
        log(`  Page: ${pagination.page} of ${pagination.pages}`, 'blue');

        if (reviews.length > 0) {
            reviewId = reviews[0]._id; // Save for next steps

            reviews.forEach((review, index) => {
                log(`\n  Review ${index + 1}:`, 'blue');
                log(`    ID: ${review._id}`, 'blue');
                log(`    Reviewer: ${review.reviewer_name}`, 'blue');
                log(`    Rating: ${'⭐'.repeat(review.rating)}`, 'blue');
                log(`    Text: "${review.review_text.substring(0, 80)}${review.review_text.length > 80 ? '...' : ''}"`, 'blue');
                log(`    Date: ${new Date(review.review_created_at).toLocaleDateString()}`, 'blue');
                log(`    Has Reply: ${review.has_reply ? 'Yes' : 'No'}`, 'blue');
            });
        }

        return reviews.length > 0;
    } catch (error) {
        log('✗ Failed to get reviews', 'red');
        log(`  Error: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

/**
 * Step 7: Get single review details
 */
async function testGetReviewById() {
    logSection('STEP 7: Get Single Review Details');

    if (!reviewId) {
        log('⚠ Skipping - no review ID available', 'yellow');
        return false;
    }

    try {
        const response = await axios.get(`${BASE_URL}/reviews/${reviewId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        const review = response.data.data;

        log('✓ Review details retrieved', 'green');
        log(`\n  Review Information:`, 'blue');
        log(`    Reviewer: ${review.reviewer_name}`, 'blue');
        log(`    Rating: ${'⭐'.repeat(review.rating)}`, 'blue');
        log(`    Review: "${review.review_text}"`, 'blue');
        log(`    Date: ${new Date(review.review_created_at).toLocaleDateString()}`, 'blue');
        log(`    Status: ${review.approval_status}`, 'blue');
        log(`    Has Reply: ${review.has_reply ? 'Yes' : 'No'}`, 'blue');

        if (review.location) {
            log(`\n  Location: ${review.location.name}`, 'blue');
        }

        return true;
    } catch (error) {
        log('✗ Failed to get review details', 'red');
        log(`  Error: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

/**
 * Step 8: Generate AI reply
 */
async function testGenerateAIReply() {
    logSection('STEP 8: Generate AI Reply');

    if (!reviewId) {
        log('⚠ Skipping - no review ID available', 'yellow');
        return false;
    }

    try {
        log('⏳ Generating AI reply...', 'yellow');

        const response = await axios.post(`${BASE_URL}/reviews/${reviewId}/generate-reply`, {}, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        log('✓ AI reply generated successfully', 'green');
        log(`\n  Generated Reply:`, 'blue');
        log(`  "${response.data.data.aiReply}"`, 'cyan');
        log(`\n  Generated at: ${new Date(response.data.data.generatedAt).toLocaleString()}`, 'blue');

        return true;
    } catch (error) {
        log('✗ Failed to generate AI reply', 'red');
        log(`  Error: ${error.response?.data?.message || error.message}`, 'red');

        if (error.response?.data?.message?.includes('already has a reply')) {
            log('  ℹ This review already has a reply', 'yellow');
        }

        return false;
    }
}

/**
 * Step 9: Edit reply before posting
 */
async function testEditReply() {
    logSection('STEP 9: Edit Reply (Optional)');

    if (!reviewId) {
        log('⚠ Skipping - no review ID available', 'yellow');
        return false;
    }

    try {
        const editedReply = "Thank you so much for your wonderful feedback! We're thrilled you enjoyed your experience with us. We look forward to serving you again soon! 🙏";

        const response = await axios.put(`${BASE_URL}/reviews/${reviewId}/reply`, {
            editedReply
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        log('✓ Reply updated successfully', 'green');
        log(`\n  Edited Reply:`, 'blue');
        log(`  "${response.data.data.finalReply}"`, 'cyan');

        return true;
    } catch (error) {
        log('✗ Failed to edit reply', 'red');
        log(`  Error: ${error.response?.data?.message || error.message}`, 'red');

        if (error.response?.data?.message?.includes('already been posted')) {
            log('  ℹ Reply has already been posted to Google', 'yellow');
        }

        return false;
    }
}

/**
 * Step 10: Approve and post reply to Google
 */
async function testApproveAndPostReply() {
    logSection('STEP 10: Approve & Post Reply to Google');

    if (!reviewId) {
        log('⚠ Skipping - no review ID available', 'yellow');
        return false;
    }

    try {
        log('⏳ Posting reply to Google...', 'yellow');

        const response = await axios.post(`${BASE_URL}/reviews/${reviewId}/approve-reply`, {}, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        log('✓ Reply posted to Google successfully!', 'green');
        log(`\n  Final Reply:`, 'blue');
        log(`  "${response.data.data.finalReply}"`, 'cyan');
        log(`\n  Posted at: ${new Date(response.data.data.postedAt).toLocaleString()}`, 'blue');
        log(`  Approved by: ${response.data.data.approvedBy || 'N/A'}`, 'blue');
        log('\n  🎉 Reply is now visible on Google Maps!', 'green');

        return true;
    } catch (error) {
        log('✗ Failed to post reply to Google', 'red');
        log(`  Error: ${error.response?.data?.message || error.message}`, 'red');

        if (error.response?.data?.message?.includes('already posted')) {
            log('  ℹ Reply has already been posted', 'yellow');
        }

        return false;
    }
}

/**
 * Run all tests in sequence
 */
async function runAllTests() {
    console.clear();
    log('╔════════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║     Google Business Profile Integration - Complete Flow Test      ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════════════╝', 'cyan');

    const tests = [
        { name: 'Login', fn: testLogin, critical: true },
        { name: 'Check Connection Status', fn: testConnectionStatus, critical: false },
        { name: 'Initiate OAuth (Manual)', fn: testInitiateOAuth, critical: false },
        { name: 'Get Locations', fn: testGetLocations, critical: false },
        { name: 'Sync Reviews', fn: testSyncReviews, critical: false },
        { name: 'Get Reviews', fn: testGetReviews, critical: false },
        { name: 'Get Review Details', fn: testGetReviewById, critical: false },
        { name: 'Generate AI Reply', fn: testGenerateAIReply, critical: false },
        { name: 'Edit Reply', fn: testEditReply, critical: false },
        { name: 'Post Reply to Google', fn: testApproveAndPostReply, critical: false },
    ];

    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;

    for (const test of tests) {
        const result = await test.fn();

        if (result) {
            passedTests++;
        } else if (test.critical) {
            failedTests++;
            log(`\n⚠ Critical test failed: ${test.name}`, 'red');
            log('Stopping test execution.', 'red');
            break;
        } else {
            skippedTests++;
        }

        await sleep(500); // Small delay between tests
    }

    // Summary
    logSection('TEST SUMMARY');
    log(`✓ Passed: ${passedTests}`, 'green');
    log(`✗ Failed: ${failedTests}`, 'red');
    log(`⚠ Skipped: ${skippedTests}`, 'yellow');

    console.log('\n');

    if (failedTests === 0 && passedTests > 0) {
        log('🎉 All critical tests passed!', 'green');
    }
}

// Run tests
runAllTests().catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
});
