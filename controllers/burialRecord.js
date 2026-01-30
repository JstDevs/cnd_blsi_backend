// const {  } = require('../config/database');
const { sequelize, BurialRecord, TransactionTable, Attachment, documentType, Customer, employee, ApprovalAudit } = require('../config/database');
const PaymentMethodModel = require('../config/database').paymentMethod;
const db = require('../config/database');
const generateLinkID = require("../utils/generateID")
const { getAllWithAssociations } = require("../models/associatedDependency");
const getLatestApprovalVersion = require('../utils/getLatestApprovalVersion');
const { Op, fn, col, literal } = require('sequelize');

const saveBurialTransaction = async (req, res) => {
  const t = await sequelize.transaction();
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

    const docID = 18;
    let statusValue = '';
    const matrixExists = await db.ApprovalMatrix.findOne({
      where: {
        DocumentTypeID: docID,
        Active: 1,
      },
      transaction: t
    });

    statusValue = matrixExists ? 'Requested' : 'Posted';
    const refID = IsNew ? generateLinkID() : data.LinkID;
    const latestapprovalversion = await getLatestApprovalVersion('Burial Receipt');

    // Fetch and increment Invoice Number for new records
    const documentTypeRecord = await documentType.findOne({
      where: { ID: docID, Active: true },
      attributes: ['CurrentNumber'],
      transaction: t
    });

    if (!documentTypeRecord) {
      throw new Error('Document type not found or inactive');
    }

    const invoiceNumber = IsNew ? (Number(documentTypeRecord.CurrentNumber) + 1) : data.InvoiceNumber;

    if (IsNew && !data.CustomerID && data.CustomerName) {
      try {
        console.log('Creating new Payor:', data.CustomerName);
        const newCustomer = await Customer.create({
          Name: data.CustomerName,
          Active: true,
          CreatedBy: req.user.id,
          CreatedDate: new Date(),
          ModifyBy: req.user.id,
          ModifyDate: new Date()
        }, { transaction: t });
        data.CustomerID = newCustomer.ID;
      } catch (err) {
        console.error('Error creating new Payor:', err);
      }
    }

    // ---------------- Create New Deceased if needed ----------------
    if (IsNew && !data.DeceasedCustomerID && data.DeceasedCustomerName) {
      try {
        console.log('Creating New Deceased:', data.DeceasedCustomerName);
        const newDeceased = await Customer.create({
          Name: data.DeceasedCustomerName,
          Active: true,
          CreatedBy: req.user.id,
          CreatedDate: new Date(),
          ModifyBy: req.user.id,
          ModifyDate: new Date()
        }, { transaction: t });
        data.DeceasedCustomerID = newDeceased.ID; // Update ID for the receipt
      } catch (err) {
        console.error('Error creating deceased:', err);
      }
    }

    // ---------------- Create New Deceased if needed ----------------
    if (IsNew && !data.DeceasedCustomerID && data.DeceasedCustomerName) {
      try {
        console.log('Creating New Deceased:', data.DeceasedCustomerName);
        const newDeceased = await Customer.create({
          Name: data.DeceasedCustomerName,
          Active: true,
          CreatedBy: req.user.id,
          CreatedDate: new Date(),
          ModifyBy: req.user.id,
          ModifyDate: new Date()
        }, { transaction: t });
        data.DeceasedCustomerID = newDeceased.ID; // Update ID for the receipt
      } catch (err) {
        console.error('Error creating deceased:', err);
      }
    }

    if (IsNew) {
      // Create Transaction Table record
      await TransactionTable.create({
        LinkID: refID,
        APAR: 'Burial Receipt',
        DocumentTypeID: docID,
        RequestedBy: req.user.employeeID,
        InvoiceDate: data.InvoiceDate,
        CustomerID: data.CustomerID,
        CustomerName: data.CustomerName,
        ReferenceNumber: data.ReferenceNumber,
        InvoiceNumber: invoiceNumber,
        Total: data.Total,
        PaymentType: data.PaymentTypeID,
        Remarks: data.Remarks,
        Status: statusValue,
        Active: 1,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        Credit: data.Total,
        Debit: data.Total,
        EWT: 0,
        WithheldAmount: 0,
        Municipality: 'Angadanan',
        ApprovalProgress: 0,
        ApprovalVersion: latestapprovalversion,
        FundsID: 1
      }, { transaction: t });


      await documentType.update(
        { CurrentNumber: invoiceNumber },
        {
          where: { ID: docID },
          transaction: t
        }
      );

      // Insert Burial Record
      await BurialRecord.create({
        LinkID: refID,
        CustomerID: data.CustomerID,
        DeceasedCustomerID: data.DeceasedCustomerID,
        Nationality: data.Nationality,
        CauseofDeath: data.CauseofDeath,
        DeathDate: data.DeathDate,
        BurialType: data.BurialType,
        Infectious: data.Infectious,
        Embalmed: data.Embalmed,
        Disposition: data.Disposition,
        Cementery: data.Cementery,
        Sex: data.Sex,
        Age: data.Age,
        CreatedDate: data.InvoiceDate,
        CreatedBy: req.user.id
      }, { transaction: t });

    } else {
      // Update Transaction Table
      await TransactionTable.update({
        APAR: 'Burial Receipt',
        DocumentTypeID: docID,
        RequestedBy: req.user.employeeID,
        InvoiceDate: data.InvoiceDate,
        CustomerID: data.CustomerID,
        CustomerName: data.CustomerName,
        ReferenceNumber: data.ReferenceNumber,
        InvoiceNumber: data.InvoiceNumber,
        Total: data.Total,
        PaymentType: data.PaymentTypeID,
        Remarks: data.Remarks,
        Status: statusValue,
        Active: 1,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        Credit: data.Total,
        Debit: data.Total,
        EWT: 0,
        WithheldAmount: 0,
        ApprovalProgress: 0,
        ApprovalVersion: latestapprovalversion
      }, {
        where: { LinkID: refID },
        transaction: t
      });

      await BurialRecord.update({
        CustomerID: data.CustomerID,
        DeceasedCustomerID: data.DeceasedCustomerID,
        Nationality: data.Nationality,
        CauseofDeath: data.CauseofDeath,
        DeathDate: data.DeathDate,
        BurialType: data.BurialType,
        Infectious: data.Infectious,
        Embalmed: data.Embalmed,
        Disposition: data.Disposition,
        Cementery: data.Cementery,
        Sex: data.Sex,
        Age: data.Age,
        CreatedDate: data.InvoiceDate,
        CreatedBy: req.user.id
      }, {
        where: { LinkID: refID },
        transaction: t
      });
    }

    // Attachment handling
    const existingIDs = Attachments.filter(att => att.ID).map(att => att.ID);

    // Delete attachments removed from the list
    await Attachment.destroy({
      where: {
        LinkID: refID,
        ID: { [Op.notIn]: existingIDs }
      },
      transaction: t
    });

    // Add new files
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        LinkID: refID,
        DataName: file.originalname,
        DataType: file.mimetype,
        DataImage: `${req.uploadPath}/${file.filename}`
      }));
      await Attachment.bulkCreate(newAttachments, { transaction: t });
    }

    await t.commit();
    res.status(201).json({ message: 'success' });
  } catch (error) {
    console.error('Error saving:', error);
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
}

const getAll = async (req, res) => {
  try {
    const results = await TransactionTable.findAll({
      where: {
        Active: 1,
        APAR: {
          [Op.like]: '%Burial Receipt%'
        }
      },
      attributes: {
        include: [
          [
            literal("CONCAT(`RequestedByEmployee`.`FirstName`, ' ', `RequestedByEmployee`.`MiddleName`, ' ', `RequestedByEmployee`.`LastName`)"),
            'RequestedByName'
          ],
        ]
      },
      include: [
        {
          model: documentType,
          as: 'DocumentType',
          required: false
        },
        {
          model: Customer,
          as: 'Customer',
          required: false
        },
        {
          model: BurialRecord,
          as: 'BurialRecord',
          required: false
        },
        {
          model: employee,
          as: 'RequestedByEmployee',
          required: false,
        }
      ],
      order: [['CreatedDate', 'DESC']],
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const getById = async (req, res) => {
  try {
    const item = await BurialRecord.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "BurialRecord not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteRecord = async (req, res) => {
  const transactionId = req.params.id;
  const t = await sequelize.transaction();

  try {
    const trx = await TransactionTable.findOne({ where: { ID: transactionId }, transaction: t });

    if (!trx) {
      await t.rollback();
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Update status to Void instead of hard delete
    await trx.update(
      { Status: 'Void' },
      { transaction: t }
    );

    // Log to ApprovalAudit
    await ApprovalAudit.create({
      LinkID: trx.LinkID,
      InvoiceLink: trx.LinkID,
      RejectionDate: new Date(),
      Remarks: 'Voided',
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      ApprovalVersion: trx.ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.status(200).json({ message: 'Success' });

  } catch (error) {
    await t.rollback();
    console.error('Error deleting transaction:', error);
    return res.status(500).json({ error: error.message || 'Server error.' });
  }
};

const approve = async (req, res) => {
  const { ID } = req.body;
  const t = await sequelize.transaction();
  try {
    const trx = await TransactionTable.findOne({ where: { ID }, transaction: t });

    if (!trx) throw new Error('Transaction not found.');

    await trx.update({ Status: 'Posted' }, { transaction: t });

    await ApprovalAudit.create({
      LinkID: trx.LinkID,
      InvoiceLink: trx.LinkID,
      PositionorEmployee: "Employee",
      PositionorEmployeeID: req.user.employeeID,
      SequenceOrder: trx.ApprovalProgress,
      ApprovalOrder: 0,
      ApprovalDate: new Date(),
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      ApprovalVersion: trx.ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'Transaction approved successfully.' });
  } catch (error) {
    await t.rollback();
    console.error('Error approving transaction:', error);
    res.status(500).json({ error: error.message || 'Server error.' });
  }
};

const reject = async (req, res) => {
  const { ID, reason } = req.body;
  const t = await sequelize.transaction();

  try {
    const trx = await TransactionTable.findOne({ where: { ID }, transaction: t });

    if (!trx) throw new Error('Transaction not found.');

    await trx.update({ Status: 'Rejected' }, { transaction: t });

    await ApprovalAudit.create({
      LinkID: trx.LinkID,
      InvoiceLink: trx.LinkID,
      RejectionDate: new Date(),
      Remarks: reason,
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      ApprovalVersion: trx.ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'Transaction rejected successfully.' });
  } catch (error) {
    await t.rollback();
    console.error('Error rejecting transaction:', error);
    res.status(500).json({ error: error.message || 'Server error.' });
  }
};

const getCurrentNumber = async (req, res) => {
  try {
    const record = await documentType.findOne({
      where: {
        ID: 18,
        Active: 1
      },
      attributes: ['CurrentNumber']
    });

    if (!record) {
      return res.status(404).json({ message: 'Document type not found or inactive' });
    }

    const incrementedValue = Number(record.CurrentNumber) + 1;

    res.status(200).json({ CurrentNumber: incrementedValue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to fetch current number' });
  }
};

module.exports = {
  saveBurialTransaction,
  getAll,
  getById,
  delete: deleteRecord,
  approve,
  reject,
  getCurrentNumber
};
