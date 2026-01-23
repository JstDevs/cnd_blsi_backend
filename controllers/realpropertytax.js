const { TransactionTable, TransactionProperty, PropertyTaxDeclaration, GeneralLedger, ApprovalAudit, ServiceInvoiceAccounts } = require('../config/database');
const ChartOfAccountsModel = require('../config/database').ChartofAccounts;
const db = require('../config/database');
const generalLedger = require('../config/database').GeneralLedger;
const ApproversModel = require('../config/database').Approvers;

const generateLinkID = require("../utils/generateID")
// const getLatestApprovalVersion = require('../utils/getLatestApprovalVersion');

exports.addPresentList = async (req, res) => {
  try {
    const { tdNumber, generalRevisionYear } = req.query;

    const record = await PropertyTaxDeclaration.findOne({
      where: {
        T_D_No: tdNumber,
        GeneralRevision: generalRevisionYear
      }
    });

    if (!record) {
      return res.status(404).json({ message: "Property tax declaration not found." });
    }

    // ✅ Step 5: Return response
    return res.status(200).json(record);

  } catch (error) {
    console.error("❌ Error in addPresentList:", error);
    return res.status(500).json({ message: error.message });
  }
};

exports.getTDNumbersByOwner = async (req, res) => {
  try {
    const { ownerId, generalRevision } = req.query;

    if (!ownerId || !generalRevision) {
      return res.status(400).json({ message: "ownerId and generalRevision are required" });
    }

    // ✅ Fetch matching TD numbers
    const tdNumbers = await PropertyTaxDeclaration.findAll({
      where: {
        OwnerID: ownerId,
        GeneralRevision: generalRevision
      },
      attributes: ["T_D_No"], // only fetch T.D.No.
      raw: true
    });

    return res.status(200).json(tdNumbers);

  } catch (error) {
    console.error("❌ Error fetching TD numbers:", error);
    return res.status(500).json({ message: error.message });
  }
};


exports.save = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const data = req.body;

    const paid = parseFloat(data.RemainingBalance) === 0;

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

    const docID = 11;
    const refID = IsNew ? generateLinkID() : data.LinkID;
    // const latestapprovalversion=await getLatestApprovalVersion('Real Property Tax');

    let statusValue = '';
    const matrixExists = await db.ApprovalMatrix.findOne({
      where: {
        DocumentTypeID: docID,
        Active: 1,
      },
      transaction: t
    });

    statusValue = matrixExists ? 'Requested' : 'Posted';

    // ✅ Create new Customer if Owner doesn't exist (Manual Input Support)
    const CustomerModel = require('../config/database').Customer;
    if (IsNew && (!data.ownerId || data.ownerId === '') && data.CustomerName) {
      try {
        console.log('Creating New Owner/Customer (RPT):', data.CustomerName);
        const newCustomer = await CustomerModel.create({
          Name: data.CustomerName,
          Active: true,
          CreatedBy: req.user.id,
          CreatedDate: new Date(),
          ModifyBy: req.user.id,
          ModifyDate: new Date()
        }, { transaction: t });
        data.ownerId = newCustomer.ID;
        console.log('New Customer created with ID:', newCustomer.ID);
      } catch (err) {
        console.error('Error creating new customer:', err);
        throw new Error('Failed to create new customer: ' + err.message);
      }
    }

    if (IsNew) {
      // Insert into TransactionTable
      await TransactionTable.create({
        CustomerName: data.CustomerName,
        Municipality: data.Municipality,
        LinkID: refID,
        DocumentTypeID: docID,
        Status: statusValue,
        APAR: 'RPT',
        PreviousPayment: 0,
        AmountinWords: data.AmountinWords,
        AmountReceived: data.AmountReceived,
        RemainingBalance: data.RemainingBalance,
        CheckNumber: data.CheckNumber,
        T_D_No: data.T_D_No,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        Paid: paid,
        AdvancedYear: data.AdvancedYear,
        AdvanceFunds: data.AdvanceFunds,
        FundsID: data.FundsID,
        ReceivedFrom: data.ReceivedFrom,
        GeneralRevision: new Date().getFullYear().toString(),
        Active: 1,
        // ApprovalProgress: 0,
        // ApprovalVersion: latestapprovalversion
      }, { transaction: t });

      // Previous Payment Items
      if (data.PreviousPaymentList?.length) {
        for (const p of data.PreviousPaymentList) {
          await TransactionProperty.create({
            Owner: data.CustomerName,
            LinkID: refID,
            Location: data.Location,
            Lot: data.Lot,
            Block: data.Block,
            T_D_No: data.T_D_No,
            LandPrice: p.LandPrice,
            ImprovementPrice: p.ImprovementPrice,
            TotalAssessedValue: p.TotalAssessedValue,
            TaxDue: p.TaxDue,
            InstallmentPayment: p.InstallmentPayment,
            FullPayment: p.FullPayment,
            Penalty: p.Penalty,
            Total: p.Total,
            Present: 0,
            RequestedBy: req.user.id,
            CreatedDate: new Date(),
            CreatedBy: req.user.id
          }, { transaction: t });
        }
      }

      // Present Items
      if (data.PresentPaymentList?.length) {
        for (let i = 0; i < data.PresentPaymentList.length; i++) {
          const p = data.PresentPaymentList[i];
          await TransactionProperty.create({
            Owner: data.CustomerName,
            LinkID: refID,
            Location: data.Location,
            Lot: data.Lot,
            Block: data.Block,
            T_D_No: data.T_D_No,
            LandPrice: p.LandPrice,
            ImprovementPrice: p.ImprovementPrice,
            TotalAssessedValue: p.TotalAssessedValue,
            TaxDue: p.TaxDue,
            InstallmentNo: i + 1,
            InstallmentPayment: p.InstallmentPayment,
            FullPayment: p.FullPayment,
            Penalty: p.Penalty,
            Discount: p.Discount,
            Total: p.Total,
            Present: 1,
            RemainingBalance: p.RemainingBalance,
            RequestedBy: req.user.id,
            CreatedDate: new Date(),
            CreatedBy: req.user.id
          }, { transaction: t });
        }
      }

    } else {
      // If Editing:
      await TransactionProperty.destroy({ where: { LinkID: refID }, transaction: t });

      // Insert into TransactionTable
      await TransactionTable.create({
        CustomerName: data.CustomerName,
        Municipality: data.Municipality,
        LinkID: refID,
        DocumentTypeID: docID,
        Status: statusValue,
        APAR: 'RPT',
        PreviousPayment: 0,
        AmountinWords: data.AmountinWords,
        AmountReceived: data.AmountReceived,
        RemainingBalance: data.RemainingBalance,
        CheckNumber: data.CheckNumber,
        T_D_No: data.T_D_No,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        Paid: paid,
        AdvancedYear: data.AdvancedYear,
        AdvanceFunds: data.AdvanceFunds,
        FundsID: data.FundsID,
        ReceivedFrom: data.ReceivedFrom,
        GeneralRevision: new Date().getFullYear().toString(),
        Active: 1,
        // ApprovalProgress: 0,
        // ApprovalVersion: latestapprovalversion
      }, { transaction: t });


      // Previous Payment Items
      if (data.PreviousPaymentList?.length) {
        for (const p of data.PreviousPaymentList) {
          await TransactionProperty.create({
            Owner: data.CustomerName,
            LinkID: refID,
            Location: data.Location,
            Lot: data.Lot,
            Block: data.Block,
            T_D_No: data.T_D_No,
            LandPrice: p.LandPrice,
            ImprovementPrice: p.ImprovementPrice,
            TotalAssessedValue: p.TotalAssessedValue,
            TaxDue: p.TaxDue,
            InstallmentPayment: p.InstallmentPayment,
            FullPayment: p.FullPayment,
            Penalty: p.Penalty,
            Total: p.Total,
            Present: 0,
            RequestedBy: req.user.id,
            CreatedDate: new Date(),
            CreatedBy: req.user.id
          }, { transaction: t });
        }
      }

      // Present Items
      if (data.PresentPaymentList?.length) {
        for (let i = 0; i < data.PresentPaymentList.length; i++) {
          const p = data.PresentPaymentList[i];
          await TransactionProperty.create({
            Owner: data.CustomerName,
            LinkID: refID,
            Location: data.Location,
            Lot: data.Lot,
            Block: data.Block,
            T_D_No: data.T_D_No,
            LandPrice: p.LandPrice,
            ImprovementPrice: p.ImprovementPrice,
            TotalAssessedValue: p.TotalAssessedValue,
            TaxDue: p.TaxDue,
            InstallmentNo: i + 1,
            InstallmentPayment: p.InstallmentPayment,
            FullPayment: p.FullPayment,
            Penalty: p.Penalty,
            Discount: p.Discount,
            Total: p.Total,
            Present: 1,
            RemainingBalance: p.RemainingBalance,
            RequestedBy: req.user.id,
            CreatedDate: new Date(),
            CreatedBy: req.user.id
          }, { transaction: t });
        }
      }
    }

    await t.commit();
    res.status(201).json({ message: 'success' });

  } catch (err) {
    console.error('Transaction Save Error:', err);
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const results = await TransactionTable.findAll({
      where: {
        APAR: 'RPT'
      },
      order: [['CreatedBy', 'DESC']],
      include: [
        {
          model: TransactionProperty,
          as: 'properties',
          required: false
        },
      ]
    });

    res.status(200).json(results);
  } catch (error) {
    console.error('Error loading:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch RPT transaction list' });
  }
};

// Helper to get rate/name/code from DB
async function getServiceInvoiceAccountDetails(id) {
  const account = await ServiceInvoiceAccounts.findOne({
    where: { ID: id },
    include: [
      {
        model: ChartOfAccountsModel,
        as: "Account",
        attributes: ["AccountCode"],
      },
    ],
  });

  if (!account) throw new Error(`Service Invoice Account with ID=${id} not found`);

  return {
    rate: account.Rate,
    name: account.Name,
    code: account.Account?.AccountCode,
  };
}

// Compute value = varTotal * rate%
function computeValue(rate, varTotal) {
  return Math.round((varTotal * (rate / 100)) * 100) / 100; // 2 decimals
}

exports.postTransaction = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id, transactionApprovalVersion: varTransactionApprovalVersion, linkID: varLinkID, approvalLinkID: varApprovalLink, approvalProgress, amountReceived: varTotal, ApprovalOrder: numberofApproverperSequence } = req.body;

    const SequenceOrder = approvalProgress;

    // ✅ Step 1: Update Transaction Table
    await TransactionTable.update(
      {
        ApprovalProgress: approvalProgress,
        Status: "Posted"
      },
      {
        where: { ID: id },
        transaction: t
      }
    );


    // --- Fetch account details ---
    const account5 = await getServiceInvoiceAccountDetails(5); // Special Education Fund
    const account4 = await getServiceInvoiceAccountDetails(4); // General Fund
    const account3 = await getServiceInvoiceAccountDetails(3); // General Fund

    // --- Insert 4 rows ---
    const rows = [
      {
        LinkID: varLinkID,
        FundID: 3,
        FundName: "Special Education Fund",
        LedgerItem: account5.name,
        AccountName: account5.name,
        AccountCode: account5.code,
        Debit: 0,
        Credit: computeValue(account5.rate, varTotal),
        DocumentTypeName: "Community Tax",
        CreatedBy: req.user.id,
        CreatedDate: new Date()
      },
      {
        LinkID: varLinkID,
        FundID: 1,
        FundName: "General Fund",
        LedgerItem: account4.name,
        AccountName: account4.name,
        AccountCode: account4.code,
        Debit: 0,
        Credit: computeValue(account4.rate, varTotal),
        DocumentTypeName: "Community Tax",
        CreatedBy: req.user.id,
        CreatedDate: new Date()
      },
      {
        LinkID: varLinkID,
        FundID: 1,
        FundName: "General Fund",
        LedgerItem: account3.name,
        AccountName: account3.name,
        AccountCode: account3.code,
        Debit: 0,
        Credit: computeValue(account3.rate, varTotal),
        DocumentTypeName: "Community Tax",
        CreatedBy: req.user.id,
        CreatedDate: new Date()
      },
      {
        LinkID: varLinkID,
        FundID: 1,
        FundName: "General Fund",
        LedgerItem: "Cash - Local Treasury",
        AccountName: "Cash - Local Treasury",
        AccountCode: "1-01-01-010",
        Debit: varTotal,
        Credit: 0,
        DocumentTypeName: "Community Tax",
        CreatedBy: req.user.id,
        CreatedDate: new Date()
      },
    ];

    // Bulk insert
    await generalLedger.bulkCreate(rows, { transaction: t });

    await ApprovalAudit.create(
      {
        LinkID: varApprovalLink,
        InvoiceLink: varLinkID,
        PositionOrEmployee: "Employee",
        PositionOrEmployeeID: req.user.employeeID,
        SequenceOrder: SequenceOrder,
        ApprovalOrder: numberofApproverperSequence,
        ApprovalDate: new Date(),
        RejectionDate: null,
        Remarks: null,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        ApprovalVersion: varTransactionApprovalVersion,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(200).json({ message: "Transaction posted successfully" });

  } catch (error) {
    await t.rollback();
    console.error("❌ Error in postTransaction:", error);
    return res.status(500).json({ message: error.message });
  }
};

exports.rejectTransaction = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id, approvalLinkID, reasonForRejection } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Transaction ID is required" });
    }

    if (!reasonForRejection || reasonForRejection.trim() === "") {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    // 1️⃣ Update Transaction Table
    await TransactionTable.update(
      { Status: "Rejected" },
      { where: { ID: id }, transaction: t }
    );

    // 2️⃣ Insert Approval Audit record
    await ApprovalAudit.create(
      {
        LinkID: approvalLinkID,
        RejectionDate: new Date(),
        Remarks: reasonForRejection,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
      },
      { transaction: t }
    );

    // ✅ Commit transaction
    await t.commit();

    return res.status(200).json({ message: "Transaction rejected successfully" });

  } catch (error) {
    await t.rollback();
    console.error("❌ Error rejecting transaction:", error);
    return res.status(500).json({ message: error.message });
  }
};


exports.void = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Transaction ID is required" });
    }
    // Find Transaction
    const transaction = await TransactionTable.findOne({ where: { ID: id } });

    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ message: "Transaction not found" });
    }
    // Update Status to Voided
    await TransactionTable.update(
      { Status: "Void" },
      { where: { ID: id }, transaction: t }
    );

    // Log Void action in ApprovalAudit
    await ApprovalAudit.create(
      {
        LinkID: generateLinkID(),
        InvoiceLink: transaction.LinkID,
        RejectionDate: new Date(),
        Remarks: "Real Property Tax Receipt Voided by User",
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
      },
      { transaction: t }
    )
    await t.commit();
    return res.status(200).json({ message: "Transaction voided Successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Error voiding transaction:", error);
    return res.status(500).json({ message: error.message });
  }
};



// import { ServiceInvoiceAccount, ChartOfAccounts } from "../models/index.js";

// Generic function to compute value from ServiceInvoiceAccount by ID
async function giveValueById(varTotal, accountId) {
  const rate = await getRateById(accountId);
  const percent = rate / 100;
  const temp = varTotal * percent;
  return Number(temp.toFixed(2)); // equivalent to Math.Round(..., 2)
}

// ✅ Get Rate
async function getRateById(accountId) {
  const account = await ServiceInvoiceAccount.findOne({
    where: { ID: accountId },
    attributes: ["Rate"]
  });
  return account ? account.Rate : 0;
}

// ✅ Get Name
async function getNameById(accountId) {
  const account = await ServiceInvoiceAccount.findOne({
    where: { ID: accountId },
    attributes: ["Name"]
  });
  return account ? account.Name : null;
}

// ✅ Get Account Code
async function getCodeById(accountId) {
  const account = await ServiceInvoiceAccount.findOne({
    where: { ID: accountId },
    attributes: ["ChartOfAccountsID"]
  });

  if (!account) return null;

  const coa = await ChartOfAccountsModel.findOne({
    where: { ID: account.ChartOfAccountsID },
    attributes: ["AccountCode"]
  });

  return coa ? coa.AccountCode : null;
}


async function funNumberofApproverperSequence(linkId, varTransactionApprovalVersion) {
  try {
    const approvers = await ApproversModel.findAll({
      where: {
        LinkID: linkId,
        ApprovalVersion: varTransactionApprovalVersion
      },
      attributes: ["ID"]
    });

    return approvers.length;
  } catch (error) {
    console.error("❌ Error in funNumberofApproverperSequence:", error);
    return 0;
  }
}

async function funNumberofApprovedperSequence(linkId, sequenceOrder, invoiceLink, varTransactionApprovalVersion) {
  try {
    sequenceOrder -= 1;

    return await ApprovalAudit.count({
      where: {
        LinkID: linkId,
        SequenceOrder: sequenceOrder,
        InvoiceLink: invoiceLink,
        ApprovalVersion: varTransactionApprovalVersion
      }
    });
  } catch (err) {
    console.error("Error in funNumberofApprovedperSequence:", err);
    return 0;
  }
}
