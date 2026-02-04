const { sequelize } = require('../config/database');
const path = require('path');
const ExcelJS = require('exceljs');
const exportToExcel = async (data, filename) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Statement of Comparison');
  worksheet.columns = Object.keys(data[0] || {}).map(key => ({ header: key, key }));
  worksheet.addRows(data);
  worksheet.columns.forEach(col => col.width = col.header.length < 12 ? 12 : col.header.length);
  const filePath = path.join(__dirname, `../public/exports/${filename}`);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
};

const mockData = [
  {
    "Type": "Expenditure",
    "SubID": 101,
    "Subtype": "Salaries",
    "Category": "Personnel Services",
    "Chart of Accounts": "Salaries and Wages - Regular",
    "Account Code": "701-01",
    "Original": 500000,
    "Final": 520000,
    "Difference": 20000,
    "Actual": 515000,
    "Difference 2": -5000,
    "TimePeriod": "Q1",
    "Original_Sum": 500000,
    "Final_Sum": 520000,
    "Difference_Sum": 20000,
    "Actual_Sum": 515000,
    "Difference2_Sum": -5000,
    "Municipality": "Angadanan",
    "Province": "Isabela"
  },
  {
    "Type": "Expenditure",
    "SubID": 102,
    "Subtype": "Utilities",
    "Category": "Maintenance and Other Operating Expenses",
    "Chart of Accounts": "Electricity Expenses",
    "Account Code": "705-02",
    "Original": 150000,
    "Final": 155000,
    "Difference": 5000,
    "Actual": 149000,
    "Difference 2": -6000,
    "TimePeriod": "Q1",
    "Original_Sum": 150000,
    "Final_Sum": 155000,
    "Difference_Sum": 5000,
    "Actual_Sum": 149000,
    "Difference2_Sum": -6000,
    "Municipality": "Santiago",
    "Province": "Isabela"
  },
  {
    "Type": "Revenue",
    "SubID": 201,
    "Subtype": "Tax Collection",
    "Category": "Local Taxes",
    "Chart of Accounts": "Real Property Tax",
    "Account Code": "402-01",
    "Original": 300000,
    "Final": 300000,
    "Difference": 0,
    "Actual": 320000,
    "Difference 2": 20000,
    "TimePeriod": "Q1",
    "Original_Sum": 300000,
    "Final_Sum": 300000,
    "Difference_Sum": 0,
    "Actual_Sum": 320000,
    "Difference2_Sum": 20000,
    "Municipality": "Ilagan",
    "Province": "Isabela"
  },
  {
    "Type": "Revenue",
    "SubID": 202,
    "Subtype": "Business Taxes",
    "Category": "Local Taxes",
    "Chart of Accounts": "Business Tax - Retail",
    "Account Code": "402-02",
    "Original": 180000,
    "Final": 190000,
    "Difference": 10000,
    "Actual": 185000,
    "Difference 2": -5000,
    "TimePeriod": "Q1",
    "Original_Sum": 180000,
    "Final_Sum": 190000,
    "Difference_Sum": 10000,
    "Actual_Sum": 185000,
    "Difference2_Sum": -5000,
    "Municipality": "Roxas",
    "Province": "Isabela"
  }
];



exports.view = async (req, res) => {
  try {
    const {
      fiscalYearID,
    } = req.body;

    const results = await sequelize.query(
      'CALL SP_SCBAA(:fiscalYear)',
      {
        replacements: { fiscalYear: fiscalYearID },
      }
    );

    return res.json(results);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.exportExcel = async (req, res) => {
  try {
    const {
      fiscalYearID,
    } = req.body;
    
    const results = await sequelize.query(
      'CALL SP_SCBAA(:fiscalYear)',
      {
        replacements: { fiscalYear: fiscalYearID },
      }
    );

    const filename = `Statement_of_Comparison_${Date.now()}.xlsx`;
    const filePath = await exportToExcel(results, filename);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.download(filePath, err => { if (err) fs.unlinkSync(filePath); });
  } catch (err) {
    console.log('Error exporting to Excel:', err);
    res.status(500).json({ error: err.message });
  }
};