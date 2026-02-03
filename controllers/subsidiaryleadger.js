const { sequelize } = require('../config/database');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const exportToExcel = async (data, filename) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Subsidiary Ledger');
  worksheet.columns = Object.keys(data[0] || {}).map(key => ({ header: key, key }));
  worksheet.addRows(data);
  worksheet.columns.forEach(col => col.width = col.header.length < 12 ? 12 : col.header.length);
  const filePath = path.join(__dirname, `../public/exports/${filename}`);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
};

const mockData = [
  {
    id: 1,
    fund: 'General Fund',
    account_name: 'Real Property Tax Receivable',
    account_code: '1-01-01-010',
    date: '2024-01-15',
    ledger_item: 'Collection of RPT',
    debit: 50000.00,
    credit: 0.00,
    balance: 50000.00,
    municipality: 'BASCO (Capital)',
  },
  {
    id: 2,
    fund: 'Special Education Fund',
    account_name: 'Accounts Payable - Supplies',
    account_code: '2-01-01-020',
    date: '2024-02-10',
    ledger_item: 'Purchase of Office Supplies',
    debit: 0.00,
    credit: 15000.00,
    balance: 35000.00,
    municipality: 'MAHATAO',
  },
  {
    id: 3,
    fund: 'Trust Fund',
    account_name: 'Donations Receivable',
    account_code: '1-01-01-030',
    date: '2024-03-05',
    ledger_item: 'Receipt of External Donations',
    debit: 25000.00,
    credit: 0.00,
    balance: 60000.00,
    municipality: 'IVANA',
  },
  {
    id: 4,
    fund: 'General Fund',
    account_name: 'Accounts Payable - Services',
    account_code: '2-01-01-040',
    date: '2024-03-20',
    ledger_item: 'Payment to Contractor',
    debit: 0.00,
    credit: 20000.00,
    balance: 40000.00,
    municipality: 'SABTANG',
  },
  {
    id: 5,
    fund: 'General Fund',
    account_name: 'Business Permit Income',
    account_code: '4-01-01-050',
    date: '2024-04-12',
    ledger_item: 'Collection of Business Permit Fees',
    debit: 10000.00,
    credit: 0.00,
    balance: 50000.00,
    municipality: 'UYUGAN',
  },
];



exports.view = async (req, res) => {
  try {
    const {
      ChartofAccountsID,
      CutOffDate,
      FundID,
    } = req.body;

    console.log('Subsidiary Ledger View Request:', req.body);

    const results = await sequelize.query(
      'CALL SP_SubsidiaryLedger(:accountCode, :fundID, :cutoff)',
      {
        replacements: {
          accountCode: ChartofAccountsID ?? '%',
          fundID: FundID ?? '%',
          cutoff: CutOffDate ?? new Date().toISOString().slice(0, 10)
        },
      }
    );

    // Handle nested results array from CALL if necessary
    const finalData = (Array.isArray(results) && Array.isArray(results[0])) ? results[0] : results;

    return res.json(finalData);
  } catch (err) {
    console.error('Subsidiary Ledger Error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

exports.exportExcel = async (req, res) => {
  try {
    const {
      ChartofAccountsID,
      CutOffDate,
      FundID,
    } = req.body;

    console.log('Subsidiary Ledger Export Request:', req.body);

    const results = await sequelize.query(
      'CALL SP_SubsidiaryLedger(:accountCode, :fundID, :cutoff)',
      {
        replacements: {
          accountCode: ChartofAccountsID ?? '%',
          fundID: FundID ?? '%',
          cutoff: CutOffDate ?? new Date().toISOString().slice(0, 10)
        },
      }
    );

    // Handle nested results array from CALL if necessary
    const finalData = (Array.isArray(results) && Array.isArray(results[0])) ? results[0] : results;

    const filename = `Subsidiary_Ledger_${Date.now()}.xlsx`;
    const filePath = await exportToExcel(finalData, filename);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.download(filePath, err => {
      if (err) {
        console.error('Download error:', err);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    });
  } catch (err) {
    console.error('Error exporting to Excel:', err);
    res.status(500).json({
      error: 'Export failed',
      message: err.message
    });
  }
};

// const { sequelize } = require('../config/database');
// const { QueryTypes } = require('sequelize');

// exports.getFunds = async (req, res) => {
//   const result = await sequelize.query(
//     `SELECT Name FROM Funds WHERE Active = 1`, 
//     { type: QueryTypes.SELECT }
//   );
//   res.json([...result.map(r => r.Name), 'All Funds']);
// };

// exports.getAccounts = async (req, res) => {
//   const result = await sequelize.query(
//     `SELECT [Account Code], Name FROM [Chart of Accounts] WHERE Active = 1`, 
//     { type: QueryTypes.SELECT }
//   );
//   res.json([...result.map(r => ({
//     code: r['Account Code'],
//     name: r.Name
//   })), { code: '%', name: 'All Accounts' }]);
// };

// exports.getSubsidiaryLedger = async (req, res) => {
//   const { accountCode, fundName, cutoff } = req.body;

//   try {
//     const fund = await sequelize.query(
//       `SELECT ID FROM Funds WHERE Name = :fundName`,
//       { replacements: { fundName }, type: QueryTypes.SELECT }
//     );
//     const fundID = fund.length ? fund[0].ID : '%';

//     const result = await sequelize.query(
//       `CALL SP_SubsidiaryLedger(:accountCode, :fundID, :cutoff)`,
//       {
//         replacements: {
//           accountCode,
//           fundID,
//           cutoff
//         }
//       }
//     );

//     res.json(result);
//   } catch (err) {
//     console.error('Error running SP_SubsidiaryLedger:', err);
//     res.status(500).json({ error: 'Failed to retrieve ledger data' });
//   }
// };
