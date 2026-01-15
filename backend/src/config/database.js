const mongoose = require('mongoose');
require('dotenv').config();

/**
 * MongoDB Database Configuration
 * Handles connection to MongoDB database
 */

const connectDB = async () => {
    try {
        const mongoURI =
            process.env.mongoURI || 'mongodb://127.0.0.1:27017/ai-review-management';

        // Connect to MongoDB (Mongoose v7+ compatible)
        const conn = await mongoose.connect(mongoURI);

        console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
        console.log(`✓ Database: ${conn.connection.name}`);

        // Connection event listeners
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed due to app termination');
                process.exit(0);
            } catch (err) {
                console.error('Error during MongoDB shutdown:', err);
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = { connectDB };
