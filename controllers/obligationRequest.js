const { Customer, TransactionTable, TransactionItems, Attachment, Budget, ApprovalAudit } = require('../config/database');
const DocumentTypeModel = require('../config/database').documentType;
const EmployeeModel = require('../config/database').employee;
const VendorModel = require('../config/database').vendor;
const BudgetModel = require('../config/database').Budget;
const FundsModel = require('../config/database').Funds;
const FiscalYearModel = require('../config/database').FiscalYear;
const ProjectModel = require('../config/database').Project;
const DepartmentModel = require('../config/database').department;
const ChartofAccountsModel = require('../config/database').ChartofAccounts;
const TaxCodeModel = require('../config/database').taxCode;
const db = require('../config/database')
const generateLinkID = require("../utils/generateID")
const getLatestApprovalVersion = require('../utils/getLatestApprovalVersion');
const { hasAccess } = require('../utils/checkUserAccess');
const { Op, literal } = require('sequelize');


exports.create = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const {
      PayeeType, // Employee/Vendor/Individual/New
      Payee,
      Address,
      InvoiceNumber,
      InvoiceDate,
      ResponsibilityCenter,
      Total,
      EWT,
      WithheldAmount,
      Vat_Total,
      Discounts,
      FundsID,
      FiscalYearID,
      ProjectID,
      TravelID,
    } = req.body;

    let { VendorID,
      CustomerID,
      EmployeeID
    } = req.body;

    VendorID = Number(VendorID) || 0;
    CustomerID = Number(CustomerID) || 0;
    EmployeeID = Number(EmployeeID) || 0;

    let { Items } = req.body;
    Items = Items ? JSON.parse(Items) : [];

    const LinkID = generateLinkID();


    let customerID = CustomerID;

    if (PayeeType == 'New') {
      const newCustomer = await Customer.create({
        Name: Payee,
        StreetAddress: Address,
        TIN: 0,
        ContactPerson: 'None',
        Type: 'Individual',
        Active: true,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
      }, { transaction: t });

      customerID = newCustomer.ID;
    }

    const latestApprovalVersion = await getLatestApprovalVersion('Obligation Request');

    const newRecord = await TransactionTable.create({
      DocumentTypeID: 13,
      LinkID,
      APAR: 'Obligation Request',
      VendorID,
      InvoiceNumber,
      InvoiceDate,
      ResponsibilityCenter,
      Total,
      RequestedBy: req.user.employeeID,
      Status: 'Requested',
      Active: true,
      CreatedBy: req.user.id,
      Credit: Total,
      Debit: Total,
      EWT,
      WithheldAmount,
      Vat_Total,
      Discounts,
      EmployeeID,
      ApprovalProgress: 0,
      FundsID,
      FiscalYearID,
      ProjectID,
      ApprovalVersion: latestApprovalVersion,
      TravelLink: TravelID,
      CustomerID: customerID
    }, { transaction: t });

    for (const item of Items) {
      const account = await BudgetModel.findOne({
        where: { ID: item.ChargeAccountID },
        include: [
          {
            model: ChartofAccountsModel,
            as: 'ChartofAccounts',
            attributes: ['NormalBalance'],
          }
        ]
      });
      if (!account) {
        throw new Error(`Charge Account with ID ${item.ChargeAccountID} not found`);
      }

      let credit = 0;
      let debit = 0;
      if (account.ChartofAccounts?.NormalBalance === 'Debit') {
        debit = item.subtotal;
      } else if (account.ChartofAccounts?.NormalBalance === 'Credit') {
        credit = item.subtotal;
      }

      const tax = await TaxCodeModel.findByPk(item.TAXCodeID, { transaction: t });
      if (!tax) {
        throw new Error(`Tax Code with ID ${item.TAXCodeID} not found`);
      }

      const UniqueID = generateLinkID();
      await TransactionItems.create({
        UniqueID,
        LinkID,
        ItemID: item.ItemID,
        ChargeAccountID: item.ChargeAccountID,
        Quantity: item.Quantity,
        ItemUnitID: item.ItemUnitID,
        Price: item.Price,
        TAXCodeID: item.TAXCodeID,
        TaxName: tax.Name,
        TaxRate: tax.Rate,

        Sub_Total_Vat_Ex: item.subtotalTaxExcluded,

        Active: 1,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        Credit: credit,
        Debit: debit,

        Vat_Total: item.vat,

        EWT: item.ewt,

        WithheldAmount: item.withheld,
        Sub_Total: item.subtotalBeforeDiscount,
        EWTRate: item.ewtrate,
        Discounts: item.discount,
        DiscountRate: item.DiscountRate,
        AmountDue: item.subtotal,
        PriceVatExclusive: item.subtotalTaxExcluded,

        Remarks: item.Remarks,
        FPP: item.FPP,
        Discounted: item.Discounted,
        InvoiceNumber,
        NormalBalance: account.ChartofAccounts?.NormalBalance,
        ResponsibilityCenter: item.ResponsibilityCenter,
        Vatable: item.Vatable
      });

    }

    // Update Budget PreEncumbrance logic if applicable
    const fund = await FundsModel.findByPk(FundsID, { transaction: t });
    for (const item of Items) {
      if (fund?.Name !== 'Trust Fund' && fund?.Name !== 'Special Education Fund') {
        const budget = await Budget.findByPk(item.ChargeAccountID, { transaction: t });
        if (budget) {
          const subtotal = parseFloat(item.Sub_Total || item.subtotal || 0);
          const newPreEncumbrance = parseFloat(budget.PreEncumbrance || 0) + subtotal;
          await budget.update({ PreEncumbrance: newPreEncumbrance }, { transaction: t });
        }
      }
    }


    if (req.files && req.files.length > 0) {
      const blobAttachments = req.files.map((file) => ({
        LinkID,
        DataName: file.originalname,
        DataType: file.mimetype,
        DataImage: `${req.uploadPath}/${file.filename}`,
      }));

      await Attachment.bulkCreate(blobAttachments, { transaction: t });
    }

    await t.commit();


    const newObligation = await TransactionTable.findOne({
      where: { ID: newRecord.ID },
      attributes: {
        include: [
          [literal('`Department`.`Name`'), 'ResponsibilityCenterName'],
          [literal('`FiscalYear`.`Name`'), 'FiscalYearName'],
          [literal('`Project`.`Title`'), 'ProjectName'],
        ]
      },
      include: [
        { model: TransactionItems, as: 'TransactionItemsAll', required: false },
        { model: Customer, as: 'Customer', required: false },
        {
          model: EmployeeModel,
          as: 'Employee',
          include: [{ model: DepartmentModel, as: 'Department', required: true }],
          required: false
        },
        { model: FundsModel, as: 'Funds', required: false },
        { model: FiscalYearModel, as: 'FiscalYear', required: false },
        { model: ProjectModel, as: 'Project', required: false },
        {
          model: DepartmentModel,
          as: 'Department',
          required: false
        },
      ]
    });
    res.json(newObligation);

  } catch (err) {
    console.error('Save obligation error:', err);
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};


exports.getAll = async (req, res) => {
  try {
    const { selectedDepartmentID } = req.query;

    let whereClause = {
      Active: true,
      APAR: { [Op.like]: '%Obligation Request%' }
    };

    const whereCondition = {};
    if (selectedDepartmentID && selectedDepartmentID !== '') {
      // Filter by department ID if not "All"
      whereClause['DepartmentID'] = Number(selectedDepartmentID);
    }

    const obligations = await TransactionTable.findAll({
      where: whereClause,
      attributes: {
        include: [
          [literal('`Department`.`Name`'), 'ResponsibilityCenterName'],
          [literal('`FiscalYear`.`Name`'), 'FiscalYearName'],
          [literal('`Project`.`Title`'), 'ProjectName'],
        ]
      },
      include: [
        {
          model: TransactionItems,
          as: 'TransactionItemsAll',
          required: false
        },
        {
          model: Customer,
          as: 'Customer',
          required: false
        },
        {
          model: EmployeeModel,
          as: 'Employee',
          include: [
            {
              model: DepartmentModel,
              as: 'Department',
              required: true
            }
          ],
          required: false
        },
        {
          model: FundsModel,
          as: 'sourceFunds',
          required: false
        },
        {
          model: FiscalYearModel,
          as: 'FiscalYear',
          required: false
        },
        {
          model: ProjectModel,
          as: 'Project',
          required: false
        },
        {
          model: DepartmentModel,
          as: 'Department',
          required: false
        },
      ],
      order: [['CreatedDate', 'DESC']]
    });

    res.json(obligations);
  } catch (err) {
    console.error('Fetch obligation error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    throw new Error('getById is not implemented for Obligation Requests');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const {
      ID,
      InvoiceNumber,
      InvoiceDate,
      ResponsibilityCenter,
      Total,
      EWT,
      WithheldAmount,
      Vat_Total,
      Discounts,
      FundsID,
      FiscalYearID,
      ProjectID,
      TravelID,
      Items
    } = req.body;

    let {
      VendorID,
      CustomerID,
      EmployeeID
    } = req.body;

    VendorID = Number(VendorID) || 0;
    CustomerID = Number(CustomerID) || 0;
    EmployeeID = Number(EmployeeID) || 0;

    const transaction = await TransactionTable.findByPk(ID);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    // check if user has access to this module
    const moduleID = 27;
    const hasMayorAccess = await hasAccess(req.user.id, moduleID, 'Mayor');

    const updatePayload = {
      VendorID,
      InvoiceNumber,
      InvoiceDate,
      ResponsibilityCenter,
      Total,
      RequestedBy: req.user.employeeID,
      ModifyBy: req.user.id,
      ModifyDate: new Date(),
      Credit: Total,
      EWT,
      WithheldAmount,
      Vat_Total,
      Discounts,
      EmployeeID,
      FundsID,
      FiscalYearID,
      ProjectID,
      Debit: Total,
      TravelLink: TravelID,
      CustomerID
    };

    if (!hasMayorAccess) {
      updatePayload.Status = 'Requested';
      updatePayload.ApprovalProgress = 0;
    }
    await transaction.update(updatePayload, { transaction: t });

    // Adjust Budget Balances: Subtract old items, add new items
    const oldItems = await TransactionItems.findAll({ where: { LinkID: transaction.LinkID }, transaction: t });
    const fund = await FundsModel.findByPk(FundsID, { transaction: t });
    const isBudgetFund = fund?.Name !== 'Trust Fund' && fund?.Name !== 'Special Education Fund';

    if (isBudgetFund) {
      for (const oldItem of oldItems) {
        const budget = await Budget.findByPk(oldItem.ChargeAccountID, { transaction: t });
        if (budget) {
          const oldSubtotal = parseFloat(oldItem.Sub_Total || 0);
          await budget.update({ PreEncumbrance: parseFloat(budget.PreEncumbrance || 0) - oldSubtotal }, { transaction: t });
        }
      }
    }

    await TransactionItems.destroy({ where: { LinkID: transaction.LinkID }, transaction: t });

    for (const item of Items) {
      const account = await BudgetModel.findOne({
        where: { ID: item.ChargeAccountID },
        include: [
          {
            model: ChartofAccountsModel,
            as: 'ChartofAccounts',
            attributes: ['NormalBalance'],
          }
        ]
      });
      if (!account) throw new Error(`Charge Account ID ${item.ChargeAccountID} not found`);

      const subTotal = parseFloat(item.Sub_Total || item.subtotal || 0);
      const amountDue = parseFloat(item.AmountDue || item.subtotal || 0);
      const subtotalBeforeDiscount = parseFloat(item.Sub_Total || item.subtotalBeforeDiscount || 0);

      let credit = 0;
      let debit = 0;
      if (account.ChartofAccounts?.NormalBalance === 'Debit') debit = subTotal;
      else if (account.ChartofAccounts?.NormalBalance === 'Credit') credit = subTotal;

      const UniqueID = generateLinkID();
      await TransactionItems.create({
        UniqueID,
        LinkID: transaction.LinkID,
        ItemID: item.ItemID,
        ChargeAccountID: item.ChargeAccountID,
        Quantity: item.Quantity,
        ItemUnitID: item.ItemUnitID,
        Price: item.Price,
        TAXCodeID: item.TAXCodeID,
        TaxName: item.TaxName,
        TaxRate: item.TaxRate,
        Sub_Total_Vat_Ex: item.Sub_Total_Vat_Ex,
        Active: 1,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        Credit: credit,
        Debit: debit,
        Vat_Total: item.Vat_Total || item.vat,
        EWT: item.EWT || item.ewt,
        WithheldAmount: item.WithheldAmount || item.withheld,
        Sub_Total: subtotalBeforeDiscount,
        EWTRate: item.EWTRate || item.ewtrate,
        Discounts: item.Discounts || item.discount,
        DiscountRate: item.DiscountRate,
        AmountDue: amountDue,
        PriceVatExclusive: item.PriceVatExclusive || item.subtotalTaxExcluded,
        Remarks: item.Remarks,
        FPP: item.FPP,
        Discounted: item.Discounted,
        InvoiceNumber: InvoiceNumber,
        NormalBalance: account.ChartofAccounts?.NormalBalance,
        ResponsibilityCenter: item.ResponsibilityCenter,
        Vatable: item.Vatable
      });

      if (isBudgetFund) {
        const budget = await Budget.findByPk(item.ChargeAccountID, { transaction: t });
        if (budget) {
          const newPreEncumbrance = parseFloat(budget.PreEncumbrance || 0) + amountDue;
          await budget.update({ PreEncumbrance: newPreEncumbrance }, { transaction: t });
        }
      }
    }



    // Attachment handling
    const existingIDs = Attachment.filter(att => att.ID).map(att => att.ID);

    // Delete attachments removed from the list
    await Attachment.destroy({
      where: {
        LinkID: transaction.LinkID,
        ID: { [Op.notIn]: existingIDs }
      },
      transaction: t
    });

    // Add new files
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        LinkID: transaction.LinkID,
        DataName: file.originalname,
        DataType: file.mimetype,
        DataImage: `${req.uploadPath}/${file.filename}`
      }));
      await Attachment.bulkCreate(newAttachments, { transaction: t });
    }

    await t.commit();


    const newObligation = await TransactionTable.findOne({
      where: { LinkID: transaction.LinkID },
      include: [
        { model: TransactionItems, as: 'TransactionItemsAll', required: false },
        { model: Customer, as: 'Customer', required: false },
        {
          model: EmployeeModel,
          as: 'Employee',
          include: [{ model: DepartmentModel, as: 'Department', required: true }],
          required: false
        },
        { model: FundsModel, as: 'Funds', required: false },
        { model: FiscalYearModel, as: 'FiscalYear', required: false },
        { model: ProjectModel, as: 'Project', required: false }
      ]
    });
    res.json(newObligation);
  } catch (err) {
    console.error('Update obligation error:', err);
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    // empty function in old software
    throw new Error('Delete operation is not implemented for Obligation Requests');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

async function getCurrentNumber(transaction) {
  let currentNumber = 1;

  const docType = await DocumentTypeModel.findOne({
    where: { Name: "Obligation Request" },
    attributes: ["CurrentNumber"],
    transaction
  });

  if (docType) {
    currentNumber = (docType.CurrentNumber || 0) + 1;
  }

  // Return formatted series number (4-digit padded)
  return currentNumber.toString().padStart(4, "0");
}


async function getTotalBudget(transaction, budgetId) {
  const budget = await BudgetModel.findOne({
    where: { ID: budgetId, Active: 1 },
    attributes: ["PreEncumbrance"],
    transaction,
  });

  if (!budget) {
    throw new Error(
      "Error: Fetching live Budget : Check if Budget Exist or else Contact Service Provider"
    );
  }

  return budget.PreEncumbrance;
}

async function getTotalBudgetEncumbrance(transaction, budgetId) {
  const budget = await BudgetModel.findOne({
    where: { ID: budgetId, Active: 1 },
    attributes: ["Encumbrance"],
    transaction,
  });

  if (!budget) {
    throw new Error(
      "Error: Fetching live Budget : Check if Budget Exist or else Contact Service Provider"
    );
  }

  return budget.Encumbrance;
}


exports.approveTransaction = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const {
      ID: transactionId,          // ID of the transaction
      ApprovalLinkID: varApprovalLink,        // approval link ID
      LinkID: varLinkID,              // invoice link ID
      ApprovalProgress: approvalProgress,       // progress number
      ApprovalOrder: approvalOrder,          // sequence order
      NumberOfApproverPerSequence: numberofApproverperSequence,
      FundsID,
      ApprovalVersion: varTransactionApprovalVersion
    } = req.body;

    // 🔹 1. Generate Invoice Number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // 0-based → +1
    const currentYYMM = `${year}-${month}`;

    const currentNumber = await getCurrentNumber(t);
    const newInvoiceNumber = `${FundsID}-${currentYYMM}-${currentNumber}`;

    // 🔹 2. Handle Approve / Post logic
    let newStatus = "Requested";
    if (numberofApproverperSequence) {
      if (approvalProgress >= numberofApproverperSequence) newStatus = "Posted";
    } else {
      if ((approvalProgress || 0) > 0) newStatus = "Posted";
    }

    const updatePayload = {
      ApprovalProgress: approvalProgress,
      Status: newStatus
    };

    if (newStatus === "Posted") {
      updatePayload.InvoiceNumber = newInvoiceNumber;
    }

    await TransactionTable.update(updatePayload, { where: { ID: transactionId }, transaction: t });

    if (newStatus === "Posted") {
      const fund = await FundsModel.findByPk(FundsID, { transaction: t });
      if (!fund) {
        throw new Error(`Fund with ID ${FundsID} not found`);
      }

      // Skip Trust Fund and Special Education Fund
      if (fund.Name !== "Trust Fund" && fund.Name !== "Special Education Fund") {
        // aggregate SubTotal per ChargeAccountID
        const chargeAccountSums = {};

        const transactionItems = await TransactionItems.findAll({
          where: { LinkID: varLinkID },
          attributes: ["ChargeAccountID", "AmountDue", "Sub_Total"],
          transaction: t
        });

        for (const row of transactionItems) {
          const chargeId = row.ChargeAccountID;
          const subTotal = parseFloat(row.AmountDue || row.Sub_Total || 0);
          chargeAccountSums[chargeId] = Number(chargeAccountSums[chargeId] || 0) + subTotal;
        }

        // Consolidate updates: Update PreEncumbrance and Encumbrance together
        for (const chargeId of Object.keys(chargeAccountSums)) {
          const budget = await BudgetModel.findByPk(chargeId, { transaction: t });
          if (!budget) continue;

          const transferAmount = Number(chargeAccountSums[chargeId] || 0);
          const currentPreEnc = Number(budget.PreEncumbrance || 0);
          const currentEnc = Number(budget.Encumbrance || 0);

          const updatedPreEnc = currentPreEnc - transferAmount;
          const updatedEnc = currentEnc + transferAmount;

          await budget.update(
            {
              PreEncumbrance: updatedPreEnc < 0 ? 0 : updatedPreEnc,
              Encumbrance: updatedEnc < 0 ? 0 : updatedEnc
            },
            { transaction: t }
          );
        }
      }
    }

    // 🔹 3. Update DocumentType current number
    await DocumentTypeModel.update(
      { CurrentNumber: currentNumber },
      { where: { ID: 13 }, transaction: t }
    );

    // 🔹 4. Update Transaction Items invoice number
    await TransactionItems.update(
      { InvoiceNumber: newInvoiceNumber },
      { where: { LinkID: varLinkID }, transaction: t }
    );

    // 🔹 5. Insert into Approval Audit
    await ApprovalAudit.create(
      {
        LinkID: varApprovalLink,
        InvoiceLink: varLinkID,
        PositionEmployee: "Employee",
        PositionEmployeeID: req.user.employeeID,
        SequenceOrder: approvalOrder,
        ApprovalOrder: numberofApproverperSequence,
        ApprovalDate: now,
        RejectionDate: null,
        Remarks: null,
        CreatedBy: req.user.id,
        CreatedDate: now,
        ApprovalVersion: varTransactionApprovalVersion
      },
      { transaction: t }
    );

    // 🔹 6. Commit
    await t.commit();
    return res.json({ success: true, message: "Data saved successfully." });

  } catch (err) {
    await t.rollback();
    console.error("Error approving transaction:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectTransaction = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const {
      ID: id,
      LinkID: varApprovalLink,
      Reason: reasonForRejection, // Map from frontend "Reason"
    } = req.body;

    // --- UPDATE Transaction Table ---
    await TransactionTable.update(
      { Status: "Rejected" },
      { where: { ID: id }, transaction: t }
    );

    // --- INSERT INTO Approval Audit ---
    await ApprovalAudit.create(
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
    res.json({ success: true, message: "Transaction rejected successfully." });

  } catch (err) {
    await t.rollback();
    console.error("Error rejecting transaction:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
