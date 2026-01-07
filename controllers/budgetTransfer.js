const db = require('../config/database')
const BudgetModel = require('../config/database').Budget;
const DocumentTypeModel = require('../config/database').documentType;
const TransactionTableModel = require('../config/database').TransactionTable;
const AttachmentModel = require('../config/database').Attachment;
const TransactionItemModel = require('../config/database').TransactionItems;
const FiscalYearModel = require('../config/database').FiscalYear;
const DepartmentModel = require('../config/database').department;
const SubDepartmentModel = require('../config/database').subDepartment;
const ChartOfAccountsModel = require('../config/database').ChartofAccounts;
const FundModel = require('../config/database').Funds;
const ProjectModel = require('../config/database').Project;
const ApprovalAuditModel = require('../config/database').ApprovalAudit;

const { Op } = require('sequelize');
const generateLinkID = require("../utils/generateID")
const getLatestApprovalVersion = require('../utils/getLatestApprovalVersion');

exports.save = async (req, res) => {
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

    const amountStr = String(data.Transfer || 0).replace(/,/g, '');
    const amount = parseFloat(amountStr);
    console.log('[budgetTransfer.save] data.Transfer:', data.Transfer, 'parsed amount:', amount);

    const LinkID = IsNew ? generateLinkID() : data.LinkID;

    const docTypeID = 22; // Budget Transfer
    const doc = await DocumentTypeModel.findByPk(docTypeID, { transaction: t });
    if (!doc) throw new Error(`Document type ID ${docTypeID} not found.`);

    const invoiceText = `${doc.Prefix}-${String(doc.CurrentNumber).padStart(5, '0')}-${doc.Suffix}`;
    const approvalVersion = await getLatestApprovalVersion('Budget Transfer');

    if (IsNew) {
      await TransactionTableModel.create({
        LinkID,
        Status: 'Requested',
        APAR: 'Budget Transfer',
        DocumentTypeID: docTypeID,
        RequestedBy: userID,
        InvoiceDate: new Date(),
        InvoiceNumber: invoiceText,
        Total: amount,
        Active: true,
        Remarks: data.Remarks,
        CreatedBy: userID,
        CreatedDate: new Date(),
        ApprovalProgress: 0,
        BudgetID: data.BudgetID,
        TargetID: data.TargetID,
        ApprovalVersion: approvalVersion
      }, { transaction: t });

      await DocumentTypeModel.update(
        { CurrentNumber: doc.CurrentNumber + 1 },
        { where: { ID: docTypeID }, transaction: t }
      );
    } else {
      await TransactionTableModel.update({
        ModifyBy: userID,
        ModifyDate: new Date(),
        Total: amount,
        Remarks: data.Remarks,
        BudgetID: data.BudgetID,
        TargetID: data.TargetID,
        ApprovalProgress: 0,
        Status: 'Requested'
      }, {
        where: { LinkID },
        transaction: t
      });
    }


    // Delete removed attachments (if applicable)
    const existingIDs = Attachments.filter(att => att.ID).map(att => att.ID);
    if (!IsNew && existingIDs.length > 0) {
      await AttachmentModel.destroy({
        where: {
          LinkID: LinkID,
          ID: { [Op.notIn]: existingIDs }
        },
        transaction: t
      });
    }

    // Add new attachments
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

    // Optionally: Logging/Auditing here (not shown)

    res.json({ message: 'success' });
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

exports.budgetList = async (req, res) => {
  try {
    const userDepartmentID = req.user.departmentID;
    const allowedAccessDepartments = [1, 2, 3, 4];

    const whereCondition = {
      Active: true,
      // ...(allowedAccessDepartments.includes(userDepartmentID)
      //   ? {}
      //   : { DepartmentID: userDepartmentID })
    };

    const records = await BudgetModel.findAll({
      where: whereCondition,
      include: [
        {
          model: FiscalYearModel,
          as: 'FiscalYear',
          required: false,
        },
        {
          model: DepartmentModel,
          as: 'Department',
          required: false,
        },
        {
          model: SubDepartmentModel,
          as: 'SubDepartment',
          required: false,
        },
        {
          model: ChartOfAccountsModel,
          as: 'ChartofAccounts',
          required: false,
        },
        {
          model: FundModel,
          as: 'Funds',
          required: false,
        },
        {
          model: ProjectModel,
          as: 'Project',
          required: false,
        }
      ],
      order: [['TotalAmount', 'ASC']]
    });

    res.json(records);
  } catch (error) {
    console.error('Error loading budget grid:', error);
    res.status(500).json({ error: error.message || 'Failed to load budget data' });
  }
};

exports.list = async (req, res) => {
  try {
    const records = await TransactionTableModel.findAll({
      where: {
        Active: true,
        APAR: {
          [Op.like]: '%Budget Transfer%'
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
      order: [['CreatedDate', 'DESC']]
    });

    res.json(records);
  } catch (error) {
    console.error('Error loading Budget Transfer grid:', error);
    res.status(500).json({ error: 'Failed to load Budget Transfer records' });
  }
};

// SOFT DELETE: Sets Active = false instead of removing from database
exports.delete = async (req, res) => {
  try {
    const id = req.params.id || req.body.ID || req.body.id;
    console.log('[budgetTransfer.delete] called, params.id=', req.params.id, 'body=', req.body);
    const userID = req.user?.id ?? 1;

    // Soft delete - sets Active to false in TransactionTable, record remains in database
    const [updated] = await TransactionTableModel.update(
      {
        Active: false,
        ModifyBy: userID,
        ModifyDate: new Date(),
      },
      {
        where: {
          ID: id,
          Active: true,
          APAR: { [Op.like]: '%Budget Transfer%' }
        },
      }
    );

    if (updated) {
      res.json({ message: 'success' });
    } else {
      res.status(404).json({ message: "budget transfer not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Recover soft-deleted transfer transaction
exports.recover = async (req, res) => {
  try {
    const id = req.params.id || req.body.ID || req.body.id;
    console.log('[budgetTransfer.recover] called, params.id=', req.params.id, 'body=', req.body);
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
  const rawBody = req.body || {};

  // Accept multiple possible field names from frontend variations
  const id = rawBody.id ?? rawBody.ID ?? rawBody.transactionId ?? rawBody.TransactionID ?? rawBody.linkId ?? rawBody.LinkID ?? (rawBody.data && (rawBody.data.id ?? rawBody.data.ID));
  let approvalProgress = rawBody.approvalProgress ?? rawBody.ApprovalProgress ?? rawBody.approval_progress ?? (rawBody.data && rawBody.data.approvalProgress) ?? rawBody.progress;
  const varApprovalLink = rawBody.varApprovalLink ?? rawBody.linkId ?? rawBody.linkID ?? rawBody.LinkID ?? rawBody.approvalLink ?? (rawBody.data && rawBody.data.varApprovalLink);
  const varLinkID = rawBody.varLinkID ?? rawBody.invoiceLink ?? rawBody.invoiceLinkId ?? rawBody.varLinkId ?? (rawBody.data && rawBody.data.varLinkID);
  const approvalOrder = rawBody.approvalOrder ?? rawBody.SequenceOrder ?? rawBody.sequenceOrder ?? (rawBody.data && rawBody.data.approvalOrder);
  const numberOfApproverPerSequence = rawBody.numberOfApproverPerSequence ?? rawBody.approvers ?? rawBody.numberOfApprovers ?? (rawBody.data && rawBody.data.numberOfApproverPerSequence);
  const userEmployeeID = rawBody.userEmployeeID ?? rawBody.EmployeeID ?? rawBody.employeeId ?? (rawBody.data && rawBody.data.userEmployeeID) ?? req.user?.id;
  const strUser = rawBody.strUser ?? rawBody.createdBy ?? rawBody.userName ?? rawBody.username ?? req.user?.id;
  const varTransactionApprovalVersion = rawBody.varTransactionApprovalVersion ?? rawBody.approvalVersion ?? rawBody.ApprovalVersion ?? (rawBody.data && rawBody.data.varTransactionApprovalVersion);
  const varBudgetID = rawBody.varBudgetID ?? rawBody.BudgetID ?? rawBody.budgetId ?? (rawBody.data && rawBody.data.varBudgetID);

  console.info('[budgetTransfer.approveTransaction] raw body:', rawBody);
  console.info('[budgetTransfer.approveTransaction] normalized payload:', {
    id,
    approvalProgress,
    varBudgetID
  });

  if (!id) return res.status(400).json({ success: false, error: 'Missing required field: id' });

  // If frontend didn't supply approvalProgress, default to 1
  if (approvalProgress === undefined || approvalProgress === null) {
    approvalProgress = 1;
  }

  const t = await db.sequelize.transaction();
  try {
    // Determine new status based on approval progress
    let newStatus = 'Requested';
    if (numberOfApproverPerSequence) {
      if (approvalProgress >= numberOfApproverPerSequence) newStatus = 'Approved';
    } else {
      if ((approvalProgress || 0) > 0) newStatus = 'Approved';
    }

    await TransactionTableModel.update(
      { ApprovalProgress: approvalProgress, Status: newStatus },
      { where: { ID: id }, transaction: t }
    );

    await ApprovalAuditModel.create(
      {
        LinkID: varApprovalLink,
        InvoiceLink: varLinkID,
        PositionorEmployee: 'Employee',
        PositionorEmployeeID: userEmployeeID,
        SequenceOrder: approvalOrder,
        ApprovalOrder: numberOfApproverPerSequence,
        ApprovalDate: new Date(),
        RejectionDate: null,
        Remarks: null,
        CreatedBy: strUser,
        CreatedDate: new Date(),
        ApprovalVersion: varTransactionApprovalVersion
      },
      { transaction: t }
    );

    // Update Budget table: handle transfer between budgets
    const transaction = await TransactionTableModel.findByPk(id, { transaction: t });
    if (!transaction) throw new Error(`Transaction ID ${id} not found.`);

    const sourceBudgetID = varBudgetID || transaction.BudgetID;
    const targetBudgetID = transaction.TargetID;
    const transferAmount = parseFloat(transaction.Total || 0);

    console.log('[budgetTransfer.approveTransaction] Updating budgets:', { sourceBudgetID, targetBudgetID, transferAmount });

    const updateBudgetBalances = async (budgetID, amountDelta) => {
      const budget = await BudgetModel.findByPk(budgetID, { transaction: t });
      if (budget) {
        const currentTransfer = parseFloat(budget.Transfer || 0);
        const newTransfer = currentTransfer + amountDelta;

        const appropriation = parseFloat(budget.Appropriation || 0);
        const supplemental = parseFloat(budget.Supplemental || 0);
        const released = parseFloat(budget.Released || 0);

        // Adjusted Appropriation = Appropriation + Supplemental + Transfer
        const newAdjusted = appropriation + supplemental + newTransfer;
        const newBalance = newAdjusted - released;

        await BudgetModel.update(
          {
            Transfer: newTransfer,
            AllotmentBalance: newBalance,
            AppropriationBalance: newBalance,
            ModifyBy: strUser,
            ModifyDate: new Date()
          },
          { where: { ID: budgetID }, transaction: t }
        );
        console.log(`[budgetTransfer.approveTransaction] Budget ${budgetID} updated. New Transfer: ${newTransfer}, New Balance: ${newBalance}`);
      } else {
        console.warn(`[budgetTransfer.approveTransaction] Budget ${budgetID} not found.`);
      }
    };

    // Update source budget (deduct)
    if (sourceBudgetID) {
      await updateBudgetBalances(sourceBudgetID, -transferAmount);
    }

    // Update target budget (add)
    if (targetBudgetID) {
      await updateBudgetBalances(targetBudgetID, transferAmount);
    }

    await t.commit();
    res.json({ success: true, message: 'Data saved successfully.' });
  } catch (err) {
    if (t) await t.rollback();
    console.error('[budgetTransfer.approveTransaction] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.rejectTransaction = async (req, res) => {
  const { ID: id, LinkID: linkId, Reason: reason } = req.body;

  const t = await db.sequelize.transaction();
  try {
    // --- UPDATE Transaction Table ---
    await TransactionTableModel.update(
      { Status: "Rejected" }, // maps to [Transaction Table].Status
      { where: { ID: id }, transaction: t }
    );

    // --- INSERT INTO Approval Audit ---
    await ApprovalAuditModel.create(
      {
        LinkID: linkId,            // [Link ID]
        RejectionDate: new Date(), // GETDATE()
        Remarks: reason,           // rejection reason
        CreatedBy: req.user.id,      // maps to strUser
        CreatedDate: new Date(),   // GETDATE()
      },
      { transaction: t }
    );

    await t.commit();
    res.json({ success: true, message: "Transaction rejected successfully." });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, error: err.message });
  }
};
