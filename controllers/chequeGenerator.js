const db = require('../config/database')
const BudgetModel = require('../config/database').Budget;
const DocumentTypeModel = require('../config/database').documentType;
const TransactionTableModel = require('../config/database').TransactionTable;
const AttachmentModel = require('../config/database').Attachment;
const CheckModel = require('../config/database').Check;
const ApprovalAuditModel = require('../config/database').ApprovalAudit;
const TransactionItemModel = require('../config/database').TransactionItems;
const FiscalYearModel = require('../config/database').FiscalYear;
const DepartmentModel = require('../config/database').department;
const SubDepartmentModel = require('../config/database').subDepartment;
const ChartOfAccountsModel = require('../config/database').ChartofAccounts;
const FundModel = require('../config/database').Funds;
const ProjectModel = require('../config/database').Project;

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

    let AddCondition = '';
    if ((data.AddCondition == "true") || (data.AddCondition === true) || (data.AddCondition == '1') || (data.AddCondition == 1)) {
      AddCondition = true;
    }
    else if ((data.AddCondition == "false") || (data.AddCondition === false) || (data.AddCondition == '0') || (data.AddCondition == 0)) {
      AddCondition = false;
    }
    else {
      throw new Error('Invalid value for AddCondition. Expected true or false.');
    }

    const refID = IsNew ? generateLinkID() : data.LinkID;
    const userID = req.user.id;
    const approvalVersion = await getLatestApprovalVersion('Check');

    let statusValue = '';
    const matrixExists = await db.ApprovalMatrix.findOne({
      where: {
        DocumentTypeID: 25,
        Active: 1,
      },
      transaction: t
    });

    statusValue = matrixExists ? 'Requested' : 'Posted';

    if (IsNew) {
      await CheckModel.create({
        Status: statusValue,
        LinkID: refID,
        DisbursementID: data.DisbursementID,
        BankID: data.BankID,
        SignatoryType: data.SignatoryType,
        AccountNumber: data.AccountNumber,
        AccountName: data.AccountName,
        CheckNumber: data.CheckNumber,
        BRSTN: data.BRSTN,
        CheckDate: data.CheckDate,
        Payee: data.Payee,
        Amount: data.Amount,
        Words: data.Words,
        SignatoryOneID: data.SignatoryOneID,
        SignatoryTwoID: data.SignatoryTwoID,
        Remarks: data.Remarks,
        Active: true,
        CreatedBy: userID,
        CreatedDate: new Date(),
        ApprovalProgress: 0,
        ApprovalVersion: approvalVersion
      }, { transaction: t });

      if (AddCondition) {
        // If the cheque is auto-posted or even if requested, the user considers the "Posting" process to be the link.
        // However, to be safe, if statusValue is 'Posted', it's definitely 'Cheque Posted'.
        // If it's 'Requested', it might still need approval, but the user expects the dropdown and status to reflect the work done.

        await TransactionTableModel.update(
          { Status: 'Posted, Cheque Posted' },
          { where: { LinkID: data.DisbursementID }, transaction: t }
        );

        if (statusValue === 'Posted') {
          const dv = await TransactionTableModel.findOne({
            where: { LinkID: data.DisbursementID },
            transaction: t
          });
          if (dv && dv.FundsID) {
            const fund = await FundModel.findByPk(dv.FundsID, { transaction: t });
            if (fund) {
              await fund.update({
                Balance: parseFloat(fund.Balance || 0) - parseFloat(data.Amount || 0)
              }, { transaction: t });
            }
          }
        }

        await TransactionTableModel.update(
          { Status: 'Posted, Disbursement Posted, Cheque Posted' },
          {
            where: {
              InvoiceNumber: data.OBR,
              APAR: {
                [Op.or]: [
                  { [Op.like]: "Obligation Request%" },
                  { [Op.like]: "Fund Utilization Request%" }
                ]
              }
            },
            transaction: t
          }
        );
      }
    } else {
      await CheckModel.update({
        Status: statusValue,
        DisbursementID: data.DisbursementID,
        BankID: data.BankID,
        SignatoryType: data.SignatoryType,
        AccountNumber: data.AccountNumber,
        AccountName: data.AccountName,
        CheckNumber: data.CheckNumber,
        BRSTN: data.BRSTN,
        CheckDate: data.CheckDate,
        Payee: data.Payee,
        Amount: data.Amount,
        Words: data.Words,
        SignatoryOneID: data.SignatoryOneID,
        SignatoryTwoID: data.SignatoryTwoID,
        Remarks: data.Remarks,
        Active: true,
        ModifyBy: userID,
        ModifyDate: new Date(),
        ApprovalProgress: 0,
        ApprovalVersion: approvalVersion
      }, {
        where: { ID: data.ID },
        transaction: t
      });

      if (AddCondition) {
        await TransactionTableModel.update(
          { Status: 'Posted, Cheque Posted' },
          { where: { LinkID: data.DisbursementID }, transaction: t }
        );

        if (statusValue === 'Posted') {
          const dv = await TransactionTableModel.findOne({
            where: { LinkID: data.DisbursementID },
            transaction: t
          });
          if (dv && dv.FundsID) {
            const fund = await FundModel.findByPk(dv.FundsID, { transaction: t });
            if (fund) {
              await fund.update({
                Balance: parseFloat(fund.Balance || 0) - parseFloat(data.Amount || 0)
              }, { transaction: t });
            }
          }
        }

        await TransactionTableModel.update(
          { Status: 'Posted, Disbursement Posted, Cheque Posted' },
          {
            where: {
              InvoiceNumber: data.OBR,
              APAR: {
                [Op.or]: [
                  { [Op.like]: "Obligation Request%" },
                  { [Op.like]: "Fund Utilization Request%" }
                ]
              }
            },
            transaction: t
          }
        );
      }
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
  } catch (err) {
    await t.rollback();
    console.error('Save Check Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.checkList = async (req, res) => {
  try {
    const checks = await CheckModel.findAll({
      where: { Active: true },
      include: [
        {
          model: TransactionTableModel,
          as: 'Disbursement',
          required: false,
          attributes: ['FundsID', 'InvoiceDate', 'InvoiceNumber']
        }
      ]
    });

    res.json(checks);
  } catch (err) {
    console.error('Error loading checks:', err);
    res.status(500).json({ error: 'Error loading checks.', details: err.message });
  }
};

exports.delete = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const id = req.body.ID || req.params.id;

    if (!id) {
      throw new Error('ID is required for voiding/deleting');
    }

    const check = await CheckModel.findByPk(id, { transaction: t });
    if (!check) {
      await t.rollback();
      return res.status(404).json({ error: 'Check not found' });
    }

    // --- Void Check ---
    const oldStatus = check.Status;
    await check.update({
      Status: 'Void',
      ModifyBy: req.user.id,
      ModifyDate: new Date()
    }, { transaction: t });

    // --- Update Fund Balance if previously Posted ---
    if (oldStatus === 'Posted' && check.DisbursementID) {
      const dv = await TransactionTableModel.findOne({
        where: { LinkID: check.DisbursementID },
        transaction: t
      });
      if (dv && dv.FundsID) {
        const fund = await FundModel.findByPk(dv.FundsID, { transaction: t });
        if (fund) {
          await fund.update({
            Balance: parseFloat(fund.Balance || 0) + parseFloat(check.Amount || 0)
          }, { transaction: t });
        }
      }
    }

    // --- Revert Related TransactionTable (DV and OBR) ---
    if (check.DisbursementID) {
      // Find the DV first to get OBR info and reduce sequential updates if possible
      const dv = await TransactionTableModel.findOne({
        where: { LinkID: check.DisbursementID },
        transaction: t
      });

      if (dv) {
        // Update DV status
        await dv.update({ Status: 'Posted, Cheque Pending' }, { transaction: t });

        if (dv.ObligationRequestNumber) {
          // Update OBR status using exact match for APAR to speed up query
          await TransactionTableModel.update(
            { Status: 'Posted, Disbursement Posted' },
            {
              where: {
                InvoiceNumber: dv.ObligationRequestNumber,
                APAR: {
                  [Op.or]: [
                    { [Op.like]: "Obligation Request%" },
                    { [Op.like]: "Fund Utilization Request%" }
                  ]
                }
              },
              transaction: t
            }
          );
        }
      }
    }

    // --- Log Void Action ---
    await ApprovalAuditModel.create({
      LinkID: generateLinkID(),
      InvoiceLink: check.LinkID,
      RejectionDate: new Date(),
      Remarks: "Cheque Voided by User",
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      ApprovalVersion: check.ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: "Cheque voided successfully." });

  } catch (err) {
    if (t) await t.rollback();
    console.error("Error voiding cheque:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.approve = async (req, res) => {
  const { ID } = req.body;
  const t = await db.sequelize.transaction();

  try {
    const check = await CheckModel.findOne({
      where: { ID },
      transaction: t
    });

    if (!check) throw new Error('Check not found');

    if (check.Status === 'Posted') {
      await t.rollback();
      return res.json({ message: 'Check already posted.' });
    }

    // 1. Update Check Status
    await check.update({ Status: 'Posted' }, { transaction: t });

    // 2. Update Related TransactionTable (DV)
    if (check.DisbursementID) {
      await TransactionTableModel.update(
        { Status: 'Posted, Cheque Posted' },
        { where: { LinkID: check.DisbursementID }, transaction: t }
      );

      // Find the DV to get the OBR link if any
      const dv = await TransactionTableModel.findOne({
        where: { LinkID: check.DisbursementID },
        transaction: t
      });

      if (dv && dv.ObligationRequestNumber) {
        await TransactionTableModel.update(
          { Status: 'Posted, Disbursement Posted, Cheque Posted' },
          {
            where: {
              InvoiceNumber: dv.ObligationRequestNumber,
              APAR: {
                [Op.or]: [
                  { [Op.like]: "Obligation Request%" },
                  { [Op.like]: "Fund Utilization Request%" }
                ]
              }
            },
            transaction: t
          }
        );
      }

      // Update Fund Balance
      if (dv && dv.FundsID) {
        const fund = await FundModel.findByPk(dv.FundsID, { transaction: t });
        if (fund) {
          await fund.update({
            Balance: parseFloat(fund.Balance || 0) - parseFloat(check.Amount || 0)
          }, { transaction: t });
        }
      }
    }

    // 3. Log Approval
    await ApprovalAuditModel.create({
      LinkID: check.LinkID,
      InvoiceLink: check.LinkID,
      PositionorEmployee: "Employee",
      PositionorEmployeeID: req.user.employeeID,
      SequenceOrder: check.ApprovalProgress,
      ApprovalOrder: 0,
      ApprovalDate: new Date(),
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      ApprovalVersion: check.ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'Approved successfully' });
  } catch (err) {
    await t.rollback();
    console.error('Approve Check Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.reject = async (req, res) => {
  const { ID, reason } = req.body;
  const t = await db.sequelize.transaction();

  try {
    const check = await CheckModel.findOne({
      where: { ID },
      transaction: t
    });

    if (!check) throw new Error('Check not found');

    // 1. Update Check Status
    await check.update({ Status: 'Rejected' }, { transaction: t });

    // 2. Update Related TransactionTable (DV)
    if (check.DisbursementID) {
      await TransactionTableModel.update(
        { Status: 'Posted, Cheque Pending' },
        { where: { LinkID: check.DisbursementID }, transaction: t }
      );

      // Find the DV to get the OBR link if any
      const dv = await TransactionTableModel.findOne({
        where: { LinkID: check.DisbursementID },
        transaction: t
      });

      if (dv && dv.ObligationRequestNumber) {
        await TransactionTableModel.update(
          { Status: 'Posted, Disbursement Posted, Cheque Rejected' },
          {
            where: {
              InvoiceNumber: dv.ObligationRequestNumber,
              APAR: {
                [Op.or]: [
                  { [Op.like]: "Obligation Request%" },
                  { [Op.like]: "Fund Utilization Request%" }
                ]
              }
            },
            transaction: t
          }
        );
      }
    }

    // 3. Log Rejection
    await ApprovalAuditModel.create({
      LinkID: check.LinkID,
      InvoiceLink: check.LinkID,
      PositionorEmployee: "Employee",
      PositionorEmployeeID: req.user.employeeID,
      SequenceOrder: check.ApprovalProgress,
      ApprovalOrder: 0,
      RejectionDate: new Date(),
      Remarks: reason || '',
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      ApprovalVersion: check.ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'Rejected successfully' });
  } catch (err) {
    await t.rollback();
    console.error('Reject Check Error:', err);
    res.status(500).json({ error: err.message });
  }
};