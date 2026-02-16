const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'ai_review_mgnt',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false, // set to console.log if you want SQL logs
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ PostgreSQL Connected (localhost)');

    // DEV only — use migrations in production
    await sequelize.sync({ alter: true });
    console.log('✓ Database Synced');
  } catch (error) {
    console.error('✗ PostgreSQL connection error:', error.message);
    if (error.name === 'SequelizeConnectionError') {
      console.error('----------------------------------------------------');
      console.error('Failed to connect to the database. Please check your credentials.');
      console.error(`Host: ${process.env.DB_HOST}`);
      console.error(`User: ${process.env.DB_USER}`);
      console.error(`Database: ${process.env.DB_NAME}`);
      console.error('----------------------------------------------------');
    }
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
