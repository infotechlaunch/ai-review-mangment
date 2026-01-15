/**
 * Simple Test Script - Get Client Data from Google Sheets
 * This demonstrates how to fetch client data without any authentication setup
 * 
 * Usage: node test-get-clients.js
 */

const axios = require('axios');
const csv = require('csv-parser');
const { Readable } = require('stream');

// Google Sheet configuration
const CLIENT_CONFIG_SHEET_ID = '1jUNZfIToj49xQu5n7_-Nludj-NnH--8xt4eJRXwLeeQ';
const GID = '0'; // First tab

async function getClientData() {
    try {
        console.log('\n📊 Fetching client data from Google Sheets...\n');

        // CSV export URL - no authentication needed!
        const csvUrl = `https://docs.google.com/spreadsheets/d/${CLIENT_CONFIG_SHEET_ID}/export?format=csv&gid=${GID}`;

        console.log(`URL: ${csvUrl}\n`);

        // Fetch the data
        const response = await axios.get(csvUrl, {
            responseType: 'text',
            timeout: 15000,
        });

        // Parse CSV to JSON
        const clients = [];
        const stream = Readable.from(response.data);

        await new Promise((resolve, reject) => {
            stream
                .pipe(csv())
                .on('data', (data) => clients.push(data))
                .on('end', resolve)
                .on('error', reject);
        });

        // Display results
        console.log(`✅ Successfully fetched ${clients.length} clients!\n`);

        if (clients.length > 0) {
            console.log('📋 Client Data:\n');
            console.log('='.repeat(80));

            clients.forEach((client, index) => {
                console.log(`\n${index + 1}. Client:`);
                console.log(`   Slug: ${client.slug || 'N/A'}`);
                console.log(`   Business Name: ${client.businessName || 'N/A'}`);
                console.log(`   Package Tier: ${client.packageTier || 'N/A'}`);
                console.log(`   Sheet Tab: ${client.sheetTab || 'N/A'}`);
                console.log(`   Wait For Approval: ${client.WaitForApproval || 'N/A'}`);
                console.log(`   Review URL: ${client.reviewURL || 'N/A'}`);
            });

            console.log('\n' + '='.repeat(80));
            console.log('\n📊 Full data (first client):');
            console.log(JSON.stringify(clients[0], null, 2));
        } else {
            console.log('⚠️  No clients found in the sheet.');
        }

    } catch (error) {
        console.error('\n❌ Error fetching client data:');

        if (error.response?.status === 403 || error.response?.status === 404) {
            console.error('\n🔒 Access Denied!');
            console.error('\nThe Google Sheet is not publicly accessible.');
            console.error('\n📝 To fix this:');
            console.error('1. Open: https://docs.google.com/spreadsheets/d/1jUNZfIToj49xQu5n7_-Nludj-NnH--8xt4eJRXwLeeQ/edit');
            console.error('2. Click "Share" button (top-right)');
            console.error('3. Click "Anyone with the link"');
            console.error('4. Set permission to "Viewer"');
            console.error('5. Click "Done"');
            console.error('6. Run this script again\n');
        } else {
            console.error(`\nError: ${error.message}`);
        }
    }
}

// Run the test
console.log('\n🚀 Testing Google Sheets CSV Export Method');
console.log('='.repeat(80));
getClientData();
