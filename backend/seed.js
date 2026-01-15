require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Tenant = require('./src/models/Tenant');
const { connectDB } = require('./src/config/database');

/**
 * Database Seeder
 * Creates initial admin user and sample tenant for testing
 */

const seedDatabase = async () => {
    try {
        console.log('🌱 Starting database seeding...\n');

        // Connect to MongoDB
        await connectDB();

        // Create Admin User
        console.log('Creating admin user...');
        const adminExists = await User.findOne({ email: 'admin@reviewmgnt.com' });

        if (!adminExists) {
            await User.create({
                email: 'admin@reviewmgnt.com',
                password: 'admin@2024',
                role: 'ADMIN',
                firstName: 'Admin',
                lastName: 'User',
                isActive: true,
            });
            console.log('✓ Admin user created: admin@reviewmgnt.com / admin@2024\n');
        } else {
            console.log('✓ Admin user already exists\n');
        }

        // Create Sample Tenant
        console.log('Creating sample tenant...');
        const tenantExists = await Tenant.findOne({ slug: 'demo-business' });

        if (!tenantExists) {
            const tenant = await Tenant.create({
                name: 'Demo Business',
                slug: 'demo-business',
                businessName: 'Demo Business Inc.',
                isActive: true,
            });
            console.log('✓ Sample tenant created: demo-business\n');

            // Create Client Owner for the tenant
            console.log('Creating client owner...');
            await User.create({
                email: 'owner@demo-business.com',
                password: 'demo123',
                role: 'CLIENT_OWNER',
                tenant: tenant._id,
                firstName: 'John',
                lastName: 'Doe',
                isActive: true,
            });
            console.log('✓ Client owner created: owner@demo-business.com / demo123\n');

            // Create Staff User for the tenant
            console.log('Creating staff user...');
            await User.create({
                email: 'staff@demo-business.com',
                password: 'staff123',
                role: 'STAFF',
                tenant: tenant._id,
                firstName: 'Jane',
                lastName: 'Smith',
                isActive: true,
            });
            console.log('✓ Staff user created: staff@demo-business.com / staff123\n');

        } else {
            console.log('✓ Sample tenant already exists\n');
        }

        console.log('═══════════════════════════════════════════════════════');
        console.log('  Database Seeding Complete!');
        console.log('═══════════════════════════════════════════════════════');
        console.log('\n  Test Credentials:');
        console.log('  ─────────────────────────────────────────────────────');
        console.log('  Admin:');
        console.log('    Email: admin@reviewmgnt.com');
        console.log('    Password: admin@2024');
        console.log('');
        console.log('  Client Owner:');
        console.log('    Email: owner@demo-business.com');
        console.log('    Password: demo123');
        console.log('');
        console.log('  Staff:');
        console.log('    Email: staff@demo-business.com');
        console.log('    Password: staff123');
        console.log('═══════════════════════════════════════════════════════\n');

        process.exit(0);

    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

// Run seeder
seedDatabase();
