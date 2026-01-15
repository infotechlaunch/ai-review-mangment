const axios = require('axios');
const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * Google Sheets Configuration - NO SERVICE ACCOUNT REQUIRED
 * Uses public CSV export URLs to read data from Google Sheets
 * Sheets must be set to "Anyone with the link can view"
 */

// Google Sheet IDs
const CLIENT_CONFIG_SHEET_ID = process.env.CLIENT_CONFIG_SHEET_ID || '1jUNZfIToj49xQu5n7_-Nludj-NnH--8xt4eJRXwLeeQ';
const REVIEW_TRACKER_SHEET_ID = process.env.REVIEW_TRACKER_SHEET_ID || '1DfVmxHToJwT2jlVFJeZHpalIaYN4MIoPXIRIA3p8Ocg';

// Sheet tab names
const CLIENT_CONFIG_TAB = 'Client_Admin_Config_DO_NOT_EDIT';
const REVIEW_TRACKER_TAB = 'AllClientsReviewTracker_DO_NOT_EDIT';

/**
 * Get GID (sheet tab ID) from sheet name
 * For the main/first tab, GID is usually 0
 * You can find GID in the URL when viewing a specific tab
 */
const SHEET_GIDS = {
    [CLIENT_CONFIG_TAB]: '0', // Default first tab
    // Add more tab GIDs here as needed
    // Example: 'Client1_Reviews': '123456789'
};

/**
 * Read data from Google Sheets using CSV export (no authentication required)
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {string} sheetName - The name of the sheet tab
 * @param {string} gid - The GID of the sheet tab (optional, defaults to 0)
 * @returns {Promise<Array>} Array of row objects
 */
const readSheetAsCSV = async (spreadsheetId, sheetName, gid = '0') => {
    try {
        // CSV export URL format for public Google Sheets
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

        console.log(`Fetching data from: ${sheetName} (GID: ${gid})`);

        // Fetch CSV data
        const response = await axios.get(csvUrl, {
            responseType: 'text',
            timeout: 15000, // 15 seconds timeout
        });

        // Parse CSV to JSON
        const results = [];
        const stream = Readable.from(response.data);

        await new Promise((resolve, reject) => {
            stream
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', resolve)
                .on('error', reject);
        });

        console.log(`✓ Successfully fetched ${results.length} rows from ${sheetName}`);
        return results;
    } catch (error) {
        console.error(`Error reading sheet ${sheetName}:`, error.message);

        if (error.response?.status === 403 || error.response?.status === 404) {
            throw new Error(
                `Cannot access Google Sheet. Please ensure the sheet is set to "Anyone with the link can view" in sharing settings.`
            );
        }

        throw new Error(`Failed to read sheet ${sheetName}: ${error.message}`);
    }
};

/**
 * Read data from Google Sheets (wrapper for backward compatibility)
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {string} range - The sheet name or range (e.g., "Sheet1" or "Sheet1!A:Z")
 * @returns {Promise<Array>} Array of rows (first row is headers)
 */
const readSheet = async (spreadsheetId, range) => {
    try {
        // Extract sheet name from range (e.g., "Sheet1!A:Z" -> "Sheet1")
        const sheetName = range.split('!')[0];

        // Get GID for this sheet (default to 0)
        const gid = SHEET_GIDS[sheetName] || '0';

        // Read as CSV
        const data = await readSheetAsCSV(spreadsheetId, sheetName, gid);

        // Convert to array format (with headers as first row)
        if (data.length === 0) {
            return [];
        }

        const headers = Object.keys(data[0]);
        const rows = [headers];

        data.forEach(row => {
            const rowArray = headers.map(header => row[header] || '');
            rows.push(rowArray);
        });

        return rows;
    } catch (error) {
        console.error(`Error in readSheet:`, error.message);
        throw error;
    }
};

/**
 * Update data in Google Sheets
 * NOTE: CSV export is READ-ONLY. For write operations, we need to use Google Sheets API
 * This is a placeholder that will throw an error
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {string} range - The A1 notation range to update
 * @param {Array} values - 2D array of values to write
 * @returns {Promise<object>} Update response
 */
const updateSheet = async (spreadsheetId, range, values) => {
    throw new Error(
        'Write operations are not supported with CSV export method. ' +
        'To enable write operations, you need to set up Google Sheets API with service account. ' +
        'See SETUP_GUIDE.md for instructions.'
    );
};

/**
 * Convert rows to JSON objects using headers
 * @param {Array} rows - Array of rows from Google Sheets
 * @returns {Array} Array of objects
 */
const rowsToJson = (rows) => {
    if (!rows || rows.length === 0) return [];

    const headers = rows[0];
    return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] || '';
        });
        return obj;
    });
};

/**
 * Read sheet directly as JSON objects (simplified method)
 * @param {string} spreadsheetId - The ID of the spreadsheet
 * @param {string} sheetName - The name of the sheet tab
 * @param {string} gid - The GID of the sheet tab (optional)
 * @returns {Promise<Array>} Array of objects
 */
const readSheetAsJSON = async (spreadsheetId, sheetName, gid = '0') => {
    return await readSheetAsCSV(spreadsheetId, sheetName, gid);
};

module.exports = {
    readSheet,
    readSheetAsCSV,
    readSheetAsJSON,
    updateSheet,
    rowsToJson,
    CLIENT_CONFIG_SHEET_ID,
    REVIEW_TRACKER_SHEET_ID,
    CLIENT_CONFIG_TAB,
    REVIEW_TRACKER_TAB,
    SHEET_GIDS,
};
