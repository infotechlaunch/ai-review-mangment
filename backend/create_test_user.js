const User = require('./src/models/User');
const { sequelize } = require('./src/config/database');

async function createUser() {
    try {
        await sequelize.authenticate();
        
        // Create a test user
        const [user, created] = await User.findOrCreate({
            where: { email: 'test@example.com' },
            defaults: {
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
                role: 'CLIENT_OWNER',
                isActive: true
            }
        });

        if (created) {
            console.log('✅ Created test user: test@example.com / password123');
        } else {
            // Update password just in case it was different
            user.password = 'password123';
            await user.save();
            console.log('✅ Updated existing test user password to: password123');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error creating user:', err);
        process.exit(1);
    }
}

createUser();
