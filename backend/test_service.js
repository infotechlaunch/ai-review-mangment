require('dotenv').config();
const { fetchPlacesReviews } = require('./src/services/googleBusinessService');

async function testService() {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const placeId = 'ChIJN1t_tDeuEmsRUte9raV_iD4'; // Google Sydney for test
    
    console.log('Testing fetchPlacesReviews Service...');
    console.log('API Key present:', !!apiKey);
    
    try {
        const result = await fetchPlacesReviews(placeId, apiKey);
        console.log('Success!');
        console.log('Business:', result.businessName);
        console.log('Reviews count:', result.reviews.length);
        if (result.reviews.length > 0) {
            console.log('First Review:', result.reviews[0].reviewer_name, '-', result.reviews[0].rating, 'stars');
        }
    } catch (err) {
        console.error('Service Test Failed:');
        console.error(err.message);
    }
}

testService();
