/**
 * Test Google Sheets Data Fetching with Field Mapping
 * This script tests if the normalized field mapping is working correctly
 */

const { getAllClients } = require('./src/models/Client');
const { getReviewsByTab, getAllReviews, filterReviews } = require('./src/models/Review_Sheets');

console.log('\n🧪 Testing Google Sheets Field Mapping\n');
console.log('='.repeat(60));

async function testFieldMapping() {
    try {
        // Test 1: Fetch all clients
        console.log('\n📋 Test 1: Fetching Client Configuration...');
        const clients = await getAllClients();
        console.log(`✅ Found ${clients.length} clients`);

        if (clients.length > 0) {
            console.log('\nSample Client:');
            console.log(JSON.stringify(clients[0], null, 2));
        }

        // Test 2: Fetch reviews from first client
        if (clients.length > 0 && clients[0].sheetTab) {
            console.log('\n📋 Test 2: Fetching Reviews from First Client...');
            console.log(`Sheet Tab: ${clients[0].sheetTab}`);
            console.log(`GID: ${clients[0].gid || 'Not specified'}`);

            const gid = clients[0].gid || '0';
            const reviews = await getReviewsByTab(clients[0].sheetTab, gid);
            console.log(`✅ Found ${reviews.length} reviews`);

            if (reviews.length > 0) {
                console.log('\nSample Review (showing normalized fields):');
                const sampleReview = reviews[0];
                console.log({
                    review_key: sampleReview.review_key,
                    google_review_id: sampleReview.google_review_id,
                    reviewer_name: sampleReview.reviewer_name,
                    rating: sampleReview.rating,
                    review_text: sampleReview.review_text?.substring(0, 50) + '...',
                    sentiment: sampleReview.sentiment,
                    ai_generated_reply: sampleReview.ai_generated_reply?.substring(0, 50) + '...',
                    edited_reply: sampleReview.edited_reply?.substring(0, 50) + '...',
                    approval_status: sampleReview.approval_status,
                    final_caption: sampleReview.final_caption?.substring(0, 50) + '...',
                    approved_by: sampleReview.approved_by,
                    approved_at: sampleReview.approved_at,
                });

                console.log('\n📊 Field Mapping Verification:');
                console.log('✓ review_key:', sampleReview.review_key ? '✅ Mapped' : '⚠️ Missing');
                console.log('✓ google_review_id:', sampleReview.google_review_id ? '✅ Mapped' : '⚠️ Missing');
                console.log('✓ reviewer_name:', sampleReview.reviewer_name ? '✅ Mapped' : '⚠️ Missing');
                console.log('✓ rating:', sampleReview.rating ? '✅ Mapped' : '⚠️ Missing');
                console.log('✓ review_text:', sampleReview.review_text ? '✅ Mapped' : '⚠️ Missing');
                console.log('✓ sentiment:', sampleReview.sentiment ? '✅ Mapped' : '⚠️ Missing');
                console.log('✓ ai_generated_reply:', sampleReview.ai_generated_reply ? '✅ Mapped' : '⚠️ Not Set');
                console.log('✓ edited_reply:', sampleReview.edited_reply ? '✅ Mapped' : '⚠️ Not Set');
                console.log('✓ approval_status:', sampleReview.approval_status ? '✅ Mapped' : '⚠️ Missing');
                console.log('✓ final_caption:', sampleReview.final_caption ? '✅ Mapped' : '⚠️ Not Set');
            }
        }

        // Test 3: Fetch all reviews
        console.log('\n📋 Test 3: Fetching All Reviews from All Clients...');
        const allReviews = await getAllReviews(clients);
        console.log(`✅ Total reviews across all clients: ${allReviews.length}`);

        // Test 4: Filter by rating
        console.log('\n📋 Test 4: Testing Filters...');
        const fiveStarReviews = filterReviews(allReviews, { rating: 5 });
        console.log(`✅ 5-star reviews: ${fiveStarReviews.length}`);

        const oneStarReviews = filterReviews(allReviews, { rating: 1 });
        console.log(`✅ 1-star reviews: ${oneStarReviews.length}`);

        // Test 5: Filter by sentiment
        const positiveReviews = filterReviews(allReviews, { sentiment: 'Positive' });
        console.log(`✅ Positive sentiment: ${positiveReviews.length}`);

        const negativeReviews = filterReviews(allReviews, { sentiment: 'Negative' });
        console.log(`✅ Negative sentiment: ${negativeReviews.length}`);

        // Test 6: Filter by approval status
        const pendingReviews = filterReviews(allReviews, { approvalStatus: 'pending' });
        console.log(`✅ Pending reviews: ${pendingReviews.length}`);

        const approvedReviews = filterReviews(allReviews, { approvalStatus: 'approved' });
        console.log(`✅ Approved reviews: ${approvedReviews.length}`);

        // Test 7: Statistics
        console.log('\n📊 Review Statistics:');
        console.log('─'.repeat(60));

        const ratingBreakdown = {
            5: allReviews.filter(r => parseInt(r.rating) === 5).length,
            4: allReviews.filter(r => parseInt(r.rating) === 4).length,
            3: allReviews.filter(r => parseInt(r.rating) === 3).length,
            2: allReviews.filter(r => parseInt(r.rating) === 2).length,
            1: allReviews.filter(r => parseInt(r.rating) === 1).length,
        };

        const sentimentBreakdown = {
            Positive: allReviews.filter(r => r.sentiment === 'Positive').length,
            Negative: allReviews.filter(r => r.sentiment === 'Negative').length,
            Neutral: allReviews.filter(r => r.sentiment === 'Neutral').length,
            Mixed: allReviews.filter(r => r.sentiment === 'Mixed').length,
        };

        const avgRating = allReviews.length > 0
            ? (allReviews.reduce((sum, r) => sum + parseInt(r.rating || 0), 0) / allReviews.length).toFixed(2)
            : 0;

        console.log('Total Reviews:', allReviews.length);
        console.log('Average Rating:', avgRating);
        console.log('\nRating Breakdown:');
        Object.entries(ratingBreakdown).forEach(([star, count]) => {
            console.log(`  ${star} ⭐: ${count}`);
        });
        console.log('\nSentiment Breakdown:');
        Object.entries(sentimentBreakdown).forEach(([sentiment, count]) => {
            console.log(`  ${sentiment}: ${count}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('✅ All tests completed successfully!');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ Error during testing:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Run tests
testFieldMapping();
