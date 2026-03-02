const { fetchReviewsFromPlaces } = require('./src/controller/review_controller');
const { sequelize } = require('./src/config/database');

async function test() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected');
        
        // Mock req/res
        const req = {
            body: { locationId: null },
            user: {
                userId: 'some-id',
                role: 'CLIENT_OWNER',
                slug: 'umesh_travels_raigarh_496001',
                tenant: 'some-tenant-id' // We might need a real one from DB
            }
        };
        
        // Find a real user/tenant for better test
        const Tenant = require('./src/models/Tenant');
        const tenant = await Tenant.findOne({ where: { slug: 'umesh_travels_raigarh_496001' } });
        if (tenant) {
            req.user.tenant = tenant.id;
            req.user.tenantId = tenant.id;
            req.user.tenantSlug = tenant.slug;
        }

        const res = {
            status: function(s) { this.statusCode = s; return this; },
            json: function(j) { console.log('Response:', JSON.stringify(j, null, 2)); return this; },
            headersSent: false
        };

        console.log('Calling fetchReviewsFromPlaces...');
        await fetchReviewsFromPlaces(req, res);
        
    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        await sequelize.close();
    }
}

test();
