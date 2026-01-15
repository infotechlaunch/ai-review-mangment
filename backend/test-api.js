/**
 * Quick Test Script for AI Review Management API
 * This script tests the basic functionality of the API
 * 
 * Usage: node test-api.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';
let adminToken = '';
let clientToken = '';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

const log = {
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
};

async function testHealthCheck() {
    log.section('Testing Health Check...');
    try {
        const response = await axios.get(`${BASE_URL}/`);
        log.success('Health check passed');
        console.log('Response:', response.data);
        return true;
    } catch (error) {
        log.error(`Health check failed: ${error.message}`);
        return false;
    }
}

async function testAdminLogin() {
    log.section('Testing Admin Login...');
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@reviewmgnt.com',
            password: 'admin@2024',
        });

        if (response.data.success && response.data.token) {
            adminToken = response.data.token;
            log.success('Admin login successful');
            log.info(`Token: ${adminToken.substring(0, 20)}...`);
            return true;
        } else {
            log.error('Admin login failed: No token received');
            return false;
        }
    } catch (error) {
        log.error(`Admin login failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testClientLogin() {
    log.section('Testing Client Login...');
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'client1',
            password: 'client123',
        });

        if (response.data.success && response.data.token) {
            clientToken = response.data.token;
            log.success('Client login successful');
            log.info(`Token: ${clientToken.substring(0, 20)}...`);
            log.info(`Slug: ${response.data.slug}`);
            return true;
        } else {
            log.error('Client login failed: No token received');
            return false;
        }
    } catch (error) {
        log.error(`Client login failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testAdminDashboard() {
    log.section('Testing Admin Dashboard...');
    try {
        const response = await axios.get(`${BASE_URL}/api/admin/dashboard`, {
            headers: {
                Authorization: `Bearer ${adminToken}`,
            },
        });

        if (response.data.success) {
            log.success(`Admin dashboard loaded: ${response.data.totalClients} clients found`);
            if (response.data.data && response.data.data.length > 0) {
                log.info(`First client: ${response.data.data[0].businessName || response.data.data[0].slug}`);
            }
            return true;
        } else {
            log.error('Admin dashboard failed');
            return false;
        }
    } catch (error) {
        log.error(`Admin dashboard failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testAdminReviews() {
    log.section('Testing Admin Reviews...');
    try {
        const response = await axios.get(`${BASE_URL}/api/admin/reviews`, {
            headers: {
                Authorization: `Bearer ${adminToken}`,
            },
        });

        if (response.data.success) {
            log.success(`Admin reviews loaded: ${response.data.totalReviews} reviews found`);
            log.info(`Clients processed: ${response.data.clientsProcessed}`);
            return true;
        } else {
            log.error('Admin reviews failed');
            return false;
        }
    } catch (error) {
        log.error(`Admin reviews failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testClientDashboard() {
    log.section('Testing Client Dashboard...');
    try {
        const response = await axios.get(`${BASE_URL}/api/client/dashboard`, {
            headers: {
                Authorization: `Bearer ${clientToken}`,
            },
        });

        if (response.data.success) {
            log.success(`Client dashboard loaded`);
            log.info(`Business: ${response.data.data.businessName}`);
            log.info(`Slug: ${response.data.data.slug}`);
            return true;
        } else {
            log.error('Client dashboard failed');
            return false;
        }
    } catch (error) {
        log.error(`Client dashboard failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testClientReviews() {
    log.section('Testing Client Reviews...');
    try {
        const response = await axios.get(`${BASE_URL}/api/client/reviews`, {
            headers: {
                Authorization: `Bearer ${clientToken}`,
            },
        });

        if (response.data.success) {
            log.success(`Client reviews loaded: ${response.data.totalReviews} reviews found`);
            return true;
        } else {
            log.error('Client reviews failed');
            return false;
        }
    } catch (error) {
        log.error(`Client reviews failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function runAllTests() {
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}AI Review Management API - Test Suite${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

    log.info(`Testing API at: ${BASE_URL}`);
    log.info('Make sure the server is running (npm run dev)\n');

    const results = {
        passed: 0,
        failed: 0,
    };

    // Run tests
    const tests = [
        { name: 'Health Check', fn: testHealthCheck },
        { name: 'Admin Login', fn: testAdminLogin },
        { name: 'Admin Dashboard', fn: testAdminDashboard },
        { name: 'Admin Reviews', fn: testAdminReviews },
        { name: 'Client Login', fn: testClientLogin },
        { name: 'Client Dashboard', fn: testClientDashboard },
        { name: 'Client Reviews', fn: testClientReviews },
    ];

    for (const test of tests) {
        const result = await test.fn();
        if (result) {
            results.passed++;
        } else {
            results.failed++;
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
    }

    // Summary
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}Test Summary${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

    console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
    console.log(`Total: ${results.passed + results.failed}\n`);

    if (results.failed === 0) {
        log.success('All tests passed! 🎉');
    } else {
        log.error(`${results.failed} test(s) failed. Check the output above for details.`);
    }
}

// Run tests
runAllTests().catch(error => {
    log.error(`Test suite failed: ${error.message}`);
    process.exit(1);
});
