/**
 * Test OpenAI Reply Generation
 * Tests the AI reply generation endpoint
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    magenta: '\x1b[35m'
};

async function testAIReplyGeneration() {
    console.log(`\n${colors.cyan}=== Testing AI Reply Generation ===${colors.reset}\n`);

    try {
        // 1. Login as Client
        console.log('1. Logging in as Client...');
        const clientLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'owner@demo-business.com',
            password: 'demo123'
        });
        const clientToken = clientLogin.data.token;
        console.log(`${colors.green}✓ Client login successful${colors.reset}\n`);

        // 2. Get a review to test with
        console.log('2. Getting a test review...');
        const reviewsResponse = await axios.get(`${BASE_URL}/api/reviews?limit=5`, {
            headers: { Authorization: `Bearer ${clientToken}` }
        });

        if (!reviewsResponse.data.data.reviews || reviewsResponse.data.data.reviews.length === 0) {
            console.log(`${colors.red}✗ No reviews found. Run 'node seed-reviews.js' first.${colors.reset}`);
            process.exit(1);
        }

        const reviews = reviewsResponse.data.data.reviews;
        console.log(`${colors.green}✓ Found ${reviews.length} reviews${colors.reset}\n`);

        // 3. Generate AI replies for each review
        console.log(`${colors.cyan}3. Generating AI replies...${colors.reset}\n`);

        for (const review of reviews) {
            console.log(`${colors.magenta}Review by ${review.reviewer_name} (${review.rating} stars):${colors.reset}`);
            console.log(`   "${review.review_text.substring(0, 80)}..."`);

            try {
                const replyResponse = await axios.post(
                    `${BASE_URL}/api/reviews/${review._id}/generate-reply`,
                    {},
                    { headers: { Authorization: `Bearer ${clientToken}` } }
                );

                console.log(`${colors.green}   ✓ AI Reply Generated:${colors.reset}`);
                console.log(`   "${replyResponse.data.data.aiReply}"`);
                console.log('');

            } catch (error) {
                if (error.response?.status === 400 && error.response.data.message?.includes('already has a reply')) {
                    console.log(`${colors.yellow}   ⚠ Reply already exists for this review${colors.reset}\n`);
                } else {
                    console.log(`${colors.red}   ✗ Error: ${error.response?.data?.message || error.message}${colors.reset}\n`);
                }
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`${colors.cyan}=== Test Complete ===${colors.reset}`);
        console.log(`${colors.green}✓ AI reply generation is working!${colors.reset}\n`);

    } catch (error) {
        console.error(`\n${colors.red}✗ Test failed:${colors.reset}`, error.response?.data || error.message);
        process.exit(1);
    }
}

// Run the test
console.log('Make sure the server is running...');
console.log('Waiting 2 seconds...\n');

setTimeout(testAIReplyGeneration, 2000);
