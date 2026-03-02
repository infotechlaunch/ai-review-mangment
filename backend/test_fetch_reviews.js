const { getReviewsByTab } = require('./src/models/Review_Sheets');
const { getClientBySlug } = require('./src/models/Client');

async function fetchReviews() {
    try {
        const slug = 'umesh_travels_raigarh_496001';
        console.log(`Fetching client configuration for: ${slug}...`);
        
        const client = await getClientBySlug(slug);
        
        if (!client) {
            console.error('Client not found!');
            return;
        }

        console.log('Client found:', client.businessName);
        console.log('Sheet Tab:', client.sheetTab);
        console.log('GID:', client.gid);

        if (!client.gid) {
            console.warn('Warning: No GID found for client. Trying with sheetTab name only.');
        }

        console.log(`\nFetching reviews from tab "${client.sheetTab}" (GID: ${client.gid})...`);
        
        // Pass both sheetTab and gid to ensure correct fetching
        const reviews = await getReviewsByTab(client.sheetTab, client.gid);

        console.log(`\n✓ Successfully fetched ${reviews.length} reviews.`);
        
        if (reviews.length > 0) {
            console.log('\nSample Review:');
            console.log(JSON.stringify(reviews[0], null, 2));

            // Save to file for inspection
            const fs = require('fs');
            fs.writeFileSync('fetched_reviews.json', JSON.stringify(reviews, null, 2));
            console.log('\nAll reviews saved to fetched_reviews.json');
        } else {
            console.log('No reviews found in this tab.');
        }

    } catch (error) {
        console.error('Error fetching reviews:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

fetchReviews();
