const db=require('../config/database')
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
    if((data.IsNew == "true") || (data.IsNew === true) || (data.IsNew == '1') || (data.IsNew == 1)) {
      IsNew = true;
    }
    else if((data.IsNew == "false") || (data.IsNew === false) || (data.IsNew == '0') || (data.IsNew == 0)) {
      IsNew = false;
    }
    else {
      throw new Error('Invalid value for IsNew. Expected true or false.');
    }

    const userID = req.user.id;
    const amount = parseFloat(data.Supplemental);
    const LinkID = IsNew ? generateLinkID() : data.LinkID;

    const docTypeID = 21; // Budget Supplemental
    const doc = await DocumentTypeModel.findByPk(docTypeID, { transaction: t });
    if (!doc) throw new Error(`Document type ID ${docTypeID} not found.`);

    const invoiceText = `${doc.Prefix}-${doc.CurrentNumber}-${doc.Suffix}`;
    const approvalVersion = await getLatestApprovalVersion('Budget Supplemental');

    if (IsNew) {
      // INSERT Transaction Table
      await TransactionTableModel.create({
        LinkID: LinkID,
        Status: 'Requested',
        APAR: 'Budget Supplemental',
        DocumentTypeID: docTypeID,
        RequestedBy: req.user.id,
        InvoiceDate: new Date(),
        InvoiceNumber: invoiceText,
        Total: amount,
        Active: true,
        Remarks: data.Remarks,
        CreatedBy: userID,
        CreatedDate: new Date(),
        ApprovalProgress: 0,
        BudgetID: data.BudgetID,
        ApprovalVersion: approvalVersion
      }, { transaction: t });

      // Update Document Number
      await DocumentTypeModel.update(
        { CurrentNumber: doc.CurrentNumber + 1 },
        { where: { ID: docTypeID }, transaction: t }
      );
    } else {
      // UPDATE Transaction Table
      await TransactionTableModel.update({
        ModifyBy: userID,
        ModifyDate: new Date(),
        Total: amount,
        Remarks: data.Remarks,
        ApprovalProgress: 0,
        Status: 'Requested'
      }, {
        where: { LinkID: LinkID },
        transaction: t
      });

      // DELETE old Transaction Items if needed (example)
      await TransactionItemModel.destroy({
        where: { LinkID: LinkID },
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
    res.json({ message: 'success' });
  } catch (error) {
    console.error(error);
    await t.rollback();
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

exports.budgetList = async (req, res) => {
  try {
    const results = await BudgetModel.findAll({
      where: { Active: true },
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
      order: [['TotalAmount', 'ASC']],
    });

    res.json(results);
  } catch (error) {
    console.error('Error loading budget data grid:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
};

exports.list = async (req, res) => {
  try {
    const transactions = await TransactionTableModel.findAll({
      where: {
        Active: true,
        APAR: {
          [Op.like]: '%Budget Supplemental%'
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

    res.json(transactions);
  } catch (error) {
    console.error('Error loading:', error);
    res.status(500).json({ error: error.message || 'Failed to load data' });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.params.id || req.body.ID || req.body.id;
    console.log('[budgetSupplemental.delete] called, params.id=', req.params.id, 'body=', req.body);
    // Soft delete - set Active = false on TransactionTable
    const userID = req.user?.id ?? 1;
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
          APAR: { [Op.like]: '%Budget Supplemental%' }
        },
      }
    );

    if (updated) {
      res.json({ message: 'success' });
    } else {
      res.status(404).json({ message: 'not found or already deleted' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};



exports.approveTransaction = async (req, res) => {
  const { 
    id,                   // Transaction ID
    approvalProgress,     // approvalProgress
    varApprovalLink,      // approval link
    varLinkID,            // invoice link
    approvalOrder,        // sequence order
    numberOfApproverPerSequence,
    userEmployeeID,
    strUser,
    varTransactionApprovalVersion,
    varBudgetID
  } = req.body;

  const action = "Approve";

  const t = await db.sequelize.transaction();
  try {
    // --- UPDATE Transaction Table ---
    if (action === "Post") {
      await TransactionTableModel.update(
        {
          approvalProgress,
          status: "Posted"
        },
        { where: { id }, transaction: t }
      );

      // --- UPDATE Budget ---
      await Budget.update(
        {
          supplemental: await putCurrentSupplementalBudget(t),
          totalAmount: await updateTotalAmountBudget(t)
        },
        { where: { id: varBudgetID }, transaction: t }
      );

    } else if (action === "Approve") {
      // If multiple approvers required, can check numberOfApproverPerSequence here
      await TransactionTableModel.update(
        { approvalProgress },
        { where: { id }, transaction: t }
      );
    }

    // --- INSERT INTO Approval Audit ---
    await ApprovalAuditModel.create(
      {
        linkId: varApprovalLink,
        invoiceLink: varLinkID,
        positionOrEmployee: "Employee",
        positionOrEmployeeId: userEmployeeID,
        sequenceOrder: approvalOrder,
        approvalOrder: numberOfApproverPerSequence,
        approvalDate: new Date(),
        rejectionDate: null,
        remarks: null,
        createdBy: strUser,
        createdDate: new Date(),
        approvalVersion: varTransactionApprovalVersion
      },
      { transaction: t }
    );

    // Commit
    await t.commit();
    res.json({ success: true, message: "Data saved successfully." });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.rejectTransaction = async (req, res) => {
  const { 
    ID: id,               // Transaction ID (dgList.Item(0, row).Value)
    LinkID: varApprovalLink,  // Link ID
    Reason: reasonForRejection,
  } = req.body;

  const t = await db.sequelize.transaction();

  try {
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
    res.json({ message: "Transaction rejected successfully." });

  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};
