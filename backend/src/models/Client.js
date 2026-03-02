const {
    readSheet,
    readSheetAsJSON,
    rowsToJson,
    CLIENT_CONFIG_SHEET_ID,
    CLIENT_CONFIG_TAB,
} = require('../config/googleSheets');

/**
 * Client Configuration Model
 * Handles all operations related to Client_Admin_Config_DO_NOT_EDIT sheet
 * 
 * NOTE: Using CSV export method (read-only)
 * For write operations, you need to set up Google Sheets API with service account
 */

// Simple in-memory cache
let clientsCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all clients from Client_Admin_Config sheet
 * @returns {Promise<Array>} Array of client configuration objects
 */
const getAllClients = async (forceRefresh = false) => {
    try {
        const now = Date.now();
        if (clientsCache && !forceRefresh && (now - lastFetchTime < CACHE_DURATION)) {
            // console.log('  ⚡ Returning cached client config');
            return clientsCache;
        }

        // Using CSV export - simpler, no authentication needed
        const clients = await readSheetAsJSON(CLIENT_CONFIG_SHEET_ID, CLIENT_CONFIG_TAB, '0');

        console.log(`✓ Fetched ${clients.length} clients from Client_Admin_Config`);
        clientsCache = clients;
        lastFetchTime = now;
        return clients;
    } catch (error) {
        console.error('Error fetching all clients:', error.message);
        if (clientsCache) {
             console.warn('  ⚠️ Returning stale cache due to fetch error');
             return clientsCache;
        }
        throw new Error('Failed to fetch client configurations. Ensure the Google Sheet is publicly accessible.');
    }
};

/**
 * Get client by slug
 * @param {string} slug - Client slug identifier
 * @returns {Promise<object|null>} Client configuration object or null if not found
 */
const getClientBySlug = async (slug) => {
    try {
        const clients = await getAllClients();
        const client = clients.find(c => c.slug === slug);

        if (!client) {
            console.log(`Client with slug "${slug}" not found`);
        }

        return client || null;
    } catch (error) {
        console.error(`Error fetching client by slug ${slug}:`, error.message);
        throw error;
    }
};

/**
 * Get client by credentials (for login validation)
 * @param {string} identifier - Email, username, or slug
 * @returns {Promise<object|null>} Client configuration object or null if not found
 */
const getClientByIdentifier = async (identifier) => {
    try {
        const clients = await getAllClients();

        // Try to match by slug, businessName, or any email-like field
        const client = clients.find(c =>
            c.slug?.toLowerCase() === identifier.toLowerCase() ||
            c.businessName?.toLowerCase() === identifier.toLowerCase() ||
            c.email?.toLowerCase() === identifier.toLowerCase()
        );

        if (!client) {
            console.log(`Client with identifier "${identifier}" not found`);
        }

        return client || null;
    } catch (error) {
        console.error(`Error fetching client by identifier ${identifier}:`, error.message);
        throw error;
    }
};

/**
 * Update client configuration
 * NOTE: This requires Google Sheets API with write permissions
 * With CSV export method, this will throw an error
 * 
 * @param {string} slug - Client slug
 * @param {object} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
const updateClientConfig = async (slug, updates) => {
    throw new Error(
        'Update operations are not supported with CSV export method (read-only). ' +
        'To enable write operations, you need to set up Google Sheets API with service account. ' +
        'See SETUP_GUIDE.md for instructions.'
    );
};

module.exports = {
    getAllClients,
    getClientBySlug,
    getClientByIdentifier,
    updateClientConfig,
};
