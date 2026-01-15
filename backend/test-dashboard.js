const axios = require('axios');

async function testDashboard() {
    try {
        console.log('Testing dashboard endpoint...');
        const response = await axios.get('http://localhost:3000/api/dashboard');
        console.log('✓ Success!');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('✗ Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testDashboard();
