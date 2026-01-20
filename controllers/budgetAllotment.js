const db = require('../config/database')
const DocumentTypeModel = require('../config/database').documentType;
const BudgetModel = require('../config/database').Budget;
const TransactionTableModel = require('../config/database').TransactionTable;
const AttachmentModel = require('../config/database').Attachment;
const FiscalYearModel = require('../config/database').FiscalYear;
const DepartmentModel = require('../config/database').department;
const SubDepartmentModel = require('../config/database').subDepartment;
const ChartOfAccountsModel = require('../config/database').ChartofAccounts;
const FundModel = require('../config/database').Funds;
const ProjectModel = require('../config/database').Project;
const ApprovalAuditModel = require('../config/database').ApprovalAudit;

const { Op, where } = require('sequelize');
const generateLinkID = require("../utils/generateID")
const getLatestApprovalVersion = require('../utils/getLatestApprovalVersion');
const validateApproval = require('../utils/validateApproval');

exports.save = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const parsedFields = {};
    console.log('[BudgetAllotment.save] req.body:', req.body);
    console.log('[BudgetAllotment.save] req.files:', req.files);

    const attachments = [];
    for (const key in req.body) {
      const match = key.match(/^Attachments\[(\d+)]\.(\w+)$/);
      if (match) {
        console.log('[BudgetAllotment.save] Found attachment field:', key);
        const index = parseInt(match[1]);
        const field = match[2];

        if (!attachments[index]) attachments[index] = {};
        attachments[index][field] = req.body[key];
      }
    }
    parsedFields.Attachments = attachments;
    console.log('[BudgetAllotment.save] Reconstructed attachments:', attachments);
    // Reconstruct Attachments array from fields like Attachments[0].ID ends


    for (const key in req.body) {
      try {
        parsedFields[key] = JSON.parse(req.body[key]);
      } catch {
        parsedFields[key] = req.body[key];
      }
    }
    console.log('[BudgetAllotment.save] parsedFields:', parsedFields);

    const {
      Attachments = [],
    } = parsedFields;

    const data = parsedFields;

    let IsNew = '';
    if ((data.IsNew == "true") || (data.IsNew === true) || (data.IsNew == '1') || (data.IsNew == 1)) {
      IsNew = true;
    }
    else if ((data.IsNew == "false") || (data.IsNew === false) || (data.IsNew == '0') || (data.IsNew == 0)) {
      IsNew = false;
    }
    else {
      throw new Error('Invalid value for IsNew. Expected true or false.');
    }

    const userID = req.user.id;
    const amount = parseFloat(data.Allotment);
    console.log('[BudgetAllotment.save] Calculated amount:', amount, 'from data.Allotment:', data.Allotment, 'userID:', userID);

    const LinkID = (IsNew) ? generateLinkID() : data.LinkID;
    console.log('[BudgetAllotment.save] LinkID:', LinkID, 'IsNew:', IsNew);

    let latestapprovalversion;
    try {
      latestapprovalversion = await getLatestApprovalVersion('Allotment Release Order');
      console.log('[BudgetAllotment.save] Latest approval version:', latestapprovalversion);
    } catch (err) {
      console.error('[BudgetAllotment.save] Error getting approval version:', err.message);
      latestapprovalversion = null;
    }

    let invoiceText = '';

    if (IsNew) {
      // Step 1: Get Document Type Info
      const doc = await DocumentTypeModel.findByPk(20, { transaction: t });
      if (!doc) throw new Error('Document type ID 20 not found.');

      invoiceText = `${doc.Prefix}-${String(doc.CurrentNumber).padStart(5, '0')}-${doc.Suffix}`;

      let statusValue = '';
      const matrixExists = await db.ApprovalMatrix.findOne({
        where: {
          DocumentTypeID: 20,
          Active: 1,
        },
        transaction: t
      });

      statusValue = matrixExists ? 'Requested' : 'Posted';

      // Step 2: Insert into TransactionTable
      console.log('[BudgetAllotment.save] Creating transaction with amount:', amount);
      await TransactionTableModel.create({
        LinkID: LinkID,
        Status: statusValue,
        APAR: 'Allotment Release Order',
        DocumentTypeID: 20,
        RequestedBy: userID,
        InvoiceDate: new Date(),
        AmountinWords: data.AmountInWords, // Changed from AmountInWords to AmountinWords
        InvoiceNumber: invoiceText,
        Total: amount,
        Active: true,
        Remarks: data.Remarks,
        CreatedBy: userID,
        CreatedDate: new Date(),
        ApprovalProgress: 0,
        BudgetID: data.BudgetID,
        ApprovalVersion: latestapprovalversion
      }, { transaction: t });

      // Step 3: Increment document number
      await DocumentTypeModel.update(
        { CurrentNumber: doc.CurrentNumber + 1 },
        { where: { ID: 20 }, transaction: t }
      );

    } else {
      // UPDATE existing TransactionTable
      await TransactionTableModel.update({
        ModifyBy: userID,
        ModifyDate: new Date(),
        Total: amount,
        Remarks: data.Remarks,
        ApprovalProgress: 0,
        Status: statusValue
      }, {
        where: { LinkID: LinkID },
        transaction: t
      });
    }


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

    res.json({ message: 'success' });
  } catch (error) {
    console.error(error);
    await t.rollback();
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

exports.budgetList = async (req, res) => {
  try {
    const userDepartmentID = req.user.departmentID;

    const whereClause = {
      Active: true,
      ...(userDepartmentID && ![1, 2, 3, 4].includes(userDepartmentID)
        ? { DepartmentID: userDepartmentID }
        : {})
    };

    const budgets = await BudgetModel.findAll({
      where: whereClause,
      include: [
        { model: FiscalYearModel, as: 'FiscalYear', required: false },
        { model: DepartmentModel, as: 'Department', required: false },
        { model: SubDepartmentModel, as: 'SubDepartment', required: false },
        { model: ChartOfAccountsModel, as: 'ChartofAccounts', required: false },
        { model: FundModel, as: 'Funds', required: false },
        { model: ProjectModel, as: 'Project', required: false }
      ],
      order: [['TotalAmount', 'ASC']]
    });

    res.json(budgets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load data.' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const records = await TransactionTableModel.findAll({
      where: {
        Active: true,
        APAR: {
          [Op.like]: '%Allotment Release Order%'
        }
      },
      include: [
        {
          model: BudgetModel,
          as: 'Budget',
          required: false,
        },
        {
          model: AttachmentModel,
          as: 'Attachments',
          required: false,
        }
      ],
      order: [['CreatedDate', 'DESC']],
    });

    const formattedRecords = records.map(record => {
      const plain = record.get({ plain: true });
      return {
        ...plain,
        allotment: plain.Total,
        Allotment: plain.Total
      };
    });

    res.json(formattedRecords);
  } catch (err) {
    console.error('Error loading:', err);
    res.status(500).json({ error: err.message || 'Error loading data.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await vendorType.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "vendorType not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { Name } = req.body;
    const [updated] = await vendorType.update({ Name, ModifyBy: req.user.id, ModifyDate: new Date() }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await vendorType.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "vendorType not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SOFT DELETE: Sets Active = false instead of removing from database
exports.delete = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const id = req.params.id || req.body.ID || req.body.id;
    const userID = req.user?.id ?? 1;

    const transaction = await TransactionTableModel.findByPk(id, { transaction: t });
    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ message: "allotment not found" });
    }

    // --- REVERT Budget Table IF POSTED ---
    if (transaction.Status === 'Posted') {
      const bID = transaction.BudgetID;
      const allotmentAmount = parseFloat(transaction.Total || 0);

      if (bID) {
        const budget = await BudgetModel.findByPk(bID, { transaction: t });
        if (budget) {
          const currentReleased = parseFloat(budget.Released || 0);
          const newReleased = currentReleased - allotmentAmount;

          const appropriation = parseFloat(budget.Appropriation || 0);
          const newAllotmentBalance = appropriation - newReleased;

          await budget.update(
            {
              Released: newReleased,
              AllotmentBalance: newAllotmentBalance,
              ModifyBy: userID,
              ModifyDate: new Date()
            },
            { transaction: t }
          );
        }
      }
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
    res.json({ message: 'success' });
  } catch (error) {
    if (t) await t.rollback();
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Recover (undo soft-delete) - sets Active = true
exports.recover = async (req, res) => {
  try {
    const id = req.params.id || req.body.ID || req.body.id;
    console.log('[budgetAllotment.recover] called, params.id=', req.params.id, 'body=', req.body);
    const userID = req.user?.id ?? 1;

    const [updated] = await TransactionTableModel.update(
      {
        Active: true,
        ModifyBy: userID,
        ModifyDate: new Date(),
      },
      {
        where: { ID: id }
      }
    );

    if (updated) {
      res.json({ message: 'success' });
    } else {
      res.status(404).json({ message: 'not found or already active' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
exports.approveTransaction = async (req, res) => {
  const { id, ID } = req.body;
  const txnId = ID || id;

  const t = await db.sequelize.transaction();
  try {
    const transaction = await TransactionTableModel.findByPk(txnId, { transaction: t });
    if (!transaction) throw new Error("Transaction not found");

    if (transaction.Status === 'Posted') {
      await t.rollback();
      return res.json({ success: true, message: "Transaction already posted." });
    }

    // 🔹 1. Validate Approval Matrix
    const validation = await validateApproval({
      documentTypeID: transaction.DocumentTypeID || 20, // 20 is Allotment
      approvalVersion: transaction.ApprovalVersion,
      totalAmount: parseFloat(transaction.Total || 0),
      transactionLinkID: transaction.LinkID,
      user: req.user
    });

    if (!validation.canApprove) {
      throw new Error(validation.error);
    }

    const isFinal = validation.isFinal;

    // 🔹 2. Update Transaction Table
    const updatePayload = {
      ApprovalProgress: validation.nextSequence || transaction.ApprovalProgress,
      Status: validation.nextStatus
    };

    await transaction.update(updatePayload, { transaction: t });

    // 🔹 3. Insert into Approval Audit
    await ApprovalAuditModel.create(
      {
        LinkID: generateLinkID(),
        InvoiceLink: transaction.LinkID,
        PositionorEmployee: "Employee",
        PositionorEmployeeID: req.user.employeeID,
        SequenceOrder: validation.currentSequence,
        ApprovalOrder: validation.numberOfApprovers,
        ApprovalDate: new Date(),
        RejectionDate: null,
        Remarks: null,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        ApprovalVersion: transaction.ApprovalVersion
      },
      { transaction: t }
    );

    // --- UPDATE Budget Table ONLY IF FINAL APPROVAL ---
    if (isFinal) {
      // Get the transaction to retrieve BudgetID and Amount
      const bID = transaction?.BudgetID;
      const allotmentAmount = parseFloat(transaction?.Total || 0);

      if (bID) {
        console.log('[BudgetAllotment.approveTransaction] Final approval reached. Updating Budget table for BudgetID:', bID);
        const budget = await BudgetModel.findByPk(bID, { transaction: t });
        if (budget) {
          const currentReleased = parseFloat(budget.Released || 0);
          const newReleased = currentReleased + allotmentAmount;

          const appropriation = parseFloat(budget.Appropriation || 0);
          const newAllotmentBalance = appropriation - newReleased;

          await BudgetModel.update(
            {
              Released: newReleased,
              AllotmentBalance: newAllotmentBalance,
              ModifyBy: req.user.id,
              ModifyDate: new Date()
            },
            { where: { ID: bID }, transaction: t }
          );
          console.log('[BudgetAllotment.approveTransaction] Budget updated:', { newReleased, newAllotmentBalance });
        }
      }
    }

    await t.commit();
    res.json({ success: true, message: 'Data saved successfully.' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.rejectTransaction = async (req, res) => {
  const {
    ID: id,
    LinkID: varApprovalLink,
    Reason: reasonForRejection,
  } = req.body;

  const t = await db.sequelize.transaction();
  try {
    await TransactionTableModel.update(
      { Status: "Rejected" },
      { where: { ID: id }, transaction: t }
    );

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
    res.json({ message: "Transaction rejected successfully." });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};