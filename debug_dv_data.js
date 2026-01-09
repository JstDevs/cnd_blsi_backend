
const db = require('./config/database');
const TransactionTable = require('./models/transactionTable')(db.sequelize, db.Sequelize.DataTypes);
require('dotenv').config();

async function checkData() {
    try {
        const records = await TransactionTable.findAll({
            where: {
                APAR: { [db.Sequelize.Op.like]: '%Disbursement Voucher%' }
            },
            limit: 5,
            order: [['CreatedDate', 'DESC']],
            attributes: ['ID', 'InvoiceNumber', 'BillingDueDate', 'ObligationRequestNumber', 'FundsID']
        });

        console.log("Found records:", records.length);
        records.forEach(r => {
            console.log("------------------------------------------------");
            console.log(`ID: ${r.ID}`);
            console.log(`InvoiceNumber: ${r.InvoiceNumber}`);
            console.log(`BillingDueDate: ${r.BillingDueDate}`);
            console.log(`ObligationRequestNumber: ${r.ObligationRequestNumber}`);
            console.log(`FundsID: ${r.FundsID}`);
        });
    } catch (err) {
        console.error("Error:", err);
    }
}

checkData();
