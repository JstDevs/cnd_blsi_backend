const { Watermarks, sequelize } = require('./config/database');

async function debug() {
    try {
        console.log('--- Testing Watermarks findAll with Include ---');
        console.log('Checking if Models are registered:');
        console.log('Watermarks:', !!Watermarks);
        console.log('DocumentType:', !!sequelize.models.DocumentType);

        const items = await Watermarks.findAll({
            include: [
                {
                    model: sequelize.models.DocumentType,
                    as: 'DocumentType',
                    attributes: ['Name']
                }
            ],
            limit: 5
        });

        console.log('✅ Query success! Found:', items.length);
        if (items.length > 0) {
            console.log('Sample item:', JSON.stringify(items[0], null, 2));
        }
    } catch (err) {
        console.error('❌ Query failed!');
        console.error('Error Name:', err.name);
        console.error('Error Message:', err.message);
        if (err.parent) console.error('Parent Error:', err.parent.message);
    } finally {
        process.exit(0);
    }
}

debug();
