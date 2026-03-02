require('dotenv').config();
const { sequelize } = require('./src/config/database');
const Tenant = require('./src/models/Tenant');
const Location = require('./src/models/Location');
const axios = require('axios');

async function verifyBackend() {
    console.log('🚀 --- Backend Health Check ---');
    
    // 1. DB Connection
    try {
        await sequelize.authenticate();
        console.log('✅ Database: Connected');
    } catch (err) {
        console.error('❌ Database: Connection failed!', err.message);
    }
    
    // 2. Environment Variables
    const requiredVars = [
        'GOOGLE_MAPS_API_KEY',
        'OPENAI_API_KEY',
        'DATABASE_URL',
        'JWT_SECRET'
    ];
    
    requiredVars.forEach(v => {
        if (process.env[v]) {
            console.log(`✅ Env: ${v} is set`);
        } else {
            console.error(`❌ Env: ${v} is MISSING!`);
        }
    });
    
    // 3. Google Places API Key Check
    if (process.env.GOOGLE_MAPS_API_KEY) {
        try {
            const testPlaceId = 'ChIJN1t_tDeuEmsRUte9raV_iD4'; // Sydney
            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${testPlaceId}&fields=name&key=${apiKey}`;
            const res = await axios.get(url);
            
            if (res.data.status === 'OK') {
                console.log('✅ Google API Key: Valid (Places API enabled)');
            } else {
                console.error('❌ Google API Key: Status is', res.data.status, '-', res.data.error_message || 'Check your Google Cloud console');
            }
        } catch (err) {
            console.error('❌ Google API Key: Request failed!', err.message);
        }
    }
    
    // 4. Check for Tenant & Location
    try {
        const tenantCount = await Tenant.count();
        const locCount = await Location.count();
        console.log(`✅ Data: Found ${tenantCount} Tenants and ${locCount} Locations`);
        
        if (locCount === 0) {
            console.warn('⚠️ Warning: No Locations found. You must connect a Google account or add a Place ID in Settings.');
        }
    } catch (err) {
        console.error('❌ Data: Failed to query database', err.message);
    }
    
    console.log('----------------------------');
    console.log('Done.');
    process.exit(0);
}

verifyBackend();
