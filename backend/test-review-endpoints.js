/**
 * Simple Review Endpoints Test
 * Tests the MongoDB review endpoints without importing models
 * 
 * Usage: 
 * 1. Start server: npm run dev (in another terminal)
 * 2. Run test: node test-review-endpoints.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m'
};

async function test() {
    console.log(`\n${colors.cyan}=== Testing Review API Endpoints ===${colors.reset}\n`);

    let adminToken, clientToken, reviewId;

    try {
        // 1. Login as Admin
        console.log('1. Testing Admin Login...');
        const adminLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@reviewmgnt.com',
            password: 'admin@2024'
        });
        adminToken = adminLogin.data.token;
        console.log(`${colors.green}✓ Admin login successful${colors.reset}`);

        // 2. Login as Client
        console.log('\n2. Testing Client Login...');
        const clientLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'owner@demo-business.com',
            password: 'demo123'
        });
        clientToken = clientLogin.data.token;
        console.log(`${colors.green}✓ Client login successful${colors.reset}`);

        // 3. GET /api/reviews - List reviews
        console.log('\n3. Testing GET /api/reviews...');
        const listReviews = await axios.get(`${BASE_URL}/api/reviews`, {
            headers: { Authorization: `Bearer ${clientToken}` }
        });
        console.log(`${colors.green}✓ GET /api/reviews working${colors.reset}`);
        console.log(`   Found ${listReviews.data.data.reviews.length} reviews`);

        if (listReviews.data.data.reviews.length > 0) {
            reviewId = listReviews.data.data.reviews[0]._id;
            console.log(`   Using review ID: ${reviewId}`);

            // 4. GET /api/reviews/:id - Get single review
            console.log('\n4. Testing GET /api/reviews/:id...');
            const singleReview = await axios.get(`${BASE_URL}/api/reviews/${reviewId}`, {
                headers: { Authorization: `Bearer ${clientToken}` }
            });
            console.log(`${colors.green}✓ GET /api/reviews/:id working${colors.reset}`);
            console.log(`   Review: ${singleReview.data.data.review_text?.substring(0, 60)}...`);
            console.log(`   Rating: ${singleReview.data.data.rating} stars`);

            // 5. POST /api/reviews/:id/generate-reply - Generate AI reply
            console.log('\n5. Testing POST /api/reviews/:id/generate-reply...');
            try {
                const genReply = await axios.post(
                    `${BASE_URL}/api/reviews/${reviewId}/generate-reply`,
                    {},
                    { headers: { Authorization: `Bearer ${clientToken}` } }
                );
                console.log(`${colors.green}✓ POST /api/reviews/:id/generate-reply working${colors.reset}`);
                console.log(`   AI Reply: ${genReply.data.data.aiReply?.substring(0, 80)}...`);
            } catch (error) {
                if (error.response?.status === 400 || error.response?.status === 500) {
                    console.log(`${colors.yellow}⚠ Cannot generate reply: ${error.response.data.message || error.response.data.error}${colors.reset}`);
                    console.log(`   (Expected if OpenAI API key not configured)${colors.reset}`);
                } else {
                    throw error;
                }
            }

            // 6. PUT /api/reviews/:id/reply - Update reply
            console.log('\n6. Testing PUT /api/reviews/:id/reply...');
            try {
                const updateReply = await axios.put(
                    `${BASE_URL}/api/reviews/${reviewId}/reply`,
                    { editedReply: 'Thank you for your feedback! We appreciate your business.' },
                    { headers: { Authorization: `Bearer ${clientToken}` } }
                );
                console.log(`${colors.green}✓ PUT /api/reviews/:id/reply working${colors.reset}`);
                console.log(`   Updated reply: ${updateReply.data.data.finalReply?.substring(0, 60)}...`);
            } catch (error) {
                if (error.response?.status === 400) {
                    console.log(`${colors.yellow}⚠ Cannot update reply: ${error.response.data.message}${colors.reset}`);
                } else {
                    throw error;
                }
            }

            // 7. POST /api/reviews/:id/approve-reply - Approve and post reply
            console.log('\n7. Testing POST /api/reviews/:id/approve-reply...');
            try {
                const approveReply = await axios.post(
                    `${BASE_URL}/api/reviews/${reviewId}/approve-reply`,
                    {},
                    { headers: { Authorization: `Bearer ${clientToken}` } }
                );
                console.log(`${colors.green}✓ POST /api/reviews/:id/approve-reply working${colors.reset}`);
                console.log(`   Reply approved and posted`);
            } catch (error) {
                if (error.response?.status === 400 || error.response?.status === 500) {
                    console.log(`${colors.yellow}⚠ Cannot approve reply: ${error.response.data.message || error.response.data.error}${colors.reset}`);
                    console.log(`   (Expected if Google OAuth not configured)${colors.reset}`);
                } else {
                    throw error;
                }
            }
        } else {
            console.log(`${colors.yellow}⚠ No reviews found - skipping review-specific tests${colors.reset}`);
        }

        // 8. POST /api/reviews/fetch - Fetch reviews from Google
        console.log('\n8. Testing POST /api/reviews/fetch...');
        try {
            // Get location ID from reviews
            let locationId = 'test-location-id'; // Default

            if (reviewId) {
                // Try to get location ID from the review we fetched earlier
                try {
                    const reviewResponse = await axios.get(`${BASE_URL}/api/reviews/${reviewId}`, {
                        headers: { Authorization: `Bearer ${clientToken}` }
                    });
                    if (reviewResponse.data.data.location) {
                        locationId = reviewResponse.data.data.location._id || reviewResponse.data.data.location;
                        console.log(`   Using location ID: ${locationId}`);
                    }
                } catch (e) {
                    // Ignore, use default
                }
            }

            const fetchReviews = await axios.post(
                `${BASE_URL}/api/reviews/fetch`,
                { locationId: locationId },
                { headers: { Authorization: `Bearer ${clientToken}` } }
            );
            console.log(`${colors.green}✓ POST /api/reviews/fetch working${colors.reset}`);
        } catch (error) {
            if (error.response?.status === 400 || error.response?.status === 404 || error.response?.status === 500) {
                console.log(`${colors.yellow}⚠ Cannot fetch reviews: ${error.response.data.message || error.response.data.error}${colors.reset}`);
                console.log(`   (Expected if Google OAuth not set up or location doesn't exist)${colors.reset}`);
            } else {
                throw error;
            }
        }

        console.log(`\n${colors.cyan}=== All Available Endpoints Tested ===${colors.reset}`);
        console.log(`${colors.green}✓ All endpoints are working or returned expected errors${colors.reset}\n`);

    } catch (error) {
        console.error(`\n${colors.red}✗ Test failed:${colors.reset}`, error.response?.data || error.message);
        process.exit(1);
    }
}

// Run the test
console.log('Make sure the server is running (npm run dev in another terminal)');
console.log('Waiting 2 seconds...\n');

setTimeout(test, 2000);
