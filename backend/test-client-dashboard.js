/**
 * Test Client Dashboard API
 * This script demonstrates how to get client dashboard data
 * 
 * Usage: node test-client-dashboard.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

// ANSI color codes for better output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

async function testClientDashboard() {
    console.log(`\n${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.cyan}Testing Client Dashboard API${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);

    try {
        // Step 1: Login as a client
        console.log(`${colors.blue}Step 1: Login as Client${colors.reset}\n`);

        // You need to replace this with an actual client slug from your Google Sheet
        const clientSlug = 'client1'; // Change this to match a slug in your sheet
        const clientPassword = 'client123'; // Default password

        console.log(`Attempting to login with:`);
        console.log(`  Email/Slug: ${clientSlug}`);
        console.log(`  Password: ${clientPassword}\n`);

        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: clientSlug,
            password: clientPassword,
        });

        if (!loginResponse.data.success) {
            console.log(`${colors.red}✗ Login failed${colors.reset}`);
            console.log(`Response:`, loginResponse.data);
            return;
        }

        const token = loginResponse.data.token;
        const clientInfo = loginResponse.data;

        console.log(`${colors.green}✓ Login successful!${colors.reset}`);
        console.log(`  Role: ${clientInfo.role}`);
        console.log(`  Slug: ${clientInfo.slug}`);
        console.log(`  Business Name: ${clientInfo.businessName}`);
        console.log(`  Token: ${token.substring(0, 30)}...`);

        // Step 2: Get Client Dashboard
        console.log(`\n${colors.blue}Step 2: Get Client Dashboard Data${colors.reset}\n`);

        const dashboardResponse = await axios.get(`${BASE_URL}/api/client/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!dashboardResponse.data.success) {
            console.log(`${colors.red}✗ Failed to get dashboard data${colors.reset}`);
            console.log(`Response:`, dashboardResponse.data);
            return;
        }

        const clientData = dashboardResponse.data.data;

        console.log(`${colors.green}✓ Successfully fetched client dashboard!${colors.reset}\n`);

        // Display the data in a nice format
        console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}`);
        console.log(`${colors.cyan}Client Dashboard Data${colors.reset}`);
        console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);

        console.log(`${colors.magenta}Basic Information:${colors.reset}`);
        console.log(`  Slug: ${clientData.slug || 'N/A'}`);
        console.log(`  Business Name: ${clientData.businessName || 'N/A'}`);
        console.log(`  Package Tier: ${clientData.packageTier || 'N/A'}`);
        console.log(`  Sheet Tab: ${clientData.sheetTab || 'N/A'}`);

        console.log(`\n${colors.magenta}Configuration:${colors.reset}`);
        console.log(`  Wait For Approval: ${clientData.WaitForApproval || 'N/A'}`);
        console.log(`  No Auto Post Negative Reviews: ${clientData.NoAutoPostNegRev || 'N/A'}`);
        console.log(`  Social Post Setup: ${clientData.SocialPostSetup || 'N/A'}`);
        console.log(`  BTM Enabled: ${clientData['BTM Enabled'] || 'N/A'}`);
        console.log(`  Business Type: ${clientData['Business Type'] || 'N/A'}`);

        console.log(`\n${colors.magenta}Links & IDs:${colors.reset}`);
        console.log(`  Review URL: ${clientData.reviewURL || 'N/A'}`);
        console.log(`  Facebook Page: ${clientData.fbPage || 'N/A'}`);
        console.log(`  Instagram Handle: ${clientData.igHandle || 'N/A'}`);
        console.log(`  WhatsApp Link: ${clientData.whatsAppLink || 'N/A'}`);
        console.log(`  Place ID: ${clientData.placeId || 'N/A'}`);
        console.log(`  Location ID: ${clientData.locationId || 'N/A'}`);
        console.log(`  Account Resource: ${clientData.account_resource || 'N/A'}`);

        console.log(`\n${colors.cyan}${'='.repeat(80)}${colors.reset}`);
        console.log(`${colors.cyan}Complete JSON Response:${colors.reset}`);
        console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
        console.log(JSON.stringify(dashboardResponse.data, null, 2));

        console.log(`\n${colors.green}${'='.repeat(80)}${colors.reset}`);
        console.log(`${colors.green}✓ Test completed successfully!${colors.reset}`);
        console.log(`${colors.green}${'='.repeat(80)}${colors.reset}\n`);

    } catch (error) {
        console.log(`\n${colors.red}${'='.repeat(80)}${colors.reset}`);
        console.log(`${colors.red}✗ Error occurred${colors.reset}`);
        console.log(`${colors.red}${'='.repeat(80)}${colors.reset}\n`);

        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Message: ${error.response.data?.message || 'Unknown error'}`);
            console.log(`\nFull response:`);
            console.log(JSON.stringify(error.response.data, null, 2));
        } else if (error.code === 'ECONNREFUSED') {
            console.log(`${colors.yellow}⚠ Cannot connect to server${colors.reset}`);
            console.log(`\nMake sure the server is running:`);
            console.log(`  ${colors.cyan}npm run dev${colors.reset}\n`);
        } else {
            console.log(`Error: ${error.message}`);
        }
    }
}

// Instructions
console.log(`\n${colors.yellow}📝 Before running this test:${colors.reset}`);
console.log(`\n1. Make sure the server is running:`);
console.log(`   ${colors.cyan}npm run dev${colors.reset}`);
console.log(`\n2. Update the client credentials in this file (lines 23-24):`);
console.log(`   - clientSlug: Use a slug from your Google Sheet`);
console.log(`   - clientPassword: Default is 'client123'`);
console.log(`\n3. Make sure your Google Sheets are publicly accessible\n`);

// Run the test
testClientDashboard();
