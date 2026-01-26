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

    const docID = 23;
    let statusValue = '';
    const matrixExists = await db.ApprovalMatrix.findOne({
      where: {
        DocumentTypeID: docID,
        Active: 1,
      },
      transaction: t
    });

    statusValue = matrixExists ? 'Requested' : 'Posted';

    // get approval version
    const approvalVersion = await getLatestApprovalVersion('Journal Entry Voucher');

    // Insert into Transaction Table
    const newRecord = await TransactionTableModel.create({
      LinkID,
      Status: statusValue,
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
      fundsName = fund.Name;
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
    const { id } = req.params;
    const transaction = await TransactionTableModel.findOne({
      where: { ID: id },
      attributes: {
        include: [
          [
            literal("CONCAT(`RequestedByEmployee`.`FirstName`, ' ', `RequestedByEmployee`.`MiddleName`, ' ', `RequestedByEmployee`.`LastName`)"),
            'RequestedByName'
          ],
          [literal('`Funds`.`Code`'), 'FundsCode'],
          [literal('`Funds`.`Name`'), 'FundsName']
        ]
      },
      include: [
        {
          model: JournalEntryVoucherModel,
          as: 'JournalEntries',
          required: false,
          where: literal('`JournalEntries`.`LinkID` = `TransactionTable`.`LinkID`')
        },
        { model: AttachmentModel, as: 'Attachments', required: false },
        { model: EmployeeModel, as: 'RequestedByEmployee', required: false },
        { model: FundsModel, as: 'Funds', required: false }
      ]
    });

    if (transaction) res.json(transaction);
    else res.status(404).json({ message: "Journal Entry Voucher not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getGLEntries = async (req, res) => {
  try {
    const { linkID } = req.params;
    const glEntries = await GeneralLedgerModel.findAll({
      where: { LinkID: linkID },
      order: [['CreatedDate', 'ASC']]
    });
    res.json(glEntries);
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
      Status: statusValue,
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
    const userID = req.user?.id ?? 1;

    // Validate existence
    const transaction = await TransactionTableModel.findOne({ where: { LinkID } });
    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // --- REVERT General Ledger IF POSTED ---
    if (transaction.Status === 'Posted') {
      await GeneralLedgerModel.destroy({ where: { LinkID }, transaction: t });
    }

    // --- VOID Transaction ---
    await transaction.update({
      Status: 'Void',
      Active: true,
      ModifyBy: userID,
      ModifyDate: new Date()
    }, { transaction: t });

    // --- LOG TO AUDIT ---
    await ApprovalAuditModel.create({
      LinkID: generateLinkID(),
      InvoiceLink: transaction.LinkID,
      RejectionDate: new Date(),
      Remarks: "Transaction Voided by User",
      CreatedBy: userID,
      CreatedDate: new Date(),
      ApprovalVersion: transaction.ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'Voided successfully' });

  } catch (err) {
    if (t) await t.rollback();
    console.error('❌ Error voiding journal entry:', err);
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
    const rawBody = req.body || {};

    // 0. Normalize Payload (handle camelCase and PascalCase variations)
    let transactionId = rawBody.ID ?? rawBody.id ?? rawBody.transactionId ?? rawBody.TransactionID;
    let varApprovalLink = rawBody.ApprovalLinkID ?? rawBody.approvalLinkID ?? rawBody.LinkID ?? rawBody.linkID ?? rawBody.linkId;
    let varLinkID = rawBody.LinkID ?? rawBody.linkID ?? rawBody.linkId ?? rawBody.invoiceLink;
    let approvalProgress = rawBody.ApprovalProgress ?? rawBody.approvalProgress ?? rawBody.progress;
    let approvalOrder = rawBody.ApprovalOrder ?? rawBody.approvalOrder ?? rawBody.SequenceOrder ?? rawBody.sequenceOrder;
    let numberofApproverperSequence = rawBody.NumberOfApproverPerSequence ?? rawBody.numberOfApproverPerSequence ?? rawBody.approvers;
    let varFundsID = rawBody.FundsID ?? rawBody.fundsID ?? rawBody.FundsId;
    let varTransactionApprovalVersion = rawBody.ApprovalVersion ?? rawBody.approvalVersion ?? rawBody.varTransactionApprovalVersion;

    console.log("APPROVE JEV RAW PAYLOAD:", rawBody);

    if (!transactionId) {
      return res.status(400).json({ success: false, message: "Missing Transaction ID." });
    }

    // 1. Fetch missing data from DB if payload is sparse
    const transactionRecord = await TransactionTableModel.findByPk(transactionId, { transaction: t });
    if (!transactionRecord) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    // Use DB values if payload values are missing
    varLinkID = varLinkID || transactionRecord.LinkID;
    varFundsID = varFundsID || transactionRecord.FundsID;
    varTransactionApprovalVersion = varTransactionApprovalVersion || transactionRecord.ApprovalVersion;
    // If progress isn't sent, we might be in a simple "Approve All" or first step context.
    // We'll increment if it's currently 0 or null, or use a sensible default.
    if (approvalProgress === undefined || approvalProgress === null) {
      approvalProgress = (transactionRecord.ApprovalProgress || 0) + 1;
    }

    // Normalized log for debugging
    console.log("APPROVE JEV NORMALIZED PAYLOAD:", {
      transactionId,
      varLinkID,
      varFundsID,
      approvalProgress,
      approvalOrder,
      numberofApproverperSequence
    });

    // 2. Generate Invoice Number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const currentYYMM = `${year}-${month}`;

    const currentNumber = await getCurrentNumber(t);
    const fund = await FundsModel.findByPk(varFundsID, { transaction: t });
    const fundCode = fund ? fund.Code : '000'; // Fallback code

    // Format: FundCode-YYYY-MM-XXXX
    const newInvoiceNumber = `${fundCode}-${currentYYMM}-${currentNumber}`;

    // 3. Determine New Status
    let newStatus = "Requested";

    if (numberofApproverperSequence) {
      if (approvalProgress >= numberofApproverperSequence) newStatus = "Posted";
    } else {
      // If no sequence logic provided, moving progress forward usually means approval/posting
      if ((approvalProgress || 0) > 0) newStatus = "Posted";
    }

    console.log("New Status:", newStatus);

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
          FundID: varFundsID,
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

    // 4. Update DocumentType current number
    await DocumentTypeModel.update(
      { CurrentNumber: currentNumber },
      { where: { ID: 23 }, transaction: t }
    );

    // 5. Insert into Approval Audit
    await ApprovalAuditModel.create(
      {
        LinkID: varApprovalLink || varLinkID, // Use matrix LinkID if available, fallback to Transaction LinkID
        InvoiceLink: varLinkID,
        PositionEmployee: "Employee",
        PositionEmployeeID: req.user.employeeID,
        SequenceOrder: approvalOrder || 1,
        ApprovalOrder: numberofApproverperSequence || 1,
        ApprovalDate: now,
        RejectionDate: null,
        Remarks: rawBody.Remarks || null,
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
    const rawBody = req.body || {};
    const id = rawBody.ID ?? rawBody.id;
    const varApprovalLink = rawBody.LinkID ?? rawBody.linkID ?? rawBody.ApprovalLinkID;
    const reasonForRejection = rawBody.Reason ?? rawBody.reason ?? rawBody.Remarks ?? rawBody.remarks;

    if (!id) {
      return res.status(400).json({ success: false, message: "Missing Transaction ID." });
    }

    // --- UPDATE Transaction Table ---
    await TransactionTableModel.update(
      { Status: "Rejected" },
      { where: { ID: id }, transaction: t }
    );

    // --- INSERT INTO Approval Audit ---
    await ApprovalAuditModel.create(
      {
        LinkID: varApprovalLink,
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
