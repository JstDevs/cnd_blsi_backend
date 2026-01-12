const { sequelize } = require('../config/database');
const path = require('path');
const ExcelJS = require('exceljs');
const exportToExcel = async (data, filename) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('General Ledger');
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
    ap_ar: 'AR',
    fund: 'General Fund',
    account_name: 'Real Property Tax Receivable',
    account_code: '1-01-01-010',
    date: '2024-01-15',
    ledger_item: 'Collection of RPT',
    invoice_number: 'INV-2024-001',
    account_code_display: '1-01-02-100',
    account_name_display: 'Cash in Bank - LBP',
    debit: 50000.00,
    credit: 0.00,
    balance: 50000.00,
    municipality: 'BASCO (Capital)',
  },
  {
    id: 2,
    ap_ar: 'AP',
    fund: 'Special Education Fund',
    account_name: 'Accounts Payable - Supplies',
    account_code: '2-01-01-020',
    date: '2024-02-10',
    ledger_item: 'Purchase of Supplies',
    invoice_number: 'INV-2024-002',
    account_code_display: '1-01-02-101',
    account_name_display: 'Cash in Bank - DBP',
    debit: 0.00,
    credit: 15000.00,
    balance: 35000.00,
    municipality: 'MAHATAO',
  },
  {
    id: 3,
    ap_ar: 'AR',
    fund: 'Trust Fund',
    account_name: 'Donations Receivable',
    account_code: '1-01-01-030',
    date: '2024-03-05',
    ledger_item: 'Receipt of Donations',
    invoice_number: 'INV-2024-003',
    account_code_display: '1-01-02-102',
    account_name_display: 'Cash in Bank - PNB',
    debit: 25000.00,
    credit: 0.00,
    balance: 60000.00,
    municipality: 'IVANA',
  },
  {
    id: 4,
    ap_ar: 'AP',
    fund: 'General Fund',
    account_name: 'Accounts Payable - Services',
    account_code: '2-01-01-040',
    date: '2024-03-20',
    ledger_item: 'Payment to Contractor',
    invoice_number: 'INV-2024-004',
    account_code_display: '1-01-02-100',
    account_name_display: 'Cash in Bank - LBP',
    debit: 0.00,
    credit: 20000.00,
    balance: 40000.00,
    municipality: 'SABTANG',
  },
  {
    id: 5,
    ap_ar: 'AR',
    fund: 'General Fund',
    account_name: 'Income from Business Permits',
    account_code: '4-01-01-050',
    date: '2024-04-12',
    ledger_item: 'Permit Fee Collection',
    invoice_number: 'INV-2024-005',
    account_code_display: '1-01-02-100',
    account_name_display: 'Cash in Bank - LBP',
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

    console.log('General Ledger View Request Body:', req.body);

    const results = await sequelize.query(
      'CALL SP_GeneralLedger(:accountCode, :fundID, :cutoff)',
      {
        replacements: {
          accountCode: ChartofAccountsID ?? '%',
          fundID: FundID ?? '%',
          cutoff: CutOffDate ?? new Date().toISOString().slice(0, 10)
        },
      }
    );

    return res.json(results);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.exportExcel = async (req, res) => {
  try {
    const {
      ChartofAccountsID,
      CutOffDate,
      FundID,
    } = req.body;

    const results = await sequelize.query(
      'CALL SP_GeneralLedger(:accountCode, :fundID, :cutoff)',
      {
        replacements: { accountCode: ChartofAccountsID, fundID: FundID, cutoff: CutOffDate },
      }
    );

    const filename = `General_Ledger_${Date.now()}.xlsx`;
    const filePath = await exportToExcel(results, filename);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.download(filePath, err => { if (err) fs.unlinkSync(filePath); });
  } catch (err) {
    console.log('Error exporting to Excel:', err);
    res.status(500).json({ error: err.message });
  }
};

// const { GeneralLedger } = require('../config/database');
// const { sequelize } = require('../config/database');
// const { QueryTypes } = require('sequelize');
// exports.create = async (req, res) => {
//   try {
//     const { LinkID, FundID, FundName, LedgerItem, AccountName, AccountCode, Debit, Credit, CreatedBy, CreatedDate, DocumentTypeName, PostingPeriod } = req.body;
//     const item = await GeneralLedger.create({ LinkID, FundID, FundName, LedgerItem, AccountName, AccountCode, Debit, Credit, CreatedBy, CreatedDate, DocumentTypeName, PostingPeriod });
//     res.status(201).json(item);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// exports.getAll = async (req, res) => {
//   try {
//     const items = await GeneralLedger.findAll();
//     res.json(items);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// exports.getById = async (req, res) => {
//   try {
//     const item = await GeneralLedger.findByPk(req.params.id);
//     if (item) res.json(item);
//     else res.status(404).json({ message: "GeneralLedger not found" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// exports.update = async (req, res) => {
//   try {
//     const { LinkID, FundID, FundName, LedgerItem, AccountName, AccountCode, Debit, Credit, CreatedBy, CreatedDate, DocumentTypeName, PostingPeriod } = req.body;
//     const [updated] = await GeneralLedger.update({ LinkID, FundID, FundName, LedgerItem, AccountName, AccountCode, Debit, Credit, CreatedBy, CreatedDate, DocumentTypeName, PostingPeriod }, {
//       where: { id: req.params.id }
//     });
//     if (updated) {
//       const updatedItem = await GeneralLedger.findByPk(req.params.id);
//       res.json(updatedItem);
//     } else {
//       res.status(404).json({ message: "GeneralLedger not found" });
//     }
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// exports.delete = async (req, res) => {
//   try {
//     const deleted = await GeneralLedger.destroy({ where: { id: req.params.id } });
//     if (deleted) res.json({ message: "GeneralLedger deleted" });
//     else res.status(404).json({ message: "GeneralLedger not found" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
// exports.getGeneralLedgerData = async (req, res) => {
//   const { accountCode, fundName, startDate,endDate } = req.params;

//   const fund = await sequelize.query(
//     "SELECT ID FROM Funds WHERE Name = :fundName",
//     { replacements: { fundName }, type: QueryTypes.SELECT }
//   );

//   const fundID = fund[0]?.ID || '%';

//  const results = await sequelize.query(`
//       SELECT 
//         tbl.ID,
//         tbl.APAR,
//         tbl.Fund,
//         tbl.AccountName,
//         tbl.AccountCode,
//         tbl.Date,
//         tbl.LedgerItem,
//         tbl.InvoiceNumber,
//         tbl.AccountCodeDisplay,
//         tbl.AccountNameDisplay,
//         tbl.Debit,
//         tbl.Credit,
//         CASE
//           WHEN SUM(tbl.Debit) OVER (ORDER BY tbl.InvoiceNumber) = 0.00
//             THEN NULL
//           ELSE SUM(tbl.Debit) OVER (ORDER BY tbl.InvoiceNumber)
//         END AS RunningTotal
//       FROM tbl
//       WHERE tbl.AccountCode LIKE :accountCode
//         AND tbl.FundID LIKE :fundID
//         AND tbl.Date BETWEEN :startDate AND :endDate
//     `, {
//        replacements: { accountCode, fundID, startDate, endDate },
//       type: QueryTypes.SELECT
//     });

//   res.json(result);
// };