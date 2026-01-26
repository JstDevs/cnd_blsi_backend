const { sequelize } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function forceApply() {
    try {
        const spPath = path.join(__dirname, 'db/StoredProcedures/SP_GeneralLedger.sql');
        let sql = fs.readFileSync(spPath, 'utf8');

        // Clean DELIMITER lines
        sql = sql.replace(/DELIMITER \$\$/g, '').replace(/DELIMITER ;/g, '');

        // Drop then create
        console.log('Dropping existing procedure...');
        await sequelize.query('DROP PROCEDURE IF EXISTS SP_GeneralLedger');

        console.log('Creating new procedure from file...');
        const createStmt = sql.substring(sql.indexOf('CREATE PROCEDURE')).trim();
        const cleanStmt = createStmt.replace(/\$\$$/, '');

        await sequelize.query(cleanStmt);
        console.log('SP Applied Successfully');

    } catch (err) {
        console.error('Error during apply:', err);
    } finally {
        if (sequelize) await sequelize.close();
        process.exit(0);
    }
}

forceApply();
