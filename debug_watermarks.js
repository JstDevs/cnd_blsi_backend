const { sequelize } = require('./config/database');

async function debug() {
    try {
        const [results] = await sequelize.query("DESCRIBE watermarks");
        console.log('--- Watermarks Table Structure ---');
        console.log(JSON.stringify(results, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

debug();
