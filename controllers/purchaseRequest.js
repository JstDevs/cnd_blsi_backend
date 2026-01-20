const TransactionTableModel = require('../config/database').TransactionTable;
const PurchaseItemsModel = require('../config/database').PurchaseItems;
const AttachmentModel = require('../config/database').Attachment;
const EmployeeModel = require('../config/database').employee;
const ChartOfAccountsModel = require('../config/database').ChartofAccounts;
const DepartmentModel = require('../config/database').department;
const generateLinkID = require("../utils/generateID")
const getLatestApprovalVersion = require('../utils/getLatestApprovalVersion');
const db = require('../config/database')
const { Op, fn, col } = require('sequelize');
const Department = require('../models/Department');

exports.create = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const {
      InvoiceDate,
      InvoiceNumber,
      SAI_No,
      SAIDate,
      ObligationRequestNumber,
      ALOBSDate,
      ContraAccountID,
      Total,
      AmountReceived,
      ResponsibilityCenter,
      OfficeUnitProject,
      Remarks,
      Items = [],
    } = req.body;

    // generate linkID
    const LinkID = generateLinkID();

    const docID = 28;
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

    const newRecord = await TransactionTableModel.create({
      LinkID,
      Status: statusValue,
      APAR: 'Purchase Request',
      DocumentTypeID: docID,
      RequestedBy: req.user.employeeID,
      InvoiceDate,
      InvoiceNumber,
      SAI_No,
      SAIDate,
      ObligationRequestNumber,
      ALOBSDate,
      ContraAccountID,
      Total,
      AmountReceived,
      ResponsibilityCenter,
      OfficeUnitProject,
      Remarks,
      Active: true,
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      ApprovalProgress: 0,
      ApprovalVersion: approvalVersion,
    }, { transaction: t });

    // Insert Purchase Items
    for (const item of Items) {
      await PurchaseItemsModel.create({
        LinkID,
        Quantity: item.Quantity,
        Unit: item.Unit,
        ItemID: item.ItemID,
        Cost: item.Cost
      }, { transaction: t });
    }

    // Insert Attachments    
    if (req.files && req.files.length > 0) {
      const blobAttachments = req.files.map(file => ({
        LinkID,
        DataName: file.originalname,
        DataType: file.mimetype,
        DataImage: `${req.uploadPath}/${file.filename}`
      }));
      await AttachmentModel.bulkCreate(blobAttachments, { transaction: t });
    }
    await t.commit();


    // Fetch with includes and virtual/computed fields
    const transaction = await TransactionTableModel.findOne({
      where: { ID: newRecord.ID },
      attributes: {
        include: [
          [
            fn(
              'CONCAT',
              col('RequestedByEmployee.FirstName'),
              ' ',
              col('RequestedByEmployee.MiddleName'),
              ' ',
              col('RequestedByEmployee.LastName')
            ),
            'RequestedByName'
          ],
          [col('Department.Name'), 'DepartmentName'],
          [col('ContraAccount.Name'), 'ChartOfAccountsName']
        ]
      },
      include: [
        {
          model: PurchaseItemsModel,
          as: 'PurchaseItems',
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
          attributes: [],
          required: false
        },
        {
          model: ChartOfAccountsModel,
          as: 'ContraAccount',
          attributes: [],
          required: false
        },
        {
          model: DepartmentModel,
          as: 'Department',
          attributes: [],
          required: false
        }
      ]
    });


    res.status(201).json(transaction);

  } catch (error) {
    console.error('Error creating purchase request:', error);
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const {
      InvoiceDate,
      Items = [],
      Attachments = [],
    } = req.body;

    const ID = req.params.id;

    // 1. Find transaction by ID
    const existing = await TransactionTableModel.findByPk(ID);
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    // 2. Status must be 'Rejected'
    if (existing.Status !== 'Rejected') {
      throw new Error('Only rejected transactions can be updated.');
    }

    const LinkID = existing.LinkID;

    // 3. Get latest approval version
    const approvalVersion = await getLatestApprovalVersion('Journal Entry Voucher');

    // 4. Update transaction
    await TransactionTableModel.update({
      Status: statusValue,
      RequestedBy: req.user.employeeID,
      InvoiceDate,
      ApprovalProgress: 0,
      ApprovalVersion: approvalVersion,
      ModifyBy: req.user.id,
      ModifyDate: new Date(),
    }, {
      where: { ID },
      transaction: t
    });

    // 5. Delete old purchase items
    await PurchaseItemsModel.destroy({ where: { LinkID }, transaction: t });

    // 6. Insert updated purchase items
    for (const item of Items) {
      await PurchaseItemsModel.create({
        LinkID,
        Quantity: item.Quantity,
        Unit: item.Unit,
        ItemID: item.ItemID,
        Cost: item.Cost,
      }, { transaction: t });
    }


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



    // 8. Fetch updated full data
    const fullData = await TransactionTableModel.findOne({
      where: { ID },
      include: [
        { model: PurchaseItemsModel, as: 'PurchaseItems' },
        { model: AttachmentModel, as: 'Attachments' },
        {
          model: EmployeeModel,
          as: 'RequestedByEmployee',
          attributes: ['ID']
        },
        {
          model: ChartOfAccountsModel,
          as: 'ContraAccount',
          attributes: ['ID'],
          required: false
        }
      ]
    });

    await t.commit();
    res.status(200).json({ message: 'Purchase request updated successfully.', data: fullData });

  } catch (error) {
    await t.rollback();
    console.error('Error updating purchase request:', error);
    res.status(500).json({ error: error.message });
  }
};


exports.getAll = async (req, res) => {
  try {
    const transactions = await TransactionTableModel.findAll({
      attributes: {
        include: [
          [
            fn(
              'CONCAT',
              col('RequestedByEmployee.FirstName'),
              ' ',
              col('RequestedByEmployee.MiddleName'),
              ' ',
              col('RequestedByEmployee.LastName')
            ),
            'RequestedByName'
          ],
          [col('Department.Name'), 'DepartmentName'],
          [col('ContraAccount.Name'), 'ChartOfAccountsName']
        ]
      },
      include: [
        {
          model: PurchaseItemsModel,
          as: 'PurchaseItems',
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
          attributes: [],
          required: false,
        },
        {
          model: ChartOfAccountsModel,
          as: 'ContraAccount',
          attributes: [],
          required: false
        },
        {
          model: DepartmentModel,
          as: 'Department',
          attributes: [],
          required: false
        }
      ],
      where: {
        Active: 1,
        APAR: {
          [Op.like]: `%Purchase Request%`
        }
      },
      order: [['CreatedDate']]
    });

    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message });
  }
};


exports.getById = async (req, res) => {
  try {
    const transaction = await TransactionTableModel.findOne({
      where: { ID: req.params.id },
      include: [
        { model: PurchaseItemsModel, as: 'PurchaseItems' },
        { model: AttachmentModel, as: 'Attachments' },
        { model: EmployeeModel, as: 'RequestedByEmployee' },
        { model: DepartmentModel, as: 'Department' }
      ]
    });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.delete = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const userID = req.user?.id ?? 1;

    const transaction = await TransactionTableModel.findByPk(id, { transaction: t });
    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // --- VOID Transaction ---
    await transaction.update({
      Status: 'Void',
      Active: true,
      ModifyBy: userID,
      ModifyDate: new Date()
    }, { transaction: t });

    // --- LOG TO AUDIT ---
    await db.ApprovalAudit.create({
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
  } catch (error) {
    if (t) await t.rollback();
    console.error('Error voiding purchase request:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.approve = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { ID } = req.body;
    const transaction = await TransactionTableModel.findByPk(ID);
    if (!transaction) throw new Error('Transaction not found');

    const approvalProgress = Number(transaction.ApprovalProgress) || 0;

    await transaction.update({
      Status: 'Approved',
      ApprovalProgress: approvalProgress + 1
    }, { transaction: t });

    // Log to ApprovalAudit
    await db.ApprovalAudit.create({
      LinkID: transaction.LinkID,
      InvoiceLink: transaction.LinkID,
      PositionorEmployee: 'Employee',
      PositionorEmployeeID: req.user.employeeID,
      SequenceOrder: approvalProgress,
      ApprovalDate: new Date(),
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      ApprovalVersion: transaction.ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'Approved successfully' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

exports.reject = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { ID, reason } = req.body;
    const transaction = await TransactionTableModel.findByPk(ID);
    if (!transaction) throw new Error('Transaction not found');

    await transaction.update({
      Status: 'Rejected'
    }, { transaction: t });

    // Log to ApprovalAudit
    await db.ApprovalAudit.create({
      LinkID: transaction.LinkID,
      InvoiceLink: transaction.LinkID,
      RejectionDate: new Date(),
      Remarks: reason || '',
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      ApprovalVersion: transaction.ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'Rejected successfully' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};