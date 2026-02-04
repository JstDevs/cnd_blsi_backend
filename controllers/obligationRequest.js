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
const validateApproval = require('../utils/validateApproval');
const { hasAccess } = require('../utils/checkUserAccess');
const { Op, literal } = require('sequelize');
const { stat } = require('fs-extra');


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
      Remarks,
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

    // Create new Individual (Customer)
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

    // Create new Employee with minimal details
    if (PayeeType == 'NewEmployee') {
      console.log('Creating New Employee - Payee name received:', Payee);

      // Find or create "Unassigned" department
      let unassignedDept = await DepartmentModel.findOne({
        where: { Name: 'Unassigned' },
        transaction: t
      });

      if (!unassignedDept) {
        unassignedDept = await DepartmentModel.create({
          Name: 'Unassigned',
          Description: 'Temporary department for employees pending complete details',
          Active: true,
          CreatedBy: req.user.id,
          CreatedDate: new Date()
        }, { transaction: t });
      }

      // Split name into FirstName and LastName
      let firstName = 'New Employee';
      let lastName = '';

      if (Payee && Payee.trim()) {
        const nameParts = Payee.trim().split(' ');
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      }

      const newEmployee = await EmployeeModel.create({
        FirstName: firstName,
        LastName: lastName,
        MiddleName: '',
        DepartmentID: unassignedDept.ID,
        Position: 'TBD',
        StreetAddress: Address || 'N/A',
        Active: true,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        ModifyBy: req.user.id,
        ModifyDate: new Date(),
        EmploymentDate: new Date(), // Placeholder
      }, { transaction: t });

      EmployeeID = newEmployee.ID;
    }

    // Create new Vendor with minimal details
    if (PayeeType == 'NewVendor') {
      const newVendor = await VendorModel.create({
        Name: Payee,
        StreetAddress: Address || 'N/A',
        TIN: 'TBD',
        ContactPerson: 'N/A',
        BusinessType: 'TBD',
        Active: true,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        ModifyBy: req.user.id,
        ModifyDate: new Date()
      }, { transaction: t });

      VendorID = newVendor.ID;
    }

    const docID = 13;
    let statusValue = '';
    const matrixExists = await db.ApprovalMatrix.findOne({
      where: {
        DocumentTypeID: docID,
        Active: 1,
      },
      transaction: t
    });

    const isAutoPost = !matrixExists;
    statusValue = isAutoPost ? 'Posted' : 'Requested';

    let autoInvoiceNumber = InvoiceNumber;
    let currentNumber = null;

    if (isAutoPost) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const currentYYMM = `${year}-${month}`;

      currentNumber = await getCurrentNumber(t);
      autoInvoiceNumber = `${FundsID}-${currentYYMM}-${currentNumber}`;
    }

    const latestApprovalVersion = await getLatestApprovalVersion('Obligation Request');

    const newRecord = await TransactionTable.create({
      DocumentTypeID: docID,
      LinkID,
      APAR: 'Obligation Request',
      VendorID,
      InvoiceNumber: autoInvoiceNumber,
      InvoiceDate,
      ResponsibilityCenter,
      Total,
      RequestedBy: req.user.employeeID,
      Status: statusValue,
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
      CustomerID: customerID,
      Remarks
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

      // --- Budget Validation ---
      const appropriation = parseFloat(account.Appropriation || 0);
      const used = parseFloat(account.PreEncumbrance || 0) + parseFloat(account.Encumbrance || 0);
      const available = appropriation - used;
      const currentAmount = parseFloat(item.subtotal || item.Sub_Total || 0);

      if (currentAmount > available) {
        throw new Error(`Insufficient budget for account '${account.Name}'. Available: ${available.toLocaleString('en-US', { minimumFractionDigits: 2 })}, Requested: ${currentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      }
      // -------------------------

      let credit = 0;
      let debit = 0;
      if (account.ChartofAccounts?.NormalBalance === 'Debit') {
        debit = item.subtotal;
      } else if (account.ChartofAccounts?.NormalBalance === 'Credit') {
        credit = item.subtotal;
      }

      let tax = null;
      if (item.TAXCodeID) {
        tax = await TaxCodeModel.findByPk(item.TAXCodeID, { transaction: t });
        /* 
        if (!tax) {
          throw new Error(`Tax Code with ID ${item.TAXCodeID} not found`);
        } 
        */
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
        TAXCodeID: item.TAXCodeID || null,
        TaxName: tax ? tax.Name : (item.TaxName || null),
        TaxRate: tax ? tax.Rate : (item.TaxRate || 0),

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
        InvoiceNumber: autoInvoiceNumber,
        NormalBalance: account.ChartofAccounts?.NormalBalance,
        ResponsibilityCenter: item.ResponsibilityCenter,
        Vatable: item.Vatable
      }, { transaction: t });

    }

    // Update Budget PreEncumbrance logic if applicable
    for (const item of Items) {
      const budget = await Budget.findByPk(item.ChargeAccountID, { transaction: t });
      if (budget) {
        const subtotal = parseFloat(item.Sub_Total || item.subtotal || 0);
        if (isAutoPost) {
          // Direct to Encumbrance if auto-posted
          const newEncumbrance = parseFloat(budget.Encumbrance || 0) + subtotal;
          await budget.update({ Encumbrance: newEncumbrance }, { transaction: t });
        } else {
          // Regular requested status
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

    if (isAutoPost && currentNumber) {
      await DocumentTypeModel.update(
        { CurrentNumber: currentNumber },
        { where: { ID: 13 }, transaction: t }
      );
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
        {
          model: TransactionItems,
          as: 'TransactionItemsAll',
          required: false,
          include: [
            {
              model: BudgetModel,
              as: 'ChargeAccount',
              include: [
                { model: DepartmentModel, as: 'Department' },
                { model: ChartofAccountsModel, as: 'ChartofAccounts' }
              ]
            }
          ]
        },
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
          required: false,
          include: [
            {
              model: BudgetModel,
              as: 'ChargeAccount',
              include: [
                { model: DepartmentModel, as: 'Department' },
                { model: ChartofAccountsModel, as: 'ChartofAccounts' }
              ]
            }
          ]
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
      Items,
      Remarks
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

    if (transaction.Status === 'Void') {
      throw new Error("Cannot update a Voided Obligation Request.");
    }

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
      CustomerID,
      Remarks
    };

    if (transaction.Status === 'Posted') {
      throw new Error('Cannot update an Obligation Request that is already Posted.');
    }

    await transaction.update(updatePayload, { transaction: t });

    // Aggregate all budget changes
    const budgetChanges = {};
    for (const oldItem of oldItems) {
      const oldSubtotal = parseFloat(oldItem.Sub_Total || 0);
      budgetChanges[oldItem.ChargeAccountID] = (budgetChanges[oldItem.ChargeAccountID] || 0) - oldSubtotal;
    }

    await TransactionItems.destroy({ where: { LinkID: transaction.LinkID }, transaction: t });

    // Optimize: Pre-fetch all unique budget accounts for the items to avoid multiple queries in the loop
    const uniqueChargeAccountIds = [...new Set(Items.map(i => i.ChargeAccountID))];
    const budgets = await BudgetModel.findAll({
      where: { ID: { [Op.in]: uniqueChargeAccountIds } },
      include: [{ model: ChartofAccountsModel, as: 'ChartofAccounts', attributes: ['NormalBalance'] }],
      transaction: t
    });
    const budgetMap = new Map(budgets.map(b => [b.ID, b]));

    for (const item of Items) {
      const account = budgetMap.get(item.ChargeAccountID);
      if (!account) throw new Error(`Charge Account ID ${item.ChargeAccountID} not found`);

      const subTotal = parseFloat(item.Sub_Total || item.subtotal || 0);
      budgetChanges[item.ChargeAccountID] = (budgetChanges[item.ChargeAccountID] || 0) + subTotal;

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
        EWTRate: item.EWTRate || item.withheldEWT,
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
      }, { transaction: t });
    }

    // Apply aggregated budget changes
    for (const [chargeId, diff] of Object.entries(budgetChanges)) {
      if (diff > 0) {
        await Budget.increment({ PreEncumbrance: diff }, { where: { ID: chargeId }, transaction: t });
      } else if (diff < 0) {
        await Budget.decrement({ PreEncumbrance: Math.abs(diff) }, { where: { ID: chargeId }, transaction: t });
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
        {
          model: TransactionItems,
          as: 'TransactionItemsAll',
          required: false,
          include: [
            {
              model: BudgetModel,
              as: 'ChargeAccount',
              include: [
                { model: DepartmentModel, as: 'Department' },
                { model: ChartofAccountsModel, as: 'ChartofAccounts' }
              ]
            }
          ]
        },
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
    console.error('Approve obligation error:', err);
    await t.rollback();
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.delete = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;

    const transaction = await TransactionTable.findByPk(id, { transaction: t });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.Status === 'Void') {
      throw new Error('Transaction is already voided.');
    }

    if (transaction.Status === 'Posted') {
      throw new Error('Cannot delete a Posted Obligation Request. Please reject or reverse it instead.');
    }

    // --- REVERT Budget Pre-Encumbrance ---
    // Only revert if not already rejected (since rejection already reverts it)
    if (transaction.Status !== 'Rejected') {
      const items = await TransactionItems.findAll({
        where: { LinkID: transaction.LinkID },
        transaction: t
      });

      if (items.length > 0) {
        const budgetUpdates = {};
        items.forEach(item => {
          const amount = parseFloat(item.AmountDue || item.Sub_Total || 0);
          if (amount > 0) {
            budgetUpdates[item.ChargeAccountID] = (budgetUpdates[item.ChargeAccountID] || 0) + amount;
          }
        });

        for (const [chargeAccountId, totalAmount] of Object.entries(budgetUpdates)) {
          await Budget.decrement(
            { PreEncumbrance: totalAmount },
            { where: { ID: chargeAccountId }, transaction: t }
          );
        }
      }
    }

    // --- Void Transaction ---
    await transaction.update({
      Status: 'Void',
      ModifyBy: req.user.id,
      ModifyDate: new Date()
    }, { transaction: t });

    // --- INSERT INTO Approval Audit (Void Action) ---
    await ApprovalAudit.create(
      {
        LinkID: generateLinkID(), // Unique Link for this audit entry
        InvoiceLink: transaction.LinkID,
        RejectionDate: new Date(), // Using RejectionDate to signify "Voided" date in some systems, or just date
        Remarks: "Transaction Voided by User",
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        ApprovalVersion: transaction.ApprovalVersion
      },
      { transaction: t }
    );

    await t.commit();
    res.json({ success: true, message: "Transaction voided successfully." });

  } catch (err) {
    if (t) await t.rollback();
    console.error("Error voiding transaction:", err);
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

    // 🔹 0. Fetch Current Transaction
    const transaction = await TransactionTable.findByPk(transactionId, { transaction: t });
    if (!transaction) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    if (transaction.Status === 'Void') {
      throw new Error("Cannot approve a Voided Obligation Request.");
    }

    // If already posted, we should only update the approval audit but skip budget/status changes
    const alreadyPosted = transaction.Status === "Posted";

    // 🔹 1. Validate Approval Matrix
    const validation = await validateApproval({
      documentTypeID: transaction.DocumentTypeID || 13, // 13 is OBR
      approvalVersion: transaction.ApprovalVersion,
      totalAmount: parseFloat(transaction.Total || 0),
      transactionLinkID: transaction.LinkID,
      user: req.user
    });

    if (!validation.canApprove) {
      await t.rollback();
      return res.status(403).json({ success: false, error: validation.error });
    }

    const isFinal = validation.isFinal;

    // 🔹 2. Generate Invoice Number (only if not already posted and isFinal)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const currentYYMM = `${year}-${month}`;

    let newInvoiceNumber = transaction.InvoiceNumber;
    let currentNumber = null;

    if (isFinal && !alreadyPosted) {
      currentNumber = await getCurrentNumber(t);
      newInvoiceNumber = `${FundsID}-${currentYYMM}-${currentNumber}`;
    }

    const updatePayload = {
      ApprovalProgress: validation.nextSequence || transaction.ApprovalProgress,
      Status: isFinal ? 'Posted' : validation.nextStatus
    };

    if (isFinal && !alreadyPosted) {
      updatePayload.InvoiceNumber = newInvoiceNumber;
    }


    await TransactionTable.update(updatePayload, { where: { ID: transactionId }, transaction: t });

    if (isFinal && !alreadyPosted) {
      const fund = await FundsModel.findByPk(FundsID, { transaction: t });
      if (!fund) {
        throw new Error(`Fund with ID ${FundsID} not found`);
      }

      // Skip Trust Fund and Special Education Fund
      if (true) { // Enabled for all funds
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
          if (subTotal > 0) {
            if (!chargeAccountSums[chargeId]) {
              chargeAccountSums[chargeId] = { pre: 0, enc: 0 };
            }
            chargeAccountSums[chargeId].pre += subTotal;
            chargeAccountSums[chargeId].enc += subTotal;
          }
        }

        // Consolidate updates: Update PreEncumbrance and Encumbrance together using literals
        for (const [chargeId, updates] of Object.entries(chargeAccountSums)) {
          await BudgetModel.update(
            {
              PreEncumbrance: literal(`GREATEST(0, CAST(PreEncumbrance AS DECIMAL(18,2)) - ${updates.pre})`),
              Encumbrance: literal(`CAST(Encumbrance AS DECIMAL(18,2)) + ${updates.enc}`)
            },
            { where: { ID: chargeId }, transaction: t }
          );
        }
      }
    }

    if (currentNumber && !alreadyPosted) {
      // 🔹 3. Update DocumentType current number
      await DocumentTypeModel.update(
        { CurrentNumber: currentNumber },
        { where: { ID: 13 }, transaction: t }
      );
    }

    if (newInvoiceNumber && !alreadyPosted) {
      // 🔹 4. Update Transaction Items invoice number
      await TransactionItems.update(
        { InvoiceNumber: newInvoiceNumber },
        { where: { LinkID: varLinkID }, transaction: t }
      );
    }

    // 🔹 5. Insert into Approval Audit
    await ApprovalAudit.create(
      {
        LinkID: generateLinkID(),
        InvoiceLink: transaction.LinkID,
        PositionorEmployee: "Employee",
        PositionorEmployeeID: req.user.employeeID,
        SequenceOrder: validation.currentSequence,
        ApprovalOrder: validation.numberOfApprovers,
        ApprovalDate: now,
        RejectionDate: null,
        Remarks: null,
        CreatedBy: req.user.id,
        CreatedDate: now,
        ApprovalVersion: transaction.ApprovalVersion
      },
      { transaction: t }
    );

    // 🔹 6. Commit
    await t.commit();
    return res.json({ success: true, message: "Data saved successfully." });
  } catch (err) {
    if (t) await t.rollback();
    console.error('[OBR Approve] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
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
    const transaction = await TransactionTable.findByPk(id, { transaction: t });
    if (!transaction) {
      throw new Error(`Transaction with ID ${id} not found`);
    }

    if (transaction.Status === 'Void') {
      throw new Error("Cannot reject a Voided Obligation Request.");
    }

    if (transaction.Status === "Rejected") {
      await t.rollback();
      return res.json({ success: true, message: "Transaction already rejected." });
    }

    await transaction.update(
      { Status: "Rejected" },
      { transaction: t }
    );

    // --- REVERT Budget Pre-Encumbrance ---
    // Optimization: Aggregate updates by ChargeAccountID to reduce network round-trips
    const items = await TransactionItems.findAll({
      where: { LinkID: transaction.LinkID },
      transaction: t
    });

    if (items.length > 0) {
      const budgetUpdates = {};
      items.forEach(item => {
        const amount = parseFloat(item.AmountDue || item.Sub_Total || 0);
        if (amount > 0) {
          budgetUpdates[item.ChargeAccountID] = (budgetUpdates[item.ChargeAccountID] || 0) + amount;
        }
      });

      for (const [chargeAccountId, totalAmount] of Object.entries(budgetUpdates)) {
        await Budget.decrement(
          { PreEncumbrance: totalAmount },
          { where: { ID: chargeAccountId }, transaction: t }
        );
      }
    }

    // --- INSERT INTO Approval Audit ---
    await ApprovalAudit.create(
      {
        LinkID: varApprovalLink,
        InvoiceLink: transaction.LinkID,
        RejectionDate: new Date(),
        Remarks: reasonForRejection,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        ApprovalVersion: transaction.ApprovalVersion
      },
      { transaction: t }
    );

    await t.commit();
    res.json({ success: true, message: "Transaction rejected successfully." });

  } catch (err) {
    if (t) await t.rollback();
    console.error("Error rejecting transaction:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
