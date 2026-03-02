const { google } = require('googleapis');

/**
 * Service to append Onboarding Form Data to Google Sheets
 * Requires Google Service Account with Editor access to the specific sheet
 */
const appendClientConfigRow = async (data) => {
    try {
        const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
        const sheetId = process.env.CLIENT_CONFIG_SHEET_ID || process.env.GOOGLE_SHEET_ID || '1jUNZfIToj49xQu5n7_-Nludj-NnH--8xt4eJRXwLeeQ';

        if (!email || !privateKey || !sheetId) {
            console.log("⚠️ Google Sheets credentials not found in environment. Skipping sheet append.");
            return { success: false, message: 'Missing Google Sheets credentials in .env' };
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: email,
                // Replace escaped newlines with actual newlines for the private key
                private_key: privateKey.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        
        // Match the 27 columns of Client_Admin_Config_DO_NOT_EDIT
        const rowData = [
            data.slug || '',                      // 1. slug
            data.businessName || '',              // 2. businessName
            data.reviewURL || '',                 // 3. reviewURL
            data.fbPage || '',                    // 4. fbPage
            data.igHandle || '',                  // 5. igHandle
            data.whatsAppLink || '',              // 6. whatsAppLink
            data.packageTier || 'Basic',          // 7. packageTier
            '',                                   // 8. channelId
            data.slug || '',                      // 9. sheetTab (Often defaults to slug)
            data.gmbConnName || '',               // 10. gmbConnName
            data.fbConnName || '',                // 11. fbConnName
            data.igConnName || '',                // 12. igConnName
            data.placeId || '',                   // 13. placeId
            data.account_resource || '',          // 14. account_resource
            data.locationId || '',                // 15. locationId
            data.ReviewKey || '',                 // 16. ReviewKey
            data.gid || '',                       // 17. gid
            data.ScreenshotOneHTML || '',         // 18. ScreenshotOneHTML
            data.waitForApproval ? 'Yes' : 'No',  // 19. WaitForApproval
            'Yes',                                // 20. NoAutoPostNegRev
            data.socialPostSetup ? 'Yes' : 'No',  // 21. SocialPostSetup
            'Yes',                                // 22. BTM Enabled
            '2',                                  // 23. BTM Max Examples
            `acct_${data.slug || 'loc_cha'}`,     // 24. BTM Namespace
            data.businessType || 'Restaurant',    // 25. Business Type
            '',                                   // 26. Prompt for Business
            '0'                                   // 27. WaitTimeSetting (in min)
        ];

        // Use the actual sheet tab name from Google Sheets
        const sheetName = 'Client_Admin_Config';

        // Check if the business already exists in the spreadsheet
        const getResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:A` // Checking the 'slug' column
        });
        
        const rows = getResponse.data.values || [];
        let rowIndex = -1;
        
        // Find the index of the row matching data.slug
        for (let i = 0; i < rows.length; i++) {
            if (rows[i] && rows[i][0] === data.slug) {
                rowIndex = i + 1; // Google Sheets uses 1-based indexing for rows
                break;
            }
        }

        if (rowIndex !== -1) {
            // Update the existing row
            console.log(`🔄 Found existing config for slug ${data.slug} at row ${rowIndex}. Updating...`);
            const updateRange = `${sheetName}!A${rowIndex}:AA${rowIndex}`;
            
            await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: updateRange,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [rowData] },
            });
            console.log("✅ Business Config successfully updated in Google Sheets without making duplicates.");
            
        } else {
            // Append a new row if it doesn't exist
            console.log(`➕ No existing config found for slug ${data.slug}. Appending new row...`);
            const appendRange = `${sheetName}!A:AA`; 

            await sheets.spreadsheets.values.append({
                spreadsheetId: sheetId,
                range: appendRange,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [rowData] },
            });
            console.log("✅ Business Config appended to Google Sheets successfully.");
        }

        return { success: true };
    } catch (error) {
        console.error("❌ Error appending config to Google Sheets: ", error.message);
        return { success: false, message: error.message };
    }
};

module.exports = { appendClientConfigRow };
