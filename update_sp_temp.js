require('dotenv').config();
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    logging: false
});

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        const sqlPath = path.join(__dirname, 'db/StoredProcedures/SP_GeneralLedger.sql');
        let sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Clean up SQL for execution via driver
        // Remove DELIMITER lines
        let createSql = sqlContent
            .replace(/^DELIMITER \$\$/gm, '')
            .replace(/^DELIMITER ;/gm, '')
            .replace(/\$\$/g, '');

        createSql = createSql.trim();

        await sequelize.query('DROP PROCEDURE IF EXISTS SP_GeneralLedger');
        console.log('Dropped existing SP');

        await sequelize.query(createSql);
        console.log('Created SP successfully');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}

run();
