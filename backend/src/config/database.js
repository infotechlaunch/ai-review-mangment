const { Sequelize } = require('sequelize');


require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // required for Neon
    },
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ PostgreSQL Connected (Neon Production)');

    // ⚠️ Avoid in production (can break data)
    await sequelize.sync({ alter: true });

    console.log('✓ Database Synced');
  } catch (error) {
    console.error('✗ PostgreSQL connection error:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };