require('dotenv').config();
const express = require('express');
const cors = require('cors');

/**
 * AI Review Management System Backend
 * Database: PostgreSQL (via Sequelize)
 */

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {

    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'AI Review Management API is running',
        database: 'PostgreSQL',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

// API Routes
app.use('/api/auth', require('./src/routers/auth_route'));
app.use('/api/google-oauth', require('./src/routers/google_oauth_route'));

// Admin Routes
app.use('/api/admin', require('./src/routers/admin_route'));

// Monitoring Routes (quota, health, etc.)
app.use('/api/monitor', require('./src/routers/monitor_route'));

// Review Routes
app.use('/api/reviews', require('./src/routers/review_route'));
// File name kept for path consistency, content is Postgres

// 🔧 DEV ONLY: Clear Google quota cooldown
if (process.env.NODE_ENV !== 'production') {
    app.post('/api/dev/clear-google-cooldown', (req, res) => {
        try {
            const { quotaCooldowns } = require('./src/controller/google_oauth_controller');
            const size = quotaCooldowns.size;
            quotaCooldowns.clear();
            console.log(`✅ Cleared ${size} quota cooldown(s)`);
            res.json({
                success: true,
                message: `Cooldown cleared. ${size} tenant(s) unblocked.`,
                clearedCount: size
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to clear cooldown',
                error: error.message
            });
        }
    });
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
        // Connect to Database
        const { connectDB } = require('./src/config/database');
        await connectDB();

        // Start Express server
        app.listen(PORT, () => {
            console.log("Server listening on Port", PORT);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();

module.exports = app;
