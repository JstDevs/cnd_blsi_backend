const JournalEntryVoucherModel = require('../config/database').JournalEntryVoucher;
const FundsModel = require('../config/database').Funds;
const AttachmentModel = require('../config/database').Attachment;
const ChartofAccountsModel = require('../config/database').ChartofAccounts;
const TransactionTableModel = require('../config/database').TransactionTable;
const EmployeeModel = require('../config/database').employee;
const DocumentTypeModel = require('../config/database').documentType;
const ApprovalAuditModel = require('../config/database').ApprovalAudit;
const GeneralLedgerModel = require('../config/database').GeneralLedger;
const generateLinkID = require("../utils/generateID")
const makeInvoiceNumberJournalEntry = require('../utils/makeInvoiceNumberJournalEntry');
const getLatestApprovalVersion = require('../utils/getLatestApprovalVersion');
const db = require('../config/database')
const { Op, literal } = require('sequelize');

// exports.create = async (req, res) => {
//   try {
//     const { LinkID, ResponsibilityCenter, FundName, LedgerItem, AccountName, AccountCode, Debit, Credit, CreatedBy, CreatedDate, DocumentTypeName, PR, Particulars } = req.body;
//     const item = await journalEntryVoucher.create({ LinkID, ResponsibilityCenter, FundName, LedgerItem, AccountName, AccountCode, Debit, Credit, CreatedBy, CreatedDate, DocumentTypeName, PR, Particulars });
//     res.status(201).json(item);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.create = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const parsedFields = {};

    // Reconstruct Attachments array from fields like Attachments[0].ID starts
    const attachments = [];
    for (const key in req.body) {
      const match = key.match(/^Attachments\[(\d+)]\.(\w+)$/);
      if (match) {
        const index = parseInt(match[1]);
        const field = match[2];

        if (!attachments[index]) attachments[index] = {};
        attachments[index][field] = req.body[key];
      }
    }
    parsedFields.Attachments = attachments;
    // Reconstruct Attachments array from fields like Attachments[0].ID ends

    for (const key in req.body) {
      try {
        parsedFields[key] = JSON.parse(req.body[key]);
      } catch {
        parsedFields[key] = req.body[key];
      }
    }

    const {
      Attachments = [],
    } = parsedFields;

    const {
      InvoiceDate,
      JEVType,
      Remarks,
      ObligationRequestNumber,
      SAI_No,
      AccountingEntries,
      FundsID,
      CheckNumber,
    } = parsedFields;

    let {
      CheckDate
    } = parsedFields;
    CheckDate = CheckDate ? CheckDate : null;

    // generate linkID
    const LinkID = generateLinkID();

    // generate invoice number
    const invoiceNo = await makeInvoiceNumberJournalEntry();

    // get total debit
    const totalDebit = Number(
      AccountingEntries.reduce((sum, e) => {
        const num = Number(e.Debit);
        return sum + (isNaN(num) ? 0 : num);
      }, 0).toFixed(2)
    );

    // get total credit
    const totalCredit = Number(
      AccountingEntries.reduce((sum, e) => {
        const num = Number(e.Credit);
        return sum + (isNaN(num) ? 0 : num);
      }, 0).toFixed(2)
    );

    if (totalDebit !== totalCredit) {
      return res.status(400).json({ error: "Debit and Credit totals must be equal." });
    }

    // get approval version
    const approvalVersion = await getLatestApprovalVersion('Journal Entry Voucher');

    // Insert into Transaction Table
    const newRecord = await TransactionTableModel.create({
      LinkID,
      Status: 'Requested',
      APAR: 'Journal Entry Voucher',
      DocumentTypeID: 23,
      FundsID,
      RequestedBy: req.user.employeeID,
      InvoiceDate,
      InvoiceNumber: invoiceNo,
      Total: totalDebit,
      Debit: totalDebit,
      Credit: totalCredit,
      JEVType,
      Remarks,
      Active: true,
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      ApprovalProgress: 0,
      ApprovalVersion: approvalVersion,
      ObligationRequestNumber,
      SAI_No,
      CheckNumber,
      CheckDate
    }, { transaction: t });

    // Get Funds Name
    const fund = await FundsModel.findByPk(FundsID);
    let fundsName = '';
    if (fund) {
      fundsName = fund.FundsName;
    }

    // Insert Journal Entry Items
    const journalItems = await Promise.all(
      AccountingEntries.map(async (e) => {
        const coa = await ChartofAccountsModel.findByPk(e.AccountExplanation);

        return {
          LinkID,
          ResponsibilityCenter: e.ResponsibilityCenter,
          FundsName: fundsName,
          LedgerItem: coa?.Name || '',
          AccountName: coa?.Name || '',
          AccountCode: coa?.AccountCode || '',
          Debit: e.Debit,
          Credit: e.Credit,
          CreatedBy: req.user.id,
          CreatedDate: new Date(),
          DocumentTypeName: 'Journal Entry Voucher',
          PR: e.PR,
        };
      })
    );
    await JournalEntryVoucherModel.bulkCreate(journalItems, { transaction: t });


    // Attachment handling
    const existingIDs = Attachments.filter(att => att.ID).map(att => att.ID);

    // Delete attachments removed from the list
    await AttachmentModel.destroy({
      where: {
        LinkID: LinkID,
        ID: { [Op.notIn]: existingIDs }
      },
      transaction: t
    });

    // Add new files
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        LinkID: LinkID,
        DataName: file.originalname,
        DataType: file.mimetype,
        DataImage: `${req.uploadPath}/${file.filename}`
      }));
      await AttachmentModel.bulkCreate(newAttachments, { transaction: t });
    }

    await t.commit();

    // Fetch the created journal entry with attachments and journal entries
    // to return in the response
    // const result = await TransactionTableModel.findOne({
    //   where: { ID: newRecord.ID },
    //   attributes: {
    //     include: [
    //       // Flatten full name of RequestedBy     
    //       [
    //         literal("CONCAT(`RequestedByEmployee`.`FirstName`, ' ', `RequestedByEmployee`.`MiddleName`, ' ', `RequestedByEmployee`.`LastName`)"),
    //         'RequestedByName'
    //       ],
    //       // Flatten fund fields
    //       [literal('`Funds`.`Code`'), 'FundsCode'],
    //       [literal('`Funds`.`Name`'), 'FundsName']
    //     ]
    //   },
    //   include: [
    //     {
    //       model: JournalEntryVoucherModel,
    //       as: 'JournalEntries',
    //       required: false,
    //     },
    //     {
    //       model: AttachmentModel,
    //       as: 'Attachments',
    //       required: false,
    //     },
    //     {
    //       model: EmployeeModel,
    //       as: 'RequestedByEmployee',
    //       attributes: [],
    //       required: false,
    //     },
    //     {
    //       model: FundsModel,
    //       as: 'Funds',
    //       attributes: [],
    //       required: false,
    //     }
    //   ]
    // });

    res.status(201).json({ message: 'success' });
  } catch (err) {
    console.error('❌ Error creating journal entry:', err);
    await t.rollback();
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const result = await TransactionTableModel.findAll({
      where: {
        Active: true,
        APAR: {
          [Op.like]: '%Journal Entry Voucher%'
        }
      },
      attributes: {
        include: [
          // Flatten full name of RequestedBy
          [
            literal("CONCAT(`RequestedByEmployee`.`FirstName`, ' ', `RequestedByEmployee`.`MiddleName`, ' ', `RequestedByEmployee`.`LastName`)"),
            'RequestedByName'
          ],
          // Flatten fund fields
          [literal('`Funds`.`Code`'), 'FundsCode'],
          [literal('`Funds`.`Name`'), 'FundsName']
        ]
      },
      include: [
        {
          model: JournalEntryVoucherModel,
          as: 'JournalEntries',
          required: false
        },
        {
          model: AttachmentModel,
          as: 'Attachments',
          required: false
        },
        {
          model: EmployeeModel,
          as: 'RequestedByEmployee',
          required: false
        },
        {
          model: FundsModel,
          as: 'Funds',
          required: false
        }
      ],
      order: [['CreatedDate', 'DESC']],
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await JournalEntryVoucherModel.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "journalEntryVoucher not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// exports.update = async (req, res) => {
//   try {
//     const { LinkID, ResponsibilityCenter, FundName, LedgerItem, AccountName, AccountCode, Debit, Credit, CreatedBy, CreatedDate, DocumentTypeName, PR, Particulars } = req.body;
//     const [updated] = await JournalEntryVoucherModel.update({ LinkID, ResponsibilityCenter, FundName, LedgerItem, AccountName, AccountCode, Debit, Credit, CreatedBy, CreatedDate, DocumentTypeName, PR, Particulars }, {
//       where: { id: req.params.id }
//     });
//     if (updated) {
//       const updatedItem = await JournalEntryVoucherModel.findByPk(req.params.id);
//       res.json(updatedItem);
//     } else {
//       res.status(404).json({ message: "journalEntryVoucher not found" });
//     }
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.update = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const parsedFields = {};

    // Reconstruct Attachments array from fields like Attachments[0].ID starts
    const attachments = [];
    for (const key in req.body) {
      const match = key.match(/^Attachments\[(\d+)]\.(\w+)$/);
      if (match) {
        const index = parseInt(match[1]);
        const field = match[2];

        if (!attachments[index]) attachments[index] = {};
        attachments[index][field] = req.body[key];
      }
    }
    parsedFields.Attachments = attachments;
    // Reconstruct Attachments array from fields like Attachments[0].ID ends

    for (const key in req.body) {
      try {
        parsedFields[key] = JSON.parse(req.body[key]);
      } catch {
        parsedFields[key] = req.body[key];
      }
    }

    const {
      LinkID,
      InvoiceDate,
      JEVType,
      Remarks,
      AccountingEntries,
      FundsID,
      Attachments = []
    } = parsedFields;


    // Check if the record is in a state that allows updates
    const journalRecord = await TransactionTableModel.findOne({ where: { LinkID } });
    // if (!journalRecord || journalRecord.Status !== 'Rejected') {
    //   return res.status(400).json({ message: 'Only Rejected journal entries can be updated.' });
    // }

    // Validate totals

    // get total debit
    const totalDebit = Number(
      AccountingEntries.reduce((sum, e) => {
        const num = Number(e.Debit);
        return sum + (isNaN(num) ? 0 : num);
      }, 0).toFixed(2)
    );

    // get total credit
    const totalCredit = Number(
      AccountingEntries.reduce((sum, e) => {
        const num = Number(e.Credit);
        return sum + (isNaN(num) ? 0 : num);
      }, 0).toFixed(2)
    );

    if (totalDebit !== totalCredit) {
      return res.status(400).json({ error: "Debit and Credit totals must be equal." });
    }

    // get approval version
    const approvalVersion = await getLatestApprovalVersion('Journal Entry Voucher');

    // Update Transaction Table
    await TransactionTableModel.update({
      Status: 'Requested',
      RequestedBy: req.user.employeeID,
      InvoiceDate,
      Total: totalDebit,
      Debit: totalDebit,
      Credit: totalCredit,
      JEVType,
      Remarks,
      ApprovalProgress: 0,
      ApprovalVersion: approvalVersion,
      ModifyBy: req.user.id,
      ModifyDate: new Date()
    }, {
      where: { LinkID },
      transaction: t
    });

    // Delete existing Journal Entries
    await JournalEntryVoucherModel.destroy({ where: { LinkID }, transaction: t });

    // Insert updated Journal Entries
    const fund = await FundsModel.findByPk(FundsID);
    const fundsName = fund?.FundsName || '';

    const journalItems = await Promise.all(
      AccountingEntries.map(async (e) => {
        const coa = await ChartofAccountsModel.findByPk(e.AccountExplanation);
        return {
          LinkID,
          ResponsibilityCenter: e.ResponsibilityCenter,
          FundsName: fundsName,
          LedgerItem: coa?.Name || '',
          AccountName: coa?.Name || '',
          AccountCode: coa?.AccountCode || '',
          Debit: e.Debit,
          Credit: e.Credit,
          CreatedBy: req.user.id,
          CreatedDate: new Date(),
          DocumentTypeName: 'Journal Entry Voucher',
          PR: e.PR,
        };
      })
    );
    await JournalEntryVoucherModel.bulkCreate(journalItems, { transaction: t });

    // Attachment handling
    const existingIDs = Attachments.filter(att => att.ID).map(att => att.ID);

    // Delete attachments removed from the list
    await AttachmentModel.destroy({
      where: {
        LinkID,
        ID: { [Op.notIn]: existingIDs }
      },
      transaction: t
    });

    // Add new files
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        LinkID,
        DataName: file.originalname,
        DataType: file.mimetype,
        DataImage: `${req.uploadPath}/${file.filename}`
      }));
      await AttachmentModel.bulkCreate(newAttachments, { transaction: t });
    }

    await t.commit();

    // // Fetch updated record
    // const result = await TransactionTableModel.findOne({
    //   where: { LinkID },
    //   attributes: {
    //     include: [
    //       [
    //         literal("CONCAT(`RequestedByEmployee`.`FirstName`, ' ', `RequestedByEmployee`.`MiddleName`, ' ', `RequestedByEmployee`.`LastName`)"),
    //         'RequestedByName'
    //       ],
    //       // Flatten fund fields
    //       [literal('`Funds`.`Code`'), 'FundsCode'],
    //       [literal('`Funds`.`Name`'), 'FundsName']
    //     ]
    //   },
    //   include: [
    //     {
    //       model: JournalEntryVoucherModel,
    //       as: 'JournalEntries',
    //       required: false
    //     },
    //     {
    //       model: AttachmentModel,
    //       as: 'Attachments',
    //       required: false
    //     },
    //     {
    //       model: EmployeeModel,
    //       as: 'RequestedByEmployee',
    //       required: false
    //     },
    //     {
    //       model: FundsModel,
    //       as: 'Funds',
    //       required: false
    //     }
    //   ]
    // });

    res.json({ message: 'success' });
  } catch (err) {
    await t.rollback();
    console.error('❌ Error updating journal entry:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};


// exports.delete = async (req, res) => {
//   try {
//     const deleted = await journalEntryVoucher.destroy({ where: { id: req.params.id } });
//     if (deleted) res.json({ message: "journalEntryVoucher deleted" });
//     else res.status(404).json({ message: "journalEntryVoucher not found" });
//     res.status(404).json({ });});
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.delete = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { LinkID } = req.query;

    // Validate existence
    const transaction = await TransactionTableModel.findOne({ where: { LinkID } });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Delete related journal entries
    await JournalEntryVoucherModel.destroy({ where: { LinkID }, transaction: t });
    await AttachmentModel.destroy({ where: { LinkID }, transaction: t });
    await TransactionTableModel.destroy({ where: { LinkID }, transaction: t });

    await t.commit();
    res.json({ message: 'Deleted successfully' });

  } catch (err) {
    await t.rollback();
    console.error('❌ Error deleting journal entry:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

async function getCurrentNumber(transaction) {
  let currentNumber = 1;

  const docType = await DocumentTypeModel.findOne({
    where: { ID: 23 }, // 23 is Journal Entry Voucher as per create function
    attributes: ["CurrentNumber"],
    transaction
  });

  if (docType) {
    currentNumber = (docType.CurrentNumber || 0) + 1;
  }

  // Return formatted series number (4-digit padded)
  return currentNumber.toString().padStart(4, "0");
}

exports.approveTransaction = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const {
      ID: transactionId,
      ApprovalLinkID: varApprovalLink,
      LinkID: varLinkID,
      ApprovalProgress: approvalProgress,
      ApprovalOrder: approvalOrder,
      NumberOfApproverPerSequence: numberofApproverperSequence,
      FundsID,
      ApprovalVersion: varTransactionApprovalVersion
    } = req.body;

    // 1. Generate Invoice Number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const currentYYMM = `${year}-${month}`;

    console.log("APPROVE JEV PAYLOAD:", req.body); // DEBUG LOG

    const currentNumber = await getCurrentNumber(t);
    const fund = await FundsModel.findByPk(FundsID, { transaction: t });
    const fundCode = fund ? fund.Code : '000'; // Fallback code

    // Format: FundCode-YYYY-MM-XXXX
    const newInvoiceNumber = `${fundCode}-${currentYYMM}-${currentNumber}`;

    // 2. Determine New Status
    let newStatus = "Requested";
    console.log("ApproverPerSequence:", numberofApproverperSequence, "Progress:", approvalProgress); // DEBUG LOG

    if (numberofApproverperSequence) {
      if (approvalProgress >= numberofApproverperSequence) newStatus = "Posted";
    } else {
      if ((approvalProgress || 0) > 0) newStatus = "Posted";
    }

    console.log("New Status:", newStatus); // DEBUG LOG

    const updatePayload = {
      ApprovalProgress: approvalProgress,
      Status: newStatus
    };

    if (newStatus === "Posted") {
      updatePayload.InvoiceNumber = newInvoiceNumber;
      // Copy to General Ledger when posted
      const jevEntries = await JournalEntryVoucherModel.findAll({
        where: { LinkID: varLinkID },
        transaction: t
      });

      for (const entry of jevEntries) {
        await GeneralLedgerModel.create({
          LinkID: entry.LinkID,
          FundID: FundsID,
          FundName: entry.FundsName,
          LedgerItem: entry.LedgerItem,
          AccountName: entry.AccountName,
          AccountCode: entry.AccountCode,
          Debit: entry.Debit,
          Credit: entry.Credit,
          CreatedBy: entry.CreatedBy,
          CreatedDate: new Date(),
          DocumentTypeName: 'Journal Entry Voucher'
        }, { transaction: t });
      }
    }

    await TransactionTableModel.update(updatePayload, { where: { ID: transactionId }, transaction: t });

    // 3. Update DocumentType current number
    await DocumentTypeModel.update(
      { CurrentNumber: currentNumber },
      { where: { ID: 23 }, transaction: t }
    );

    // 4. Insert into Approval Audit
    await ApprovalAuditModel.create(
      {
        LinkID: varApprovalLink,
        InvoiceLink: varLinkID,
        PositionEmployee: "Employee",
        PositionEmployeeID: req.user.employeeID,
        SequenceOrder: approvalOrder, // Correctly use the approved sequence order
        ApprovalOrder: numberofApproverperSequence,
        ApprovalDate: now,
        RejectionDate: null,
        Remarks: null,
        CreatedBy: req.user.id,
        CreatedDate: now,
        ApprovalVersion: varTransactionApprovalVersion
      },
      { transaction: t }
    );

    await t.commit();
    return res.json({ success: true, message: "Transaction approved successfully." });

  } catch (err) {
    await t.rollback();
    console.error("Error approving transaction:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectTransaction = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const {
      ID: id,
      LinkID: varApprovalLink,
      Reason: reasonForRejection,
    } = req.body;

    // --- UPDATE Transaction Table ---
    await TransactionTableModel.update(
      { Status: "Rejected" },
      { where: { ID: id }, transaction: t }
    );

    // --- INSERT INTO Approval Audit ---
    await ApprovalAuditModel.create(
      {
        LinkID: varApprovalLink, // IMPORTANT: Use LinkID of Approval Matrix, NOT the Transaction LinkID, unless standard is otherwise. Usually matches frontend.
        RejectionDate: new Date(),
        Remarks: reasonForRejection,
        CreatedBy: req.user.id,
        CreatedDate: new Date()
      },
      { transaction: t }
    );

    await t.commit();
    res.json({ success: true, message: "Transaction rejected successfully." });

  } catch (err) {
    await t.rollback();
    console.error("Error rejecting transaction:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
