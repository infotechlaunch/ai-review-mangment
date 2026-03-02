const { sequelize } = require('./src/config/database');
const Location = require('./src/models/Location');

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Connected');
        
        // Find existing location
        let location = await Location.findOne({ where: { slug: 'sweats123' } });
        if(location) {
             location.googlePlaceId = 'ChIJOW6f8wclJzoRMyn7Cz98L5Q';
             await location.save();
             console.log('Saved');
        } else {
             console.log('Not found');
        }
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();
