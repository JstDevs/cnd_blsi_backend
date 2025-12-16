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

    const amount = parseFloat(data.Transfer);

    const LinkID = IsNew ? generateLinkID() : data.LinkID;

    const docTypeID = 22; // Budget Transfer
    const doc = await DocumentTypeModel.findByPk(docTypeID, { transaction: t });
    if (!doc) throw new Error(`Document type ID ${docTypeID} not found.`);

    const invoiceText = `${doc.Prefix}-${doc.CurrentNumber}-${doc.Suffix}`;
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
    const id = req.params.id;
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
