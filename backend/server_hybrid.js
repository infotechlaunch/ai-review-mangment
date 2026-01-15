require('dotenv').config();
const express = require('express');
const cors = require('cors');

/**
 * AI Review Management System Backend
 * Hybrid Mode: Google Sheets + AI Features
 */

const app = express();
const PORT = process.env.PORT || 4000;
const USE_MONGODB = process.env.USE_MONGODB === 'true'; // Toggle between MongoDB and Google Sheets

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'AI Review Management API is running',
        mode: USE_MONGODB ? 'MongoDB' : 'Google Sheets',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

// API Routes
app.use('/api/auth', require('./src/routers/auth_route'));
app.use('/api/admin', require('./src/routers/admin_route_hybrid'));
app.use('/api/reviews', require('./src/routers/review_route_hybrid'));

// Legacy client routes (if needed)
if (!USE_MONGODB) {
    app.use('/api/client', require('./src/routers/client_route'));
}

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path,
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
});

// Start server
const startServer = async () => {
    try {
        // Connect to MongoDB if enabled
        if (USE_MONGODB) {
            const { connectDB } = require('./src/config/database');
            await connectDB();
        }

        // Start Express server
        app.listen(PORT, () => {
            console.log('');
            console.log('═══════════════════════════════════════════════════════');
            console.log('  AI Review Management System - Backend Server');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`  Server running on: http://localhost:${PORT}`);
            console.log(`  Mode: ${USE_MONGODB ? 'MongoDB' : 'Google Sheets (Hybrid)'}`);
            console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`  Health check: http://localhost:${PORT}/health`);
            console.log('═══════════════════════════════════════════════════════');
            console.log('');
            console.log('  Available Routes:');
            console.log('  - POST   /api/auth/login');
            console.log('  - GET    /api/auth/verify');
            console.log('  - GET    /api/admin/dashboard');
            console.log('  - GET    /api/admin/clients');
            console.log('  - GET    /api/reviews');
            console.log('  - GET    /api/reviews/stats');
            console.log('  - GET    /api/reviews/:reviewKey');
            console.log('  - POST   /api/reviews/:reviewKey/generate-reply');
            if (USE_MONGODB) {
                console.log('  - POST   /api/reviews/fetch');
                console.log('  - PUT    /api/reviews/:id/reply');
                console.log('  - POST   /api/reviews/:id/approve-reply');
            }
            console.log('═══════════════════════════════════════════════════════');
            console.log('');
            if (!USE_MONGODB) {
                console.log('  📝 Note: Running in Google Sheets mode');
                console.log('  ✨ AI reply generation enabled!');
                console.log('  ⚠️  Write operations to Google Sheets are read-only');
                console.log('  💡 Set USE_MONGODB=true in .env to enable full features');
                console.log('');
            }
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();

module.exports = app;
