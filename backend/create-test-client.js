/**
 * Create a test client user for Google Sheets mode
 */

require('dotenv').config();
const { connectDB } = require('./src/config/database');
const User = require('./src/models/User');
const Tenant = require('./src/models/Tenant');

async function createTestClient() {
    try {
        await connectDB();

        // Check if tenant exists for Joy's Biryani
        let tenant = await Tenant.findOne({ slug: 'joys_biryani_n_kababs_pineville_28134' });

        if (!tenant) {
            console.log('Creating tenant for Joy\'s Biryani...');
            tenant = await Tenant.create({
                name: 'Joy\'s Biryani n Kababs',
                slug: 'joys_biryani_n_kababs_pineville_28134',
                businessName: 'Joy\'s Biryani n Kababs',
                contactEmail: 'contact@joysbiryani.com',
                isActive: true
            });
            console.log('✅ Tenant created');
        } else {
            console.log('✅ Tenant already exists');
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: 'client@joysbiryani.com' });

        if (existingUser) {
            console.log('✅ Client user already exists');
            console.log('Email:', existingUser.email);
            console.log('Password: client123');
            process.exit(0);
        }

        // Create client user
        console.log('Creating client user...');
        const user = await User.create({
            email: 'client@joysbiryani.com',
            password: 'client123',
            firstName: 'Joy',
            lastName: 'Biryani',
            role: 'CLIENT_OWNER',
            tenant: tenant._id,
            isActive: true
        });

        console.log('\n✅ Test client user created successfully!');
        console.log('═══════════════════════════════════════');
        console.log('Email:', user.email);
        console.log('Password: client123');
        console.log('Role:', user.role);
        console.log('Tenant:', tenant.name);
        console.log('Slug:', tenant.slug);
        console.log('═══════════════════════════════════════\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error creating test client:', error.message);
        process.exit(1);
    }
}

createTestClient();
