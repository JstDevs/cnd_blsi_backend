const { PublicMarketTicketing, TransactionTable, ApprovalAudit } = require('../config/database');
const { Op } = require('sequelize');
const db = require('../config/database');
const generateLinkID = require("../utils/generateID")

exports.save = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const data = req.body;

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

    const refID = IsNew ? generateLinkID() : data.LinkID;
    const docID = 30;

    if (IsNew) {
      // INSERT PublicMarketTicketing
      await PublicMarketTicketing.create({
        LinkID: refID,
        Items: data.Items,
        StartTime: data.StartTime,
        EndTime: data.EndTime,
        IssuedBy: data.IssuedBy,
        DateIssued: data.DateIssued,
        AmountIssued: data.AmountIssued,
        PostingPeriod: data.PostingPeriod,
        Remarks: data.Remarks,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        Active: true
      }, { transaction: t });

      // INSERT TransactionTable
      await TransactionTable.create({
        LinkID: refID,
        Status: 'Requested',
        APAR: 'Public Market Ticketing',
        DocumentTypeID: docID,
        InvoiceDate: new Date(),
        Total: data.AmountIssued,
        FundsID: 1
      }, { transaction: t });

    } else {
      // UPDATE PublicMarketTicketing
      await PublicMarketTicketing.update({
        Items: data.Items,
        StartTime: data.StartTime,
        EndTime: data.EndTime,
        IssuedBy: data.IssuedBy,
        DateIssued: data.DateIssued,
        AmountIssued: data.AmountIssued,
        PostingPeriod: data.PostingPeriod,
        Remarks: data.Remarks
      }, {
        where: { ID: data.ID },
        transaction: t
      });

      // UPDATE TransactionTable
      await TransactionTable.update({
        Total: data.AmountIssued
      }, {
        where: { LinkID: refID },
        transaction: t
      });
    }

    await t.commit();
    return res.json({ message: 'success' });
  } catch (error) {
    console.error('Error saving:', error);
    await t.rollback();
    return res.status(500).json({ error: 'Failed to save data.' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const records = await PublicMarketTicketing.findAll({
      where: {
        Active: true
      },
      include: [
        {
          model: TransactionTable,
          as: 'Transaction',
          required: false,
        }
      ],
      order: [['ID', 'DESC']]
    });

    res.json(records);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'Failed to fetch data.' });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  const t = await db.sequelize.transaction();

  try {
    // Find the PublicMarketTicketing record to get LinkID
    const ticket = await PublicMarketTicketing.findByPk(id);

    if (!ticket) {
      await t.rollback();
      return res.status(404).json({ error: 'Record not found.' });
    }

    // Update TransactionTable Status to 'Void'
    await TransactionTable.update(
      { Status: 'Void' },
      {
        where: { LinkID: ticket.LinkID },
        transaction: t
      }
    );

    // INSERT INTO Approval Audit (Void Action)
    await ApprovalAudit.create(
      {
        LinkID: generateLinkID(),
        InvoiceLink: ticket.LinkID,
        Remarks: "Transaction Voided by User",
        CreatedBy: req.user.id,
        CreatedDate: new Date()
      },
      { transaction: t }
    );

    await t.commit();
    res.json({ message: 'success' });
  } catch (error) {
    console.error('Error voiding record:', error);
    if (t) await t.rollback();
    res.status(500).json({ error: 'Failed to void record.' });
  }
};

exports.approve = async (req, res) => {
  const { id } = req.params;
  const t = await db.sequelize.transaction();

  try {
    const ticket = await PublicMarketTicketing.findByPk(id);
    if (!ticket) {
      await t.rollback();
      return res.status(404).json({ error: 'Record not found.' });
    }

    const transaction = await TransactionTable.findOne({
      where: { LinkID: ticket.LinkID }
    });

    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ error: 'Transaction record not found.' });
    }

    if (transaction.Status === 'Void') {
      throw new Error("Cannot approve a Voided record.");
    }

    // Update Status to Posted (Simplified approval for public market)
    await transaction.update({
      Status: 'Posted',
      ApprovalProgress: (transaction.ApprovalProgress || 0) + 1
    }, { transaction: t });

    // Insert into Approval Audit
    await ApprovalAudit.create({
      LinkID: generateLinkID(),
      InvoiceLink: ticket.LinkID,
      PositionorEmployeeID: req.user.employeeID,
      ApprovalDate: new Date(),
      CreatedBy: req.user.id,
      CreatedDate: new Date()
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'success' });
  } catch (error) {
    console.error('Error approving record:', error);
    if (t) await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

exports.reject = async (req, res) => {
  const { id } = req.params;
  const t = await db.sequelize.transaction();

  try {
    const ticket = await PublicMarketTicketing.findByPk(id);
    if (!ticket) {
      await t.rollback();
      return res.status(404).json({ error: 'Record not found.' });
    }

    const transaction = await TransactionTable.findOne({
      where: { LinkID: ticket.LinkID }
    });

    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ error: 'Transaction record not found.' });
    }

    // Update Status to Rejected
    await transaction.update({
      Status: 'Rejected'
    }, { transaction: t });

    // Insert into Approval Audit
    await ApprovalAudit.create({
      LinkID: generateLinkID(),
      InvoiceLink: ticket.LinkID,
      PositionorEmployeeID: req.user.employeeID,
      RejectionDate: new Date(),
      Remarks: req.body.Remarks || "Rejected by user",
      CreatedBy: req.user.id,
      CreatedDate: new Date()
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'success' });
  } catch (error) {
    console.error('Error rejecting record:', error);
    if (t) await t.rollback();
    res.status(500).json({ error: error.message });
  }
};
