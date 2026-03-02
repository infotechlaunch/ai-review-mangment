const axios = require('axios');

async function test() {
    try {
        const response = await axios.get('https://www.searchapi.io/api/v1/search', {
            params: {
                engine: 'google_maps_place',
                place_id: 'ChIJOW6f8wclJzoRMyn7Cz98L5Q'
            },
            headers: {
                'Authorization': `Bearer ZgCAd6fhxgcQdGJ5Z94cAxd6`
            }
        });
        console.log(JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error('ERROR RESPONSE:', e.response?.data || e.message);
    }
}
test();
