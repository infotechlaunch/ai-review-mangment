/**
 * Test Script for Review API Endpoints
 * Tests: fetch, generate-reply, update-reply, approve-reply
 * 
 * Usage: node test-reviews.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';
let adminToken = '';
let clientToken = '';
let testReviewId = null;
let testLocationId = null;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

const log = {
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.cyan}${'='.repeat(60)}${colors.reset}`),
    subsection: (msg) => console.log(`\n${colors.magenta}${msg}${colors.reset}`),
};

/**
 * Login as admin
 */
async function loginAsAdmin() {
    log.subsection('1. Logging in as Admin...');
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@reviewmgnt.com',
            password: 'admin@2024',
        });

        if (response.data.success && response.data.token) {
            adminToken = response.data.token;
            log.success('Admin login successful');
            log.info(`Token: ${adminToken.substring(0, 30)}...`);
            return true;
        } else {
            log.error('Admin login failed: No token received');
            return false;
        }
    } catch (error) {
        log.error(`Admin login failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

/**
 * Login as client
 */
async function loginAsClient() {
    log.subsection('2. Logging in as Client...');
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'owner@demo-business.com',
            password: 'demo123',
        });

        if (response.data.success && response.data.token) {
            clientToken = response.data.token;
            log.success('Client login successful');
            log.info(`Token: ${clientToken.substring(0, 30)}...`);
            return true;
        } else {
            log.error('Client login failed: No token received');
            return false;
        }
    } catch (error) {
        log.error(`Client login failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

/**
 * Check server status (skip location setup for hybrid mode)
 */
async function checkServerStatus() {
    log.subsection('3. Checking Server Status...');
    try {
        const response = await axios.get(`${BASE_URL}/health`);

        if (response.data.success) {
            log.success('Server is running');
            log.info(`Mode: ${response.data.mode}`);
            log.info(`Environment: ${response.data.environment}`);
            return true;
        } else {
            log.error('Server health check failed');
            return false;
        }
    } catch (error) {
        log.error(`Server health check error: ${error.message}`);
        return false;
    }
}

/**
 * Test 1: GET /api/reviews (List reviews)
 */
async function testGetReviews() {
    log.subsection('4. Testing GET /api/reviews');
    try {
        const response = await axios.get(
            `${BASE_URL}/api/reviews?limit=10`,
            {
                headers: {
                    Authorization: `Bearer ${clientToken}`,
                },
            }
        );

        if (response.data.success) {
            log.success('Get reviews endpoint working');
            console.log('Response:', JSON.stringify(response.data, null, 2));

            // Store a review key for further tests
            if (response.data.data && response.data.data.length > 0) {
                testReviewId = response.data.data[0].ReviewKey;
                log.info(`Using ReviewKey for tests: ${testReviewId}`);
            }
            return true;
        } else {
            log.error('Get reviews failed');
            console.log('Response:', response.data);
            return false;
        }
    } catch (error) {
        log.error(`Get reviews error: ${error.response?.data?.message || error.message}`);
        if (error.response?.data) {
            console.log('Error details:', JSON.stringify(error.response.data, null, 2));
        }
        return false;
    }
}

/**
 * Test 2: GET /api/reviews/stats
 */
async function testGetReviewStats() {
    log.subsection('5. Testing GET /api/reviews/stats');
    try {
        const response = await axios.get(
            `${BASE_URL}/api/reviews/stats`,
            {
                headers: {
                    Authorization: `Bearer ${clientToken}`,
                },
            }
        );

        if (response.data.success) {
            log.success('Get review stats endpoint working');
            console.log('Stats:', JSON.stringify(response.data.data, null, 2));
            return true;
        } else {
            log.error('Get review stats failed');
            return false;
        }
    } catch (error) {
        log.error(`Get review stats error: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

/**
 * Test 3: GET /api/reviews/:reviewKey
 */
async function testGetReviewByKey() {
    log.subsection('6. Testing GET /api/reviews/:reviewKey');

    if (!testReviewId) {
        log.warning('No reviewKey available, skipping test');
        return true;
    }

    try {
        const response = await axios.get(
            `${BASE_URL}/api/reviews/${testReviewId}`,
            {
                headers: {
                    Authorization: `Bearer ${clientToken}`,
                },
            }
        );

        if (response.data.success) {
            log.success('Get review by key endpoint working');
            console.log('Review Data:', JSON.stringify({
                reviewKey: response.data.data.ReviewKey,
                client: response.data.data.Client,
                rating: response.data.data.Rating,
                text: response.data.data['Review Text']?.substring(0, 100),
                hasReply: response.data.data['Reply Text'] ? 'Yes' : 'No',
            }, null, 2));
            return true;
        } else {
            log.error('Get review by key failed');
            return false;
        }
    } catch (error) {
        log.error(`Get review by key error: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

/**
 * Test 4: POST /api/reviews/:reviewKey/generate-reply
 */
async function testGenerateReply() {
    log.subsection('7. Testing POST /api/reviews/:reviewKey/generate-reply');

    if (!testReviewId) {
        log.warning('No reviewKey available, skipping test');
        return true;
    }

    try {
        const response = await axios.post(
            `${BASE_URL}/api/reviews/${testReviewId}/generate-reply`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${clientToken}`,
                },
            }
        );

        if (response.data.success) {
            log.success('Generate AI reply endpoint working');
            console.log('AI Reply:', response.data.data.aiReply);
            console.log('Generated At:', response.data.data.generatedAt);
            return true;
        } else {
            log.error('Generate reply failed');
            console.log('Response:', response.data);
            return false;
        }
    } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message?.includes('already has a reply')) {
            log.warning(`Cannot generate reply: ${error.response.data.message}`);
            log.info('This is expected if the review already has a posted reply');
            return true; // Not a failure, just expected behavior
        }
        log.error(`Generate reply error: ${error.response?.data?.message || error.message}`);
        if (error.response?.data) {
            console.log('Error details:', JSON.stringify(error.response.data, null, 2));
        }
        return false;
    }
}

/**
 * Test 5: GET /api/reviews (with filters)
 */
async function testGetReviewsWithFilters() {
    log.subsection('8. Testing GET /api/reviews with filters');

    const tests = [
        { name: 'All reviews', params: {} },
        { name: 'Filter by client', params: { client: 'Demo Business' } },
        { name: '5-star reviews', params: { rating: '5' } },
        { name: 'Limit results', params: { limit: '5' } },
    ];

    let allPassed = true;

    for (const test of tests) {
        try {
            const queryString = new URLSearchParams(test.params).toString();
            const url = `${BASE_URL}/api/reviews${queryString ? '?' + queryString : ''}`;

            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${clientToken}`,
                },
            });

            if (response.data.success) {
                const count = response.data.data?.length || 0;
                log.success(`${test.name}: OK (${count} reviews)`);
            } else {
                log.error(`${test.name}: Failed`);
                allPassed = false;
            }
        } catch (error) {
            log.error(`${test.name}: ${error.response?.data?.message || error.message}`);
            allPassed = false;
        }
    }

    return allPassed;
}

/**
 * Main test runner
 */
async function runTests() {
    console.log('\n');
    log.section('🧪 REVIEW API ENDPOINTS TEST SUITE (HYBRID MODE)');
    log.info(`Testing API at: ${BASE_URL}`);
    log.info(`Time: ${new Date().toLocaleString()}`);

    const results = {
        total: 0,
        passed: 0,
        failed: 0,
    };

    // Setup
    if (!(await loginAsAdmin())) {
        log.error('Cannot proceed without admin login');
        return;
    }
    results.total++;
    results.passed++;

    if (!(await loginAsClient())) {
        log.error('Cannot proceed without client login');
        return;
    }
    results.total++;
    results.passed++;

    if (!(await checkServerStatus())) {
        log.error('Server status check failed');
        return;
    }
    results.total++;
    results.passed++;

    // Test endpoints
    const tests = [
        { name: 'Get Review List', fn: testGetReviews },
        { name: 'Get Review Stats', fn: testGetReviewStats },
        { name: 'Get Review By Key', fn: testGetReviewByKey },
        { name: 'Generate AI Reply', fn: testGenerateReply },
        { name: 'Get Reviews with Filters', fn: testGetReviewsWithFilters },
    ];

    for (const test of tests) {
        results.total++;
        const passed = await test.fn();
        if (passed) {
            results.passed++;
        } else {
            results.failed++;
        }
    }

    // Summary
    log.section('📊 TEST SUMMARY');
    console.log(`Total Tests: ${results.total}`);
    console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);

    if (results.failed === 0) {
        log.success('\n🎉 All tests passed!');
    } else {
        log.warning(`\n⚠️  ${results.failed} test(s) failed`);
    }

    log.info('\nNote: This test suite is for HYBRID MODE (Google Sheets).');
    log.info('For MongoDB mode endpoints, use the MongoDB-specific test file.');
    console.log('\n');
}

// Run tests
runTests().catch((error) => {
    log.error(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
});
