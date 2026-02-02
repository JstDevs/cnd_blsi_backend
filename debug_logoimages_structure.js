const { sequelize } = require('./config/database');

async function debug() {
    try {
        const [results] = await sequelize.query("DESCRIBE logoimages");
        console.log('--- LogoImages Table Structure ---');
        console.log(JSON.stringify(results, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit(0);
    }
}

debug();
