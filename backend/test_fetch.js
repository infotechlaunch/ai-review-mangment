const fs = require('fs');
const path = require('path');
const { getClientBySlug, getAllClients } = require('./src/models/Client');

async function run() {
    try {
        console.log('Fetching all clients...');
        const clients = await getAllClients();
        console.log(`Fetched ${clients.length} clients.`);
        
        const slug = 'umesh_travels_raigarh_496001';
        console.log(`Looking for client with slug: ${slug}`);
        
        const client = clients.find(c => c.slug === slug);
        
        if (client) {
            console.log('Client found!');
            fs.writeFileSync(
                path.join(__dirname, 'fetched_client.json'), 
                JSON.stringify(client, null, 2)
            );
            console.log('Data saved to fetched_client.json');
        } else {
            console.log('Client not found.');
            console.log('Available slugs:', clients.map(c => c.slug).join(', '));
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

run();
