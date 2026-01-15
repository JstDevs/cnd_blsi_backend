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
        FundsID: 1,
        Active: true // Set Active to true to satisfy default scope
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
          model: TransactionTable.unscoped(),
          as: 'Transaction',
          required: false,
        }
      ],
      order: [['ID', 'DESC']]
    });

    const flattenedRecords = records.map(r => {
      const json = r.toJSON();
      json.Status = json.Transaction ? json.Transaction.Status : 'Requested';
      return json;
    });

    res.json(flattenedRecords);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'Failed to fetch data.' });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  const t = await db.sequelize.transaction();

  console.log(`--- [PUBLIC MARKET] Voiding record ID: ${id} ---`);

  try {
    // Find the PublicMarketTicketing record to get LinkID
    const ticket = await PublicMarketTicketing.findByPk(id);

    if (!ticket) {
      console.error(`--- [PUBLIC MARKET] Ticket not found for ID: ${id} ---`);
      await t.rollback();
      return res.status(404).json({ error: 'Record not found.' });
    }

    console.log(`--- [PUBLIC MARKET] Found ticket with LinkID: ${ticket.LinkID} ---`);

    // Update TransactionTable Status to 'Void' - Use unscoped() to bypass Active: true requirement
    const [updatedRows] = await TransactionTable.unscoped().update(
      { Status: 'Void' },
      {
        where: { LinkID: ticket.LinkID.toString() },
        transaction: t
      }
    );

    console.log(`--- [PUBLIC MARKET] TransactionTable updated. Rows affected: ${updatedRows} ---`);

    if (updatedRows === 0) {
      console.warn(`--- [PUBLIC MARKET] No TransactionTable record found for LinkID: ${ticket.LinkID} ---`);
    }

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
    console.log(`--- [PUBLIC MARKET] Successfully voided ticket ${id} ---`);
    res.json({ message: 'success' });
  } catch (error) {
    console.error('--- [PUBLIC MARKET] Error voiding record: ---', error);
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
      console.error(`--- [PUBLIC MARKET] Ticket not found for approval. ID: ${id} ---`);
      await t.rollback();
      return res.status(404).json({ error: 'Record not found.' });
    }

    console.log(`--- [PUBLIC MARKET] Approving ticket ID: ${id}, LinkID: ${ticket.LinkID} ---`);

    const transaction = await TransactionTable.unscoped().findOne({
      where: { LinkID: ticket.LinkID.toString() }
    });

    if (!transaction) {
      console.error(`--- [PUBLIC MARKET] TransactionTable record not found for LinkID: ${ticket.LinkID} ---`);
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
    console.log(`--- [PUBLIC MARKET] Successfully approved ticket ${id} ---`);
    res.json({ message: 'success' });
  } catch (error) {
    console.error('--- [PUBLIC MARKET] Error approving record: ---', error);
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
      console.error(`--- [PUBLIC MARKET] Ticket not found for rejection. ID: ${id} ---`);
      await t.rollback();
      return res.status(404).json({ error: 'Record not found.' });
    }

    console.log(`--- [PUBLIC MARKET] Rejecting ticket ID: ${id}, LinkID: ${ticket.LinkID} ---`);

    const transaction = await TransactionTable.unscoped().findOne({
      where: { LinkID: ticket.LinkID.toString() }
    });

    if (!transaction) {
      console.error(`--- [PUBLIC MARKET] TransactionTable record not found for LinkID: ${ticket.LinkID} ---`);
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
    console.log(`--- [PUBLIC MARKET] Successfully rejected ticket ${id} ---`);
    res.json({ message: 'success' });
  } catch (error) {
    console.error('--- [PUBLIC MARKET] Error rejecting record: ---', error);
    if (t) await t.rollback();
    res.status(500).json({ error: error.message });
  }
};
