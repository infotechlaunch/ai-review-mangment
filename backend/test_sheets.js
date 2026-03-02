require('dotenv').config();
const { appendClientConfigRow } = require('./src/services/googleSheetsWrite');

async function runTest() {
    console.log("Starting test to append dummy data to Google Sheets...");
    
    const dummyData = {
        slug: 'test_demo_business_123',
        businessName: 'Demo Test Business LLC',
        industry: 'Test Industry',
        reviewURL: 'https://g.page/test-demo-business',
        fbPage: 'https://facebook.com/testdemobusiness',
        igHandle: '@testdemobusiness',
        whatsAppLink: 'https://wa.me/19999999999',
        packageTier: 'Pro',
        waitForApproval: true,
        socialPostSetup: true,
        businessType: 'Cafe'
    };

    try {
        const result = await appendClientConfigRow(dummyData);
        if (result.success) {
            console.log("✅ Custom test script completed: Row successfully appended!");
        } else {
            console.error("❌ Test failed:", result.message);
        }
    } catch (err) {
        console.error("❌ Unexpected error:", err);
    }
}

runTest();
