/**
 * Test Google OAuth Flow
 * 
 * Usage:
 * 1. First register a client: node test-google-oauth.js register
 * 2. Then connect Google: node test-google-oauth.js connect
 * 3. Check status: node test-google-oauth.js status
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:4000/api';

// Test credentials
const TEST_USER = {
    email: 'testowner@example.com',
    password: 'test123456',
    firstName: 'Test',
    lastName: 'Owner',
    businessName: 'Test Coffee Shop',
    slug: 'test-coffee-shop'
};

let authToken = '';

/**
 * Register a new CLIENT_OWNER
 */
async function registerClient() {
    try {
        console.log('\n🔷 Testing Client Registration...\n');

        const response = await axios.post(`${API_BASE_URL}/auth/register/client`, TEST_USER);

        console.log('✓ Registration successful!');
        console.log('Response:', JSON.stringify(response.data, null, 2));

        authToken = response.data.token;
        console.log('\n📝 Save this token for next steps:');
        console.log(authToken);

        if (response.data.requiresGoogleConnection) {
            console.log('\n⚠️  Next step:', response.data.nextStep);
            console.log('Run: node test-google-oauth.js connect');
        }

    } catch (error) {
        console.error('✗ Registration failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

/**
 * Login existing user
 */
async function login() {
    try {
        console.log('\n🔷 Testing Login...\n');

        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });

        console.log('✓ Login successful!');
        authToken = response.data.token;
        console.log('\n📝 Token:', authToken.substring(0, 50) + '...');

        return authToken;

    } catch (error) {
        console.error('✗ Login failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

/**
 * Initiate Google OAuth connection
 */
async function connectGoogle() {
    try {
        if (!authToken) {
            console.log('No token found. Logging in first...');
            await login();
        }

        console.log('\n🔷 Initiating Google OAuth Flow...\n');

        const response = await axios.get(`${API_BASE_URL}/google-oauth/connect`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('✓ OAuth URL generated!');
        console.log('\n📋 Authorization URL:');
        console.log(response.data.authUrl);
        console.log('\n👉 Copy this URL and open it in your browser to authorize Google Business access.');
        console.log('\n💡 After authorization, Google will redirect you to the callback URL.');

    } catch (error) {
        console.error('✗ Failed to get OAuth URL:', error.response?.data || error.message);
        process.exit(1);
    }
}

/**
 * Check Google Business connection status
 */
async function checkStatus() {
    try {
        if (!authToken) {
            console.log('No token found. Logging in first...');
            await login();
        }

        console.log('\n🔷 Checking Google Business Connection Status...\n');

        const response = await axios.get(`${API_BASE_URL}/google-oauth/status`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('Status:', JSON.stringify(response.data, null, 2));

        if (response.data.isConnected) {
            console.log('\n✓ Google Business is connected!');
            console.log('Account ID:', response.data.accountId);
            console.log('Locations:', response.data.locationsCount);
            console.log('Token expires:', new Date(response.data.tokenExpiry).toLocaleString());

            if (response.data.isTokenExpired) {
                console.log('\n⚠️  Warning: Token has expired. Please reconnect.');
            }
        } else {
            console.log('\n⚠️  Google Business is not connected.');
            console.log('Run: node test-google-oauth.js connect');
        }

    } catch (error) {
        console.error('✗ Failed to check status:', error.response?.data || error.message);
        process.exit(1);
    }
}

/**
 * Disconnect Google Business
 */
async function disconnect() {
    try {
        if (!authToken) {
            console.log('No token found. Logging in first...');
            await login();
        }

        console.log('\n🔷 Disconnecting Google Business...\n');

        const response = await axios.post(`${API_BASE_URL}/google-oauth/disconnect`, {}, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('✓ Disconnected successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('✗ Failed to disconnect:', error.response?.data || error.message);
        process.exit(1);
    }
}

/**
 * Simulate OAuth callback (for testing)
 */
async function testCallback() {
    console.log('\n🔷 OAuth Callback Test\n');
    console.log('⚠️  This endpoint should be called by Google redirect, not manually.');
    console.log('Parameters required:');
    console.log('  - code: Authorization code from Google');
    console.log('  - state: Tenant ID');
    console.log('\nExample URL:');
    console.log(`${API_BASE_URL}/google-oauth/callback?code=4/0AY0e-g7X...&state=507f1f77bcf86cd799439011`);
}

// Main execution
const command = process.argv[2];

console.log('═══════════════════════════════════════════════════════');
console.log('  Google OAuth Flow Test');
console.log('═══════════════════════════════════════════════════════');

// Check if token is passed as argument
if (process.argv[3]) {
    authToken = process.argv[3];
}

switch (command) {
    case 'register':
        registerClient();
        break;
    case 'login':
        login();
        break;
    case 'connect':
        connectGoogle();
        break;
    case 'status':
        checkStatus();
        break;
    case 'disconnect':
        disconnect();
        break;
    case 'callback':
        testCallback();
        break;
    default:
        console.log('\nUsage: node test-google-oauth.js <command> [token]\n');
        console.log('Commands:');
        console.log('  register    - Register a new CLIENT_OWNER');
        console.log('  login       - Login existing user');
        console.log('  connect     - Get Google OAuth authorization URL');
        console.log('  status      - Check Google Business connection status');
        console.log('  disconnect  - Disconnect Google Business account');
        console.log('  callback    - Show callback endpoint info');
        console.log('\nExample:');
        console.log('  node test-google-oauth.js register');
        console.log('  node test-google-oauth.js connect <your_token>');
        console.log('  node test-google-oauth.js status <your_token>');
        console.log('\n═══════════════════════════════════════════════════════\n');
        process.exit(0);
}
