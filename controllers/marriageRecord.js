// const {  } = require('../config/database');
const { sequelize, MarriageRecord, TransactionTable, Attachment, documentType, Customer, employee, ApprovalAudit } = require('../config/database');
const PaymentMethodModel = require('../config/database').paymentMethod;
const db = require('../config/database');
const generateLinkID = require("../utils/generateID")
const {getAllWithAssociations}=require("../models/associatedDependency");
const getLatestApprovalVersion = require('../utils/getLatestApprovalVersion');
const { Op, fn, col, literal } = require('sequelize');
const Position = require('../models/Position');

exports.saveTransaction = async (req, res) => {
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
    if((data.IsNew == "true") || (data.IsNew === true) || (data.IsNew == '1') || (data.IsNew == 1)) {
      IsNew = true;
    }
    else if((data.IsNew == "false") || (data.IsNew === false) || (data.IsNew == '0') || (data.IsNew == 0)) {
      IsNew = false;
    }
    else {
      throw new Error('Invalid value for IsNew. Expected true or false.');
    }

    const docID = 19;

    const refID = IsNew ? generateLinkID() : data.LinkID;
    const latestapprovalversion=await getLatestApprovalVersion('Marriage Receipt');

    if (IsNew) {
      // Create Transaction Table record
      await TransactionTable.create({
        LinkID: refID,
        APAR: 'Marriage Receipt',
        DocumentTypeID: docID,
        RequestedBy: req.user.employeeID,
        InvoiceDate: data.InvoiceDate,
        CustomerID: data.CustomerID,
        CustomerName: data.CustomerName,
        InvoiceNumber: data.InvoiceNumber,
        Total: data.Total,
        PaymentType: 'test',
        Remarks: data.Remarks,
        Status: 'Requested',
        Active: 1,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        Credit: data.Total,
        Debit: data.Total,
        VATExcludedPrice: data.Total,
        EWT: 0,
        WithheldAmount: 0,
        Vat_Total: 0,
        AmountDue: data.Total,
        ApprovalProgress: 0,
        ApprovalVersion: latestapprovalversion,
        FundsID: 1
      }, { transaction: t });

      
      await documentType.increment(
        { CurrentNumber: 1 },
        {
          where: { ID: docID },
          transaction: t
        }
      );

      // Insert Marriage Record
      await MarriageRecord.create({
        LinkID: refID,
        CustomerID: data.CustomerID,
        CustomerAge: data.CustomerAge,
        MarytoID: data.MarytoID,
        MarrytoAge: data.MarrytoAge,
        Cenomar: data.Cenomar,
        RegisterNumber: data.RegisterNumber,
        CreatedBy: req.user.employeeID,
        CreatedDate: data.InvoiceDate,
      }, { transaction: t });

    } else {
      // Update Transaction Table
      await TransactionTable.update({
        APAR: 'Marriage Receipt',
        DocumentTypeID: docID,
        RequestedBy: req.user.employeeID,
        InvoiceDate: data.InvoiceDate,
        CustomerID: data.CustomerID,
        CustomerName: data.CustomerName,
        InvoiceNumber: data.InvoiceNumber,
        Total: data.Total,
        PaymentType: 'test',
        Remarks: data.Remarks,
        Status: 'Requested',
        Active: 1,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        Credit: 0,
        Debit: data.Total,
        VATExcludedPrice: data.Total,
        EWT: 0,
        WithheldAmount: 0,
        Vat_Total: 0,
        AmountDue: data.Total,
        ApprovalProgress: 0,
        ApprovalVersion: latestapprovalversion
      }, {
        where: { LinkID: refID },
        transaction: t
      });

      await MarriageRecord.update({
        CustomerID: data.CustomerID,
        CustomerAge: data.CustomerAge,
        MarytoID: data.MarytoID,
        MarrytoAge: data.MarrytoAge,
        Cenomar: data.Cenomar,
        RegisterNumber: data.RegisterNumber,
        ModifyBy: req.user.employeeID,
        ModifyDate: data.InvoiceDate,
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

exports.getAll = async (req, res) => {
  try {
    const results = await TransactionTable.findAll({
      where: {
        Active: 1,
        APAR: {
          [Op.like]: '%Marriage Receipt%'
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


exports.getById = async (req, res) => {
  try {
    const item = await MarriageRecord.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "MarriageRecord not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  const transactionId = req.params.id;
  try {
    await TransactionTable.destroy({
      where: {
        ID: transactionId
      }
    });

    res.status(200).json({ message: 'Success' });

  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({ error: error.message || 'Server error.' });
  }
};

exports.approve = async (req, res) => {
  const { ID } = req.body;
  const t = await sequelize.transaction();
  try {
    const trx = await TransactionTable.findOne({ where: { ID }, transaction: t });

    if (!trx) throw new Error('Transaction not found.');

    await trx.update({ Status: 'Approved' }, { transaction: t });

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
    res.status(500).json({ error: error.message });
  }
};

exports.reject = async (req, res) => {
  const { ID } = req.body;
  const t = await sequelize.transaction();
  try {
    const trx = await TransactionTable.findOne ({ where: { ID }, transaction: t });

    if (!trx) throw new Error('Transaction not found.');

    await trx.update({ Status: ' Rejected ' }, { transaction: t });

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
    res.json({ message: 'Transaction rejected successfully.' });
     
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};
