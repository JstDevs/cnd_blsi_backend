const { sequelize } = require('./config/database');
const fs = require('fs');

async function testFiltering() {
    try {
        const linkID = '34409696'; // JEV from screenshots
        const report = {};

        console.log(`Testing filtering for LinkID: ${linkID}`);
        const results = await sequelize.query(
            'CALL SP_GeneralLedger(:accountCode, :fundID, :cutoff, :linkID)',
            {
                replacements: {
                    accountCode: '%',
                    fundID: '%',
                    cutoff: '2026-01-31',
                    linkID: linkID
                }
            }
        );

        let rows = [];
        if (Array.isArray(results)) {
            rows = Array.isArray(results[0]) ? results[0] : results;
        }

        report.filtered_count = rows.length;
        report.all_match = rows.every(r => r.link_id === linkID);
        report.rows = rows.map(r => ({ ap_ar: r.ap_ar, debit: r.debit, credit: r.credit }));

        fs.writeFileSync('gl_filtering_test_results.json', JSON.stringify(report, null, 2));
        console.log('Results dumped');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (sequelize) await sequelize.close();
        process.exit(0);
    }
}

testFiltering();
