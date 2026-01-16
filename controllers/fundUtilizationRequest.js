// const { BeginningBalance } = require('../config/database');
// const BeginningBalanceModel = require('../config/database').BeginningBalance;
// const beginningBalance = BeginningBalanceModel;
// const FiscalYearModel = require('../config/database').FiscalYear;
// const FundsModel = require('../config/database').Funds;
// const ChartOfAccountsModel = require('../config/database').ChartofAccounts;
// const { col } = require('sequelize');
const { ApprovalAudit, documentType: DocumentTypeModel } = require('../config/database');
const { hasAccess } = require('../utils/checkUserAccess');
const TransactionTableModel = require('../config/database').TransactionTable;
const FundsModel = require('../config/database').Funds;
const BudgetModel = require('../config/database').Budget;
const CustomerModel = require('../config/database').Customer;
const TransactionItemsModel = require('../config/database').TransactionItems;
const AttachmentModel = require('../config/database').Attachment;
const VendorModel = require('../config/database').vendor;
const EmployeeModel = require('../config/database').employee;
const FiscalYearModel = require('../config/database').FiscalYear;
const DepartmentModel = require('../config/database').department;
const ProjectModel = require('../config/database').Project;
const ChartofAccountsModel = require('../config/database').ChartofAccounts;
const TaxCodeModel = require('../config/database').taxCode;
const generateLinkID = require("../utils/generateID")
const db = require('../config/database')
const { Op, literal } = require('sequelize');
const getLatestApprovalVersion = require('../utils/getLatestApprovalVersion');

async function getCurrentNumber(transaction) {
  let currentNumber = 1;
  const docType = await DocumentTypeModel.findOne({
    where: { Name: "Fund Utilization Request" },
    attributes: ["CurrentNumber"],
    transaction
  });

  if (docType) {
    currentNumber = (docType.CurrentNumber || 0) + 1;
  }
  return currentNumber.toString().padStart(4, "0");

}

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

    const refID = (IsNew) ? generateLinkID() : data.LinkID;
    const latestapprovalversion = await getLatestApprovalVersion('Fund Utilization Request');

    let {
      VendorID,
      CustomerID,
      EmployeeID
    } = parsedFields;

    // ✅ Insert Customer if needed
    if (IsNew && data.PayeeType === 'New') {
      const customer = await CustomerModel.create({
        Name: data.Payee,
        StreetAddress: data.StreetAddress,
        TIN: data.TIN,
        ContactPerson: 'None',
        Type: 'Individual',
        Active: true,
        CreatedBy: req.user.id,
        CreatedDate: new Date()
      }, { transaction: t });

      CustomerID = customer.ID;
    }

    VendorID = Number(VendorID) || 0;
    CustomerID = Number(CustomerID) || 0;
    EmployeeID = Number(EmployeeID) || 0;

    const furData = {
      DocumentTypeID: 31,
      LinkID: refID,
      APAR: 'Fund Utilization Request',
      VendorID: VendorID,
      InvoiceNumber: data.InvoiceNumber,
      InvoiceDate: data.InvoiceDate,
      ResponsibilityCenter: data.ResponsibilityCenter,
      Total: data.Total,
      RequestedBy: req.user.employeeID,
      Status: 'Requested',
      Active: true,
      CreatedBy: req.user.id,
      Credit: data.Total,
      Debit: data.Total,
      EWT: data.EWT,
      WithheldAmount: data.WithheldAmount,
      Vat_Total: data.Vat_Total,
      Discounts: data.Discounts,
      EmployeeID: EmployeeID,
      ApprovalProgress: 0,
      FundsID: data.FundsID,
      FiscalYearID: data.FiscalYearID,
      ProjectID: data.ProjectID,
      ApprovalVersion: latestapprovalversion,
      TravelLink: data.TravelLink,
      CustomerID: CustomerID
    };

    // ✅ Insert or Update FUR
    let fur;
    if (IsNew) {
      fur = await TransactionTableModel.create(furData, { transaction: t });
    } else {
      fur = await TransactionTableModel.update(furData, {
        where: { ID: data.ID },
        transaction: t
      });

      // Delete old items
      await TransactionItemsModel.destroy({
        where: { LinkID: refID },
        transaction: t
      });
    }

    let { Items = [] } = parsedFields;
    // console.log('Items:', Items);
    // Items = Items ? JSON.parse(Items) : [];
    // ✅ Insert transaction items
    for (const itm of Items) {
      const account = await BudgetModel.findOne({
        where: { ID: itm.ChargeAccountID },
        include: [
          {
            model: ChartofAccountsModel,
            as: 'ChartofAccounts',
            attributes: ['NormalBalance'],
          }
        ]
      });
      if (!account) {
        throw new Error(`Charge Account with ID ${itm.ChargeAccountID} not found`);
      }

      let credit = 0;
      let debit = 0;
      if (account.ChartofAccounts?.NormalBalance === 'Debit') {
        debit = itm.subtotal;
      } else if (account.ChartofAccounts?.NormalBalance === 'Credit') {
        credit = itm.subtotal;
      }

      const tax = await TaxCodeModel.findByPk(itm.TAXCodeID, { transaction: t });
      if (!tax) {
        throw new Error(`Tax Code with ID ${itm.TAXCodeID} not found`);
      }

      const UniqueID = generateLinkID();

      await TransactionItemsModel.create({
        UniqueID,
        LinkID: refID,
        ItemID: itm.ItemID,
        ChargeAccountID: itm.ChargeAccountID,
        Quantity: itm.Quantity,
        ItemUnitID: itm.ItemUnitID,
        Price: itm.Price,
        TAXCodeID: itm.TAXCodeID,
        TaxName: tax.Name,
        TaxRate: tax.Rate,
        Sub_Total_Vat_Ex: itm.subtotalTaxExcluded,
        Active: true,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        Credit: credit,
        Debit: debit,
        Vat_Total: itm.vat,
        EWT: itm.ewt,
        WithheldAmount: itm.withheld,
        Sub_Total: itm.subtotalBeforeDiscount,
        EWTRate: itm.ewtrate,
        Discounts: itm.discount,
        DiscountRate: itm.DiscountRate,
        AmountDue: itm.subtotal,
        PriceVatExclusive: itm.subtotalTaxExcluded,
        Remarks: itm.Remarks,
        FPP: itm.FPP,
        Discounted: itm.Discounted,
        InvoiceNumber: data.InvoiceNumber,
        NormalBalance: account.ChartofAccounts?.NormalBalance,
        ResponsibilityCenter: itm.ResponsibilityCenter,
        Vatable: itm.Vatable
      }, { transaction: t });
    }

    // get fund name
    const fund = await FundsModel.findByPk(data.FundsID, {
      attributes: ['Name']
    });
    const fundName = fund ? fund.Name : 'Unknown Fund';


    // update budget    
    if (true) { // Enabled for all funds
      const byChargeAccount = {};
      for (const itm of Items) {
        byChargeAccount[itm.ChargeAccountID] =
          (byChargeAccount[itm.ChargeAccountID] || 0) + (itm.subtotal || 0);
      }

      for (const [ChargeAccountID, subTotal] of Object.entries(byChargeAccount)) {
        const budget = await BudgetModel.findByPk(ChargeAccountID, {
          attributes: ["ID", "PreEncumbrance"],
          transaction: t
        });
        if (!budget) continue; // Guard against orphan IDs
        // console.error('Budget PreEncumbrance: '+budget.PreEncumbrance);
        // console.error('Budget Subtotal: '+subTotal);
        await budget.update(
          { PreEncumbrance: Number(budget.PreEncumbrance) + Number(subTotal) },
          { transaction: t }
        );
      }
    }


    // Attachment handling
    const existingIDs = Attachments.filter(att => att.ID).map(att => att.ID);

    // Delete attachments removed from the list
    await AttachmentModel.destroy({
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
      await AttachmentModel.bulkCreate(newAttachments, { transaction: t });
    }

    await t.commit();

    return res.status(200).json({ message: 'success' });
  } catch (error) {
    console.error('Error saving Fund Utilization Request:', error);
    await t.rollback();
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}


exports.create = async (req, res) => {
  const trx = await db.sequelize.transaction();
  try {
    const {
      PayeeType, // Employee/Vendor/Individual/New
      Payee,
      StreetAddress,
      InvoiceNumber,
      InvoiceDate,
      ResponsibilityCenter,
      Total,
      Credit,
      Debit,
      EWT,
      WithheldAmount,
      Vat_Total,
      Discounts,
      FundsID,
      FiscalYearID,
      ProjectID,
      ApprovalVersion,
      TravelLink,
    } = req.body;

    let { Items } = req.body;
    Items = Items ? JSON.parse(Items) : [];

    const Name = Payee;


    let {
      VendorID,
      CustomerID,
      EmployeeID
    } = req.body;

    VendorID = Number(VendorID) || 0;
    CustomerID = Number(CustomerID) || 0;
    EmployeeID = Number(EmployeeID) || 0;

    const LinkID = generateLinkID();

    if (PayeeType === "New") {
      const customer = await CustomerModel.create(
        {
          Name,
          StreetAddress,
          TIN: 0,
          ContactPerson: "None",
          Type: "Individual",
          Active: true,
          CreatedBy: req.user.id,
          CreatedDate: new Date()
        },
        { transaction: trx }
      );
      CustomerID = customer.ID;
    }

    const newRecord = await TransactionTableModel.create(
      {
        DocumentTypeID: 31,
        LinkID,
        APAR: "Fund Utilization Request",
        VendorID,
        InvoiceNumber,
        InvoiceDate,
        ResponsibilityCenter,
        Total,
        RequestedBy: req.user.employeeID,
        Status: "Requested",
        Active: true,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
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
        ApprovalVersion,
        TravelLink,
        CustomerID
      },
      { transaction: trx }
    );

    for (const itm of Items) {
      const account = await BudgetModel.findOne({
        where: { ID: itm.ChargeAccountID },
        include: [
          {
            model: ChartofAccountsModel,
            as: 'ChartofAccounts',
            attributes: ['NormalBalance'],
          }
        ]
      });
      if (!account) {
        throw new Error(`Charge Account with ID ${itm.ChargeAccountID} not found`);
      }

      let credit = 0;
      let debit = 0;
      if (account.ChartofAccounts?.NormalBalance === 'Debit') {
        debit = itm.subtotal;
      } else if (account.ChartofAccounts?.NormalBalance === 'Credit') {
        credit = itm.subtotal;
      }

      const tax = await TaxCodeModel.findByPk(itm.TAXCodeID, { transaction: trx });
      if (!tax) {
        throw new Error(`Tax Code with ID ${itm.TAXCodeID} not found`);
      }

      const UniqueID = generateLinkID();
      await TransactionItemsModel.create(
        {
          UniqueID,
          LinkID,
          ItemID: itm.ItemID,
          ChargeAccountID: itm.ChargeAccountID,
          Quantity: itm.Quantity,
          ItemUnitID: itm.ItemUnitID,
          Price: itm.Price,
          TAXCodeID: itm.TAXCodeID,
          TaxName: tax.Name,
          TaxRate: tax.Rate,
          Sub_Total_Vat_Ex: itm.subtotalTaxExcluded,
          Active: true,
          CreatedBy: req.user.id,
          CreatedDate: new Date(),
          Credit: credit,
          Debit: debit,
          Vat_Total: itm.vat,
          EWT: itm.ewt,
          WithheldAmount: itm.withheld,
          Sub_Total: itm.subtotalBeforeDiscount,
          EWTRate: itm.ewtrate,
          Discounts: itm.discount,
          DiscountRate: itm.DiscountRate,
          AmountDue: itm.subtotal,
          PriceVatExclusive: itm.subtotalTaxExcluded,
          Remarks: itm.Remarks,
          FPP: itm.FPP,
          Discounted: itm.Discounted,
          InvoiceNumber: InvoiceNumber,
          NormalBalance: account.ChartofAccounts?.NormalBalance,
          ResponsibilityCenter: itm.ResponsibilityCenter,
          Vatable: itm.Vatable
        },
        { transaction: trx }
      );
    }

    // get fund name
    const fund = await FundsModel.findByPk(FundsID, {
      attributes: ['Name']
    });
    const fundName = fund ? fund.Name : 'Unknown Fund';

    // update budget
    if (true) { // Enabled for all funds
      const byChargeAccount = {};
      for (const itm of Items) {
        byChargeAccount[itm.ChargeAccountID] =
          (byChargeAccount[itm.ChargeAccountID] || 0) + (itm.subtotal || 0);
      }

      for (const [ChargeAccountID, subTotal] of Object.entries(byChargeAccount)) {
        const budget = await BudgetModel.findByPk(ChargeAccountID, {
          attributes: ["ID", "PreEncumbrance"],
          transaction: trx
        });
        if (!budget) continue; // Guard against orphan IDs
        await budget.update(
          { PreEncumbrance: budget.PreEncumbrance + subTotal },
          { transaction: trx }
        );
      }
    }


    // Insert Attachments
    if (req.files && req.files.length > 0) {
      const blobAttachments = req.files.map(file => ({
        LinkID,
        DataName: file.originalname,
        DataType: file.mimetype,
        DataImage: `${req.uploadPath}/${file.filename}`
      }));
      await AttachmentModel.bulkCreate(blobAttachments, { transaction: trx });
    }

    await trx.commit();

    const newObligation = await TransactionTableModel.findOne({
      where: { ID: newRecord.ID },
      attributes: {
        include: [
          [literal('`FiscalYear`.`Name`'), 'FiscalYearName'],
          [literal('`Project`.`Title`'), 'ProjectName'],
        ]
      },
      include: [
        { model: TransactionItemsModel, as: 'TransactionItemsAll', required: false },
        { model: CustomerModel, as: 'Customer', required: false },
        {
          model: EmployeeModel,
          as: 'Employee',
          include: [{ model: DepartmentModel, as: 'Department', required: true }],
          required: false
        },
        { model: FundsModel, as: 'Funds', required: false },
        { model: FiscalYearModel, as: 'FiscalYear', required: false },
        { model: ProjectModel, as: 'Project', required: false },
      ]
    });
    res.json(newObligation);
  } catch (err) {
    console.error("Error creating Fund Utilization Request:", err.message);
    await trx.rollback();
    res.status(500).json({ error: err.message });
  }
};


exports.update = async (req, res) => {
  const trx = await db.sequelize.transaction();
  try {
    const {
      LinkID,
      PayeeType, // "Employee" | "Vendor" | "Individual" | "New"
      Name,
      StreetAddress,
      InvoiceNumber,
      InvoiceDate,
      ResponsibilityCenter,
      Total,
      Credit,
      Debit,
      EWT,
      WithheldAmount,
      Vat_Total,
      Discounts,
      FundsID,
      FiscalYearID,
      ProjectID,
      TravelLink,
      Items = [],
      Attachments = []
    } = req.body;

    let {
      VendorID,
      CustomerID,
      EmployeeID
    } = req.body;

    VendorID = Number(VendorID) || 0;
    CustomerID = Number(CustomerID) || 0;
    EmployeeID = Number(EmployeeID) || 0;

    const header = await TransactionTableModel.findOne({
      where: { ID: req.params.id },
      transaction: trx
    });
    if (!header) {
      throw new Error("Transaction not found");
    }


    if (PayeeType === "New") {
      const customer = await CustomerModel.create(
        {
          Name,
          StreetAddress,
          TIN: 0,
          ContactPerson: "None",
          Type: "Individual",
          Active: true,
          CreatedBy: req.user.id,
          CreatedDate: new Date()
        },
        { transaction: trx }
      );
      CustomerID = customer.ID;
    }


    await header.update(
      {
        VendorID,
        InvoiceNumber,
        InvoiceDate,
        ResponsibilityCenter,
        Total,
        RequestedBy: req.user.employeeID,
        ModifyBy: req.user.id,
        ModifyDate: new Date(),
        Credit,
        EWT,
        WithheldAmount,
        Vat_Total,
        Discounts,
        EmployeeID,
        FundsID,
        FiscalYearID,
        ProjectID,
        Debit,
        Status: "Requested",
        ApprovalProgress: 0,
        TravelLink,
        CustomerID,
      },
      { transaction: trx }
    );



    // Step 1: Fetch existing for budget reversal
    // const existingItems = await TransactionItemsModel.findAll({
    //   where: { LinkID },
    //   transaction: trx
    // });

    // const oldTotals = {};
    // existingItems.forEach(it => {
    //   oldTotals[it.ChargeAccountID] =
    //     (oldTotals[it.ChargeAccountID] || 0) + Number(it.Sub_Total || 0);
    // });

    // Step 2: Delete all old items
    await TransactionItemsModel.destroy({
      where: { LinkID },
      transaction: trx
    });

    // Step 3: Create all new items
    const newTotals = {};
    const newRecords = Items.map(itm => {
      newTotals[itm.ChargeAccountID] =
        (newTotals[itm.ChargeAccountID] || 0) + Number(itm.Sub_Total || 0);

      return {
        ...itm,
        LinkID,
        InvoiceNumber,
        Active: true,
        CreatedBy: req.user.id,
        CreatedDate: new Date()
      };
    });

    if (newRecords.length > 0) {
      await TransactionItemsModel.bulkCreate(newRecords, { transaction: trx });
    }


    // Attachment handling
    const existingIDs = Attachments.filter(att => att.ID).map(att => att.ID);

    // Delete attachments removed from the list
    await AttachmentModel.destroy({
      where: {
        LinkID,
        ID: { [Op.notIn]: existingIDs }
      },
      transaction: trx
    });

    // Add new files
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        LinkID,
        DataName: file.originalname,
        DataType: file.mimetype,
        DataImage: `${req.uploadPath}/${file.filename}`
      }));
      await AttachmentModel.bulkCreate(newAttachments, { transaction: trx });
    }


    await trx.commit();
    res.json({ message: "Fund Utilization Request updated successfully" });
  } catch (err) {
    await trx.rollback();
    console.log("Error updating Fund Utilization Request:", err);
    res.status(500).json({ error: err.message });
  }
};



exports.getAll = async (req, res) => {
  try {
    const { selectedDepartmentID } = req.query;

    let whereClause = {
      Active: true,
      APAR: { [Op.like]: '%Fund Utilization Request%' }
    };

    let whereClause2 = {};
    if (selectedDepartmentID && selectedDepartmentID !== '') {
      // Filter by department ID if not "All"
      whereClause2['DepartmentID'] = Number(selectedDepartmentID);
    }

    // if (isAdminDept) {
    //   if (selectedDepartmentName && selectedDepartmentName !== 'All Departments') {
    //     whereClause['$Employee.Department.Name$'] = selectedDepartmentName;
    //   }
    // } else {
    //   whereClause['$Employee.Department.ID$'] = deptID;
    // }

    const obligations = await TransactionTableModel.findAll({
      where: whereClause,
      attributes: {
        include: [
          [literal('`FiscalYear`.`Name`'), 'FiscalYearName'],
          [literal('`Project`.`Title`'), 'ProjectName'],
        ]
      },
      include: [
        {
          model: TransactionItemsModel,
          as: 'TransactionItemsAll',
          required: false
        },
        {
          model: CustomerModel,
          as: 'Customer',
          required: false
        },
        {
          model: EmployeeModel,
          as: 'Employee',
          where: whereClause2,
          include: [
            {
              model: DepartmentModel,
              as: 'Department',
              required: false
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
      ],
      order: [['CreatedDate', 'DESC']]
    });

    res.json(obligations);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: err.message });
  }
};


exports.getById = async (req, res) => {
  try {
    const item = await TransactionTableModel.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "Transaction not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveTransaction = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { ID, LinkID, ApprovalLinkID, ApprovalProgress, NumberOfApproverPerSequence, FundsID, ApprovalVersion, ApprovalOrder } = req.body;

    const transaction = await TransactionTableModel.findByPk(ID, { transaction: t });
    if (!transaction) throw new Error("Transaction not found");
    if (transaction.Status === 'Void') throw new Error("Cannot approve a Voided transaction.");

    const alreadyPosted = transaction.Status === "Posted";
    const now = new Date();
    let newInvoiceNumber = transaction.InvoiceNumber;
    let currentNumber = null;

    if (!alreadyPosted) {
      currentNumber = await getCurrentNumber(t);
      newInvoiceNumber = `${FundsID}-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${currentNumber}`;
    }

    let newStatus = transaction.Status;
    if (!alreadyPosted) {
      newStatus = (Number(ApprovalProgress) >= Number(NumberOfApproverPerSequence)) ? "Posted" : "Requested";
    }

    await transaction.update({ ApprovalProgress, Status: newStatus, InvoiceNumber: newInvoiceNumber }, { transaction: t });

    if (newStatus === "Posted" && !alreadyPosted) {
      // Logic to move PreEncumbrance to Encumbrance in Budget
      const items = await TransactionItemsModel.findAll({ where: { LinkID: transaction.LinkID }, transaction: t });
      for (const item of items) {
        const budget = await BudgetModel.findByPk(item.ChargeAccountID, { transaction: t });
        if (budget) {
          const amount = Number(item.AmountDue || 0);
          await budget.update({
            PreEncumbrance: Math.max(0, Number(budget.PreEncumbrance) - amount),
            Encumbrance: Number(budget.Encumbrance) + amount
          }, { transaction: t });
        }
      }
      // Update DocType series
      await DocumentTypeModel.update({ CurrentNumber: Number(currentNumber) }, { where: { Name: "Fund Utilization Request" }, transaction: t });
    }

    await ApprovalAudit.create({
      LinkID: ApprovalLinkID,
      InvoiceLink: transaction.LinkID,
      PositionEmployeeID: req.user.employeeID,
      SequenceOrder: ApprovalOrder,
      ApprovalDate: now,
      CreatedBy: req.user.id,
      CreatedDate: now,
      ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: "Approved successfully" });
  } catch (err) {
    if (t) await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

exports.rejectTransaction = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { ID, ApprovalLinkID, Reason } = req.body;
    const transaction = await TransactionTableModel.findByPk(ID, { transaction: t });
    if (!transaction || transaction.Status === 'Void') throw new Error("Invalid transaction");

    await transaction.update({ Status: "Rejected" }, { transaction: t });

    // Revert PreEncumbrance
    const items = await TransactionItemsModel.findAll({ where: { LinkID: transaction.LinkID }, transaction: t });
    for (const item of items) {
      await BudgetModel.decrement({ PreEncumbrance: Number(item.AmountDue || 0) }, { where: { ID: item.ChargeAccountID }, transaction: t });
    }

    await ApprovalAudit.create({
      LinkID: ApprovalLinkID,
      InvoiceLink: transaction.LinkID,
      RejectionDate: new Date(),
      Remarks: Reason,
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      ApprovalVersion: transaction.ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: "Rejected successfully" });
  } catch (err) {
    if (t) await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  const { ID: transactionId } = req.body;
  const t = await db.sequelize.transaction();
  try {
    const trx = await TransactionTableModel.findOne({
      where: { ID: transactionId },
      transaction: t,
    });

    if (!trx) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    // Update status to Void
    await trx.update({ Status: 'Void' }, { transaction: t });

    // Log the void action
    await ApprovalAudit.create(
      {
        LinkID: generateLinkID(),
        InvoiceLink: trx.LinkID,
        PositionEmployeeID: req.user.employeeID,
        SequenceOrder: trx.ApprovalProgress || 0,
        ApprovalOrder: 0,
        Remarks: 'Voided',
        RejectionDate: new Date(),
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        ApprovalVersion: trx.ApprovalVersion || '1',
      },
      { transaction: t }
    );

    await t.commit();
    res.status(200).json({
      message: 'FURS record voided successfully',
      ID: transactionId,
      Status: 'Void',
    });
  } catch (error) {
    if (t) await t.rollback();
    console.error('Error voiding transaction:', error);
    return res.status(500).json({ error: error.message || 'Server error.' });
  }
};