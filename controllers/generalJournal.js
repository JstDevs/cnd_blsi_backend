const { sequelize } = require('../config/database');
const path = require('path');
const ExcelJS = require('exceljs');
const exportToExcel = async (data, filename) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('General Journal');
  worksheet.columns = Object.keys(data[0] || {}).map(key => ({ header: key, key }));
  worksheet.addRows(data);
  worksheet.columns.forEach(col => col.width = col.header.length < 12 ? 12 : col.header.length);
  const filePath = path.join(__dirname, `../public/exports/${filename}`);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
};

const mockData = [
  {
    "Date": "2025-06-01",
    "VoucherNo": "INV-1001",
    "Remarks": "Purchase of Office Chairs",
    "AccountCode": "10101001",
    "S/L": "001",
    "Debit": 12000.00,
    "Credit": null,
    "Approver": "Maria L. Reyes",
    "Position": "Municipal Treasurer"
  },
  {
    "Date": "2025-06-02",
    "VoucherNo": "INV-1002",
    "Remarks": "Repair of Printer",
    "AccountCode": "10102001",
    "S/L": "002",
    "Debit": 3500.00,
    "Credit": null,
    "Approver": "Carlos T. Mendoza",
    "Position": "Budget Officer"
  },
  {
    "Date": "2025-06-03",
    "VoucherNo": "INV-1003",
    "Remarks": "Refund - Overpayment",
    "AccountCode": "20203001",
    "S/L": "003",
    "Debit": null,
    "Credit": 2500.00,
    "Approver": "Elena G. Rivera",
    "Position": "Municipal Accountant"
  },
  {
    "Date": "2025-06-05",
    "VoucherNo": "INV-1004",
    "Remarks": "Procurement of Books",
    "AccountCode": "10104001",
    "S/L": "004",
    "Debit": 8000.00,
    "Credit": null,
    "Approver": "Fernando D. Cruz",
    "Position": "Municipal Treasurer"
  },
  {
    "Date": "2025-06-07",
    "VoucherNo": "INV-1005",
    "Remarks": "Advance Payment - Consultant",
    "AccountCode": "20205001",
    "S/L": "005",
    "Debit": null,
    "Credit": 10000.00,
    "Approver": "Sophia R. Gomez",
    "Position": "Municipal Accountant"
  }
];

exports.view = async (req, res) => {
  try {
    console.log("GeneralJournal View Payload:", req.body);
    const {
      startDate, DateStart,
      endDate, DateEnd,
      fundID, FundID,
      code = '%' // Default to '%' if code is not provided
    } = req.body;

    const finalStartDate = startDate || DateStart;
    const finalEndDate = endDate || DateEnd;
    const finalFundID = fundID || FundID;

    // Validate required fields
    if (!finalStartDate || !finalEndDate || !finalFundID) {
      console.error("Missing required parameters (startDate/DateStart, endDate/DateEnd, fundID/FundID)");
      return res.status(400).json({ error: "Missing required parameters: startDate, endDate, fundID" });
    }

    const results = await sequelize.query(
      'CALL SP_GeneralJournal(:startDate, :endDate, :fundID, :code)',
      {
        replacements: {
          startDate: finalStartDate,
          endDate: finalEndDate,
          fundID: finalFundID,
          code
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
      startDate,
      endDate,
      fundID,
    } = req.body;


    let results = mockData;

    const filename = `General_Journal_${Date.now()}.xlsx`;
    const filePath = await exportToExcel(results, filename);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.download(filePath, err => { if (err) fs.unlinkSync(filePath); });
  } catch (err) {
    console.log('Error exporting to Excel:', err);
    res.status(500).json({ error: err.message });
  }
};