/**
 * Demo: AI Reply Generation (Mock Mode)
 * Shows how AI reply generation works without using OpenAI API
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

// Mock AI reply generator (for demonstration)
function generateMockReply(reviewText, rating, businessName) {
    const replies = {
        5: [
            `Thank you so much for your wonderful 5-star review! We're thrilled to hear about your positive experience with ${businessName}. Your feedback truly motivates our team to continue delivering excellent service.`,
            `We're so grateful for your kind words! It's customers like you who make what we do at ${businessName} so rewarding. Thank you for choosing us, and we look forward to serving you again soon!`,
            `What a fantastic review! Thank you for taking the time to share your experience. We're delighted that we could exceed your expectations at ${businessName}.`
        ],
        4: [
            `Thank you for your 4-star review! We're pleased to hear you had a good experience with ${businessName}. We appreciate your feedback and are always working to improve our service.`,
            `We appreciate your positive feedback! Thank you for choosing ${businessName}. If there's anything we can do to make your next visit a 5-star experience, please let us know.`
        ],
        3: [
            `Thank you for your honest feedback. We're glad we could meet your expectations at ${businessName}, and we're always looking for ways to improve. We'd love the opportunity to provide you with an even better experience next time.`,
            `We appreciate you taking the time to review ${businessName}. Your feedback helps us understand where we can improve. We hope to have the chance to exceed your expectations in the future.`
        ],
        2: [
            `We're sorry to hear that your experience with ${businessName} didn't fully meet your expectations. Your feedback is important to us, and we'd like to make things right. Please reach out to us so we can address your concerns.`,
            `Thank you for bringing this to our attention. We sincerely apologize for not meeting your expectations at ${businessName}. We'd appreciate the opportunity to discuss this further and improve your experience.`
        ],
        1: [
            `We sincerely apologize for your disappointing experience with ${businessName}. This is not the level of service we strive to provide. Please contact us directly so we can address your concerns and make this right.`,
            `We're truly sorry to hear about your negative experience. Your feedback is taken very seriously at ${businessName}, and we'd like to make amends. Please reach out to our team so we can resolve this matter.`
        ]
    };

    const ratingReplies = replies[rating] || replies[3];
    return ratingReplies[Math.floor(Math.random() * ratingReplies.length)];
}

async function demonstrateAIReplies() {
    console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.cyan}  AI Reply Generation Demo (Mock Mode)${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);

    console.log(`${colors.yellow}Note: Using mock AI replies since OpenAI quota is exceeded${colors.reset}`);
    console.log(`${colors.yellow}To use real OpenAI: Add credits to your OpenAI account${colors.reset}\n`);

    try {
        // Login as Client
        console.log('Logging in...');
        const clientLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'owner@demo-business.com',
            password: 'demo123'
        });
        const clientToken = clientLogin.data.token;
        console.log(`${colors.green}✓ Logged in successfully${colors.reset}\n`);

        // Get reviews
        const reviewsResponse = await axios.get(`${BASE_URL}/api/reviews?limit=5`, {
            headers: { Authorization: `Bearer ${clientToken}` }
        });

        if (!reviewsResponse.data.data.reviews || reviewsResponse.data.data.reviews.length === 0) {
            console.log(`${colors.red}✗ No reviews found${colors.reset}`);
            process.exit(1);
        }

        const reviews = reviewsResponse.data.data.reviews;
        console.log(`${colors.cyan}Found ${reviews.length} reviews. Generating mock AI replies...${colors.reset}\n`);
        console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);

        // Generate mock replies for each review
        for (let i = 0; i < reviews.length; i++) {
            const review = reviews[i];

            console.log(`${colors.magenta}Review #${i + 1}${colors.reset}`);
            console.log(`${colors.yellow}⭐`.repeat(review.rating) + `${'☆'.repeat(5 - review.rating)}${colors.reset}`);
            console.log(`Reviewer: ${review.reviewer_name}`);
            console.log(`Review: "${review.review_text}"`);

            // Generate mock reply
            const mockReply = generateMockReply(
                review.review_text,
                review.rating,
                'Demo Business Inc.'
            );

            console.log(`\n${colors.green}✓ Generated AI Reply:${colors.reset}`);
            console.log(`"${mockReply}"`);

            // Show how to save it manually (since API won't work)
            console.log(`\n${colors.cyan}To save this reply:${colors.reset}`);
            console.log(`PUT /api/reviews/${review._id}/reply`);
            console.log(`Body: { "editedReply": "${mockReply.substring(0, 40)}..." }`);

            console.log(`\n${colors.cyan}${'─'.repeat(70)}${colors.reset}\n`);
        }

        console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}`);
        console.log(`${colors.green}✓ Demo Complete!${colors.reset}`);
        console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);

        console.log(`${colors.yellow}How to enable real OpenAI:${colors.reset}`);
        console.log(`1. Go to https://platform.openai.com/account/billing`);
        console.log(`2. Add payment method and credits`);
        console.log(`3. The API will automatically work once quota is available\n`);

    } catch (error) {
        console.error(`${colors.red}✗ Error:${colors.reset}`, error.response?.data || error.message);
    }
}

demonstrateAIReplies();
