/**
 * Seed Test Reviews
 * Creates test location and reviews for API testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./src/config/database');
const Tenant = require('./src/models/Tenant');
const Location = require('./src/models/Location');
const Review = require('./src/models/Review');

async function seedTestData() {
    try {
        console.log('🌱 Seeding test review data...\n');

        await connectDB();

        // Find the demo tenant
        const tenant = await Tenant.findOne({ slug: 'demo-business' });
        if (!tenant) {
            console.error('❌ Demo tenant not found. Run "npm run seed" first.');
            process.exit(1);
        }

        console.log(`✓ Using tenant: ${tenant.businessName}`);

        // Create or find test location
        let location = await Location.findOne({ tenant: tenant._id });

        if (!location) {
            location = await Location.create({
                tenant: tenant._id,
                name: 'Demo Business Main Location',
                slug: 'demo-business-main',
                googleLocationId: 'locations/demo-business-main-12345',
                address: '123 Main Street, Springfield, IL 62701',
                phone: '+1-555-0123',
                website: 'https://demo-business.com',
                isActive: true,
            });
            console.log(`✓ Created location: ${location.name}`);
        } else {
            console.log(`✓ Using existing location: ${location.name}`);
        }

        // Create test reviews
        const existingReviews = await Review.countDocuments({ location: location._id });

        if (existingReviews > 0) {
            console.log(`✓ Found ${existingReviews} existing reviews`);
            console.log('  Skipping review creation (reviews already exist)');
        } else {
            const testReviews = [
                {
                    tenant: tenant._id,
                    location: location._id,
                    google_review_id: `test-review-${Date.now()}-1`,
                    reviewer_name: 'John Smith',
                    rating: 5,
                    review_text: 'Excellent service! The team was professional and delivered exactly what we needed. Highly recommended!',
                    review_created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
                    has_reply: false,
                    posted_to_google: false,
                },
                {
                    tenant: tenant._id,
                    location: location._id,
                    google_review_id: `test-review-${Date.now()}-2`,
                    reviewer_name: 'Sarah Johnson',
                    rating: 4,
                    review_text: 'Great experience overall. The service was good but there was a small delay in delivery.',
                    review_created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                    has_reply: false,
                    posted_to_google: false,
                },
                {
                    tenant: tenant._id,
                    location: location._id,
                    google_review_id: `test-review-${Date.now()}-3`,
                    reviewer_name: 'Michael Brown',
                    rating: 5,
                    review_text: 'Amazing! This is the best service I have ever used. Will definitely come back!',
                    review_created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
                    has_reply: false,
                    posted_to_google: false,
                },
                {
                    tenant: tenant._id,
                    location: location._id,
                    google_review_id: `test-review-${Date.now()}-4`,
                    reviewer_name: 'Emily Davis',
                    rating: 3,
                    review_text: 'The service was okay. It met expectations but nothing extraordinary.',
                    review_created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                    has_reply: false,
                    posted_to_google: false,
                },
                {
                    tenant: tenant._id,
                    location: location._id,
                    google_review_id: `test-review-${Date.now()}-5`,
                    reviewer_name: 'David Wilson',
                    rating: 5,
                    review_text: 'Fantastic! The attention to detail and customer service was outstanding.',
                    review_created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
                    has_reply: false,
                    posted_to_google: false,
                },
            ];

            await Review.insertMany(testReviews);
            console.log(`✓ Created ${testReviews.length} test reviews`);
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('  Test Data Seeding Complete!');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`  Tenant: ${tenant.businessName}`);
        console.log(`  Location: ${location.name}`);
        console.log(`  Location ID: ${location._id}`);
        console.log(`  Total Reviews: ${await Review.countDocuments({ location: location._id })}`);
        console.log('═══════════════════════════════════════════════════════\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding test data:', error);
        process.exit(1);
    }
}

seedTestData();
