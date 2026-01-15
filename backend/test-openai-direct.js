/**
 * Direct OpenAI Test
 * Tests OpenAI API directly
 */

require('dotenv').config();
const { generateReply } = require('./src/config/openai');

async function testOpenAI() {
    console.log('\n=== Testing OpenAI API Directly ===\n');

    const testReviews = [
        {
            text: 'Excellent service! The team was professional and delivered exactly what we needed.',
            rating: 5,
            businessName: 'Demo Business Inc.'
        },
        {
            text: 'The service was okay. It met expectations but nothing extraordinary.',
            rating: 3,
            businessName: 'Demo Business Inc.'
        },
        {
            text: 'Great experience overall. The service was good but there was a small delay.',
            rating: 4,
            businessName: 'Demo Business Inc.'
        }
    ];

    for (const review of testReviews) {
        console.log(`\n${review.rating} ⭐ Review:`);
        console.log(`"${review.text}"`);
        console.log('\nGenerating reply...');

        try {
            const reply = await generateReply(review.text, review.rating, review.businessName);
            console.log('\n✓ AI Generated Reply:');
            console.log(`"${reply}"`);
            console.log('\n' + '─'.repeat(60));

        } catch (error) {
            console.error('✗ Error:', error.message);
            console.error('Details:', error.stack);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n=== Test Complete ===\n');
}

testOpenAI();
