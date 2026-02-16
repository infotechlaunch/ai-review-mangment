#!/usr/bin/env node
/**
 * Google Business Profile API Quota Calculator
 * Run: node scripts/quota-calculator.js
 */

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function calculateQuota() {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║  Google Business Profile API Quota Calculator     ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    try {
        // Get user inputs
        const numClients = parseInt(await question('Number of clients (current or planned): ')) || 0;
        const avgLocations = parseInt(await question('Average locations per client: ')) || 1;
        const syncsPerDay = parseInt(await question('Review syncs per day (e.g., 4 = every 6 hours): ')) || 1;
        const avgReviewsPerLocation = parseInt(await question('Average reviews per location: ')) || 50;
        const avgRepliesPerDay = parseInt(await question('Average review replies per day: ')) || 10;
        const fetchMetrics = (await question('Fetch performance metrics? (yes/no): ')).toLowerCase() === 'yes';

        console.log('\n' + '─'.repeat(60));
        console.log('CALCULATING...\n');

        // Calculate pages needed per location
        const reviewsPerPage = 50; // Google's max
        const avgPagesPerLocation = Math.ceil(avgReviewsPerLocation / reviewsPerPage);

        // 1. Review Listing API Calls
        const reviewListingCalls = numClients * avgLocations * syncsPerDay * avgPagesPerLocation;

        // 2. Review Reply API Calls (POST reply + GET verification)
        const replyCalls = avgRepliesPerDay * 2;

        // 3. Performance Metrics API Calls (if enabled)
        const metricsFrequency = 7; // Once per week per location
        const performanceCalls = fetchMetrics
            ? numClients * avgLocations * (30 / metricsFrequency)
            : 0;

        // 4. Business Info Updates (estimated 10% update frequency)
        const businessInfoCalls = numClients * avgLocations * 0.1;

        // Total
        const totalDailyCalls = reviewListingCalls + replyCalls + performanceCalls + businessInfoCalls;

        // Add 30% buffer for retries, errors, and growth
        const recommendedQuota = Math.ceil(totalDailyCalls * 1.3);

        // Display results
        console.log('📊 QUOTA CALCULATION BREAKDOWN');
        console.log('─'.repeat(60));
        console.log(`Clients:              ${numClients}`);
        console.log(`Total Locations:      ${numClients * avgLocations}`);
        console.log(`Syncs per Day:        ${syncsPerDay}`);
        console.log(`Avg Pages/Location:   ${avgPagesPerLocation}`);
        console.log('');
        console.log('API CALL BREAKDOWN:');
        console.log(`  Review Listing:     ${reviewListingCalls.toLocaleString()} calls/day`);
        console.log(`  Review Replies:     ${replyCalls.toLocaleString()} calls/day`);
        console.log(`  Performance:        ${Math.round(performanceCalls).toLocaleString()} calls/day`);
        console.log(`  Business Info:      ${Math.round(businessInfoCalls).toLocaleString()} calls/day`);
        console.log('─'.repeat(60));
        console.log(`TOTAL (base):         ${Math.round(totalDailyCalls).toLocaleString()} calls/day`);
        console.log(`RECOMMENDED (30% buffer): ${recommendedQuota.toLocaleString()} calls/day`);
        console.log('─'.repeat(60));

        // Recommendations
        console.log('\n💡 RECOMMENDATION:\n');

        const defaultQuota = 10000;
        const utilizationPercent = Math.round((recommendedQuota / defaultQuota) * 100);

        if (recommendedQuota <= defaultQuota * 0.7) {
            console.log('✅ DEFAULT QUOTA IS SUFFICIENT');
            console.log(`   You're using ~${utilizationPercent}% of the default 10,000/day quota.`);
            console.log('   No quota increase request needed at this time.');
        } else if (recommendedQuota <= defaultQuota) {
            console.log('⚠️  APPROACHING DEFAULT QUOTA LIMIT');
            console.log(`   You're using ~${utilizationPercent}% of the default 10,000/day quota.`);
            console.log('   Consider optimizing before requesting increase:');
            console.log('   • Reduce sync frequency for low-activity locations');
            console.log('   • Implement differential sync (fetch only new reviews)');
            console.log('   • Cache review data more aggressively');
        } else {
            console.log('🚨 QUOTA INCREASE REQUIRED');
            console.log(`   You need ~${utilizationPercent}% of default quota.`);
            console.log(`   Request quota increase to: ${Math.ceil(recommendedQuota / 1000) * 1000} calls/day`);
            console.log('\n   📋 Next Steps:');
            console.log('   1. Visit: https://support.google.com/business/contact/api_default');
            console.log('   2. Use the business justification template in GOOGLE_API_QUOTA_GUIDE.md');
            console.log(`   3. Request quota: ${Math.ceil(recommendedQuota / 1000) * 1000} calls/day`);
        }

        // Growth projection
        console.log('\n📈 GROWTH PROJECTIONS:\n');
        const growthRates = [1.5, 2, 3, 5];

        console.log('If your client base grows:');
        growthRates.forEach(rate => {
            const futureQuota = Math.ceil(recommendedQuota * rate);
            console.log(`  ${rate}x growth → ${futureQuota.toLocaleString()} calls/day ${futureQuota > defaultQuota ? '⚠️ QUOTA INCREASE NEEDED' : '✓'}`);
        });

        // Optimization tips
        console.log('\n💰 COST OPTIMIZATION TIPS:\n');

        // Calculate savings from frequency reduction
        if (syncsPerDay > 2) {
            const reducedSyncs = 2;
            const savedCalls = reviewListingCalls - (numClients * avgLocations * reducedSyncs * avgPagesPerLocation);
            const savingPercent = Math.round((savedCalls / totalDailyCalls) * 100);
            console.log(`  • Reduce sync to ${reducedSyncs}x/day → Save ${savedCalls.toLocaleString()} calls (${savingPercent}%)`);
        }

        // Differential sync savings
        const differentialSavings = Math.round(reviewListingCalls * 0.7); // Assume 70% savings
        const diffPercent = Math.round((differentialSavings / totalDailyCalls) * 100);
        console.log(`  • Implement differential sync → Save ~${differentialSavings.toLocaleString()} calls (${diffPercent}%)`);

        // Pagination optimization
        if (avgReviewsPerLocation < 50) {
            const optimizedPages = 1;
            const pageSavings = reviewListingCalls - (numClients * avgLocations * syncsPerDay * optimizedPages);
            const pagePercent = Math.round((pageSavings / totalDailyCalls) * 100);
            console.log(`  • Fetch only first page → Save ${pageSavings.toLocaleString()} calls (${pagePercent}%)`);
        }

        console.log('\n📖 See GOOGLE_API_QUOTA_GUIDE.md for detailed optimization strategies');
        console.log('─'.repeat(60) + '\n');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        rl.close();
    }
}

// Run calculator
calculateQuota();
