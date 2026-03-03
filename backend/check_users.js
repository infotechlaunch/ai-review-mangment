const User = require('./src/models/User');
const { sequelize } = require('./src/config/database');

async function checkUsers() {
    try {
        const users = await User.findAll({ attributes: ['email', 'role', 'isActive'] });
        console.log('Total Users:', users.length);
        console.log('Users list:', JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Error fetching users:', err);
        process.exit(1);
    }
}

checkUsers();
