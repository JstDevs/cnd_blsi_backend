const db = require('../config/database');
const TransactionTable = db.TransactionTable;
const ApprovalAudit = db.ApprovalAudit;
const { TransactionItems } = db;
const { Op } = require('sequelize');

exports.approve = async (req, res) => {
  const { ID } = req.body;
  const id = ID;

  const t = await db.sequelize.transaction();
  try {
    const trx = await TransactionTable.findOne({ where: { ID: id }, transaction: t });
    if (!trx) return res.status(404).json({ error: 'Transaction not found' });

    const approvalProgress = Number(trx.ApprovalProgress) || 0;

    await trx.update({ ApprovalProgress: approvalProgress + 1, Status: 'Posted' }, { transaction: t });

    await ApprovalAudit.create({
      LinkID: trx.LinkID,
      InvoiceLink: trx.LinkID,
      PositionorEmployee: 'Employee',
      PositionorEmployeeID: req.user?.employeeID || null,
      SequenceOrder: approvalProgress,
      ApprovalDate: new Date(),
      CreatedBy: req.user?.id || null,
      CreatedDate: new Date(),
      ApprovalVersion: trx.ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'Approved successfully' });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.reject = async (req, res) => {
  const { ID } = req.body;
  const id = ID;

  const t = await db.sequelize.transaction();
  try {
    const trx = await TransactionTable.findOne({ where: { ID: id }, transaction: t });
    if (!trx) return res.status(404).json({ error: 'Transaction not found' });

    await trx.update({ Status: 'Rejected', ApprovalProgress: 0 }, { transaction: t });

    await ApprovalAudit.create({
      LinkID: trx.LinkID,
      InvoiceLink: trx.LinkID,
      RejectionDate: new Date(),
      Remarks: req.body.reason || '',
      CreatedBy: trx.CreatedBy,
      CreatedDate: new Date(),
      ApprovalVersion: trx.ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'Transaction rejected successfully' });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
