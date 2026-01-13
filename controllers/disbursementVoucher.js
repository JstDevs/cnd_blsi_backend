const TransactionTableModel = require('../config/database').TransactionTable;
const ContraAccountModel = require('../config/database').ContraAccount;
const DepartmentModel = require('../config/database').department;
const EmployeeModel = require('../config/database').employee;
const VendorModel = require('../config/database').vendor;
const FundsModel = require('../config/database').Funds;
const CustomerModel = require('../config/database').Customer;
const TransactionItems = require('../config/database').TransactionItems;
const ItemModel = require('../config/database').Item;
const ChartofAccountsModel = require('../config/database').ChartofAccounts;
const BudgetModel = require('../config/database').Budget;
const TaxCodeModel = require('../config/database').taxCode;
const AttachmentModel = require('../config/database').Attachment;
const GeneralLedgerModel = require('../config/database').GeneralLedger;
const DocumentTypeModel = require('../config/database').documentType;
const ApprovalAuditModel = require('../config/database').ApprovalAudit;

const { Op, where } = require('sequelize');
const db = require('../config/database')
const generateLinkID = require("../utils/generateID")
const getLatestApprovalVersion = require('../utils/getLatestApprovalVersion');



// const totalApprovers = await Approvers.count({
//   where: {
//     LinkID: trx.ApprovalLink,
//     ApprovalVersion: trx.ApprovalVersion
//   },
//   transaction: t
// });

// const alreadyApproved = await ApprovalAudit.count({
//   where: {
//     LinkID: trx.ApprovalLink,
//     SequenceOrder: trx.ApprovalProgress - 1,
//     InvoiceLink: trx.ID,
//     ApprovalVersion: trx.ApprovalVersion
//   },
//   transaction: t
// });

// const numberOfApproverPerSequence = (totalApprovers - 1) - alreadyApproved;


// exports.create = async (req, res) => {
//     const t = await db.sequelize.transaction();
//     try {
//         const { 
//             InvoiceNumber,
//             InvoiceDate,
//             BillingDueDate,
//             Total,
//             VATExcludedPrice,
//             BankID,
//             CheckNumber,
//             ReceivedPaymentBy,
//             EWT,
//             WithheldAmount,
//             Vat_Total,
//             Discounts,
//             AmountinWords,
//             OfficeUnitProject,
//             ModeOfPayment,
//             ObligationRequestNumber,
//             ContraAccountID,
//             ContraNormalBalance,

//             OBR_LinkID,

//             Contras,

//         } = req.body;

//         let { 
//           VendorID,
//           CustomerID,
//           EmployeeID,
//           FundsID,
//           ResponsibilityCenter
//         } = req.body;

//         VendorID = Number(VendorID) || 0;
//         CustomerID = Number(CustomerID) || 0;
//         EmployeeID = Number(EmployeeID) || 0;
//         ResponsibilityCenter = Number(ResponsibilityCenter) || 0;
//         FundsID = Number(FundsID) || 0;

//         if(!ContraAccountID) {
//           throw new Error("Please choose a Contra Account");
//         }

//         let { Items } = req.body;
//         Items = Items ? JSON.parse(Items) : [];

//         const LinkID = generateLinkID();

//         const latestApprovalVersion = await getLatestApprovalVersion('Disbursement Voucher');

//         const transactionRecord = await TransactionTableModel.create({
//             DocumentTypeID: 14,
//             LinkID,
//             APAR: 'Disbursement Voucher',
//             VendorID,
//             InvoiceNumber,
//             InvoiceDate,
//             BillingDueDate,
//             Total,
//             VATExcludedPrice,
//             BankID,
//             CheckNumber,
//             ReceivedPaymentBy,
//             RequestedBy: req.user.employeeID,
//             Status: 'Requested',
//             Active: 1,
//             CreatedBy: req.user.id,
//             CreatedDate: new Date(),
//             Credit: Total,
//             Debit: Total,
//             EWT,
//             WithheldAmount,
//             Vat_Total,
//             Discounts,
//             AmountinWords,
//             EmployeeID,
//             ResponsibilityCenter,
//             OfficeUnitProject,
//             ModeOfPayment,
//             ObligationRequestNumber,
//             ApprovalProgress: 0,
//             ContraAccountID,
//             FundsID,
//             ContraNormalBalance,
//             ApprovalVersion: latestApprovalVersion,
//             CustomerID
//         }, { transaction: t });


//         await TransactionTableModel.update({
//             Status: 'Posted, Disbursement Pending'
//         }, {
//             where: { LinkID: OBR_LinkID },
//             transaction: t
//         });

//         const UniqueID = generateLinkID();
//         for (const item of Items) {
//             const account = await BudgetModel.findOne({
//               where: { ID: item.ChargeAccountID },
//               include: [
//                 {
//                   model: ChartofAccountsModel,
//                   as: 'ChartofAccounts',
//                   attributes: ['NormalBalance'],
//                 }
//               ]
//             });
//             let credit = 0;
//             let debit = 0;
//             if (account.ChartofAccounts?.NormalBalance === 'Debit') debit = item.subtotal;
//             else if (account.ChartofAccounts?.NormalBalance === 'Credit') credit = item.subtotal;

//             const tax = await TaxCodeModel.findByPk(item.TAXCodeID, { transaction: t });
//             if (!tax) {
//               throw new Error(`Tax Code with ID ${item.TAXCodeID} not found`);
//             }

//             await TransactionItems.create({
//             UniqueID,
//             LinkID,
//             ItemID: item.ItemID,
//             ChargeAccountID: item.ChargeAccountID,
//             Quantity: item.Quantity,
//             ItemUnitID: item.ItemUnitID,
//             Price: item.Price,
//             TAXCodeID: item.TAXCodeID,
//             TaxName: tax.Name,
//             TaxRate: tax.Rate,
//             Sub_Total_Vat_Ex: item.subtotalTaxExcluded,
//             Active: 1,
//             CreatedBy: req.user.id,
//             CreatedDate: new Date(),
//             Credit: credit,
//             Debit: debit,
//             Vat_Total: item.vat,
//             EWT: item.ewt,
//             WithheldAmount: item.withheld,
//             Sub_Total: item.subtotalBeforeDiscount,
//             EWTRate: item.withheldEWT,
//             Discounts: item.discount,
//             DiscountRate: item.DiscountRate,
//             AmountDue: item.subtotal,
//             PriceVatExclusive: item.subtotalTaxExcluded,
//             Remarks: item.Remarks,
//             FPP: item.FPP,
//             Discounted: item.Discounted,
//             InvoiceNumber
//             }, { transaction: t });
//         }


//         await ContraAccountModel.destroy({ where: { LinkID }, transaction: t });

//         if (Array.isArray(Contras)) {
//           for (const row of Contras) {
//               await ContraAccountModel.create({
//               LinkID: refID,
//               ContraAccountID: row.ContraAccountID,
//               NormalBalance: row.NormalBalance,
//               Amount: Number(row.Amount)
//               }, { transaction: t });
//           }
//         }



//         // Add new files
//         if (req.files && req.files.length > 0) {
//             const blobAttachments = req.files.map((file) => ({
//                 LinkID,
//                 DataName: file.originalname,
//                 DataType: file.mimetype,
//                 DataImage: `${req.uploadPath}/${file.filename}`,
//             }));

//             await Attachment.bulkCreate(blobAttachments, { transaction: t });
//         }


//         await t.commit();



//         res.status(201).json("created");
//     } catch (err) {
//         console.error("Error saving data:", err);
//         await t.rollback();
//         res.status(500).json({ error: err.message });
//     }
// };

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

    let {
      VendorID,
      CustomerID,
      EmployeeID,
      FundsID,
      ResponsibilityCenter,
    } = parsedFields;
    VendorID = Number(VendorID) || 0;
    CustomerID = Number(CustomerID) || 0;
    EmployeeID = Number(EmployeeID) || 0;
    ResponsibilityCenter = Number(ResponsibilityCenter) || 0;
    FundsID = Number(FundsID) || 0;

    const documentTypeID = 14;

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

    let IsStandaloneRequest = '';
    if ((data.IsStandaloneRequest == "true") || (data.IsStandaloneRequest === true) || (data.IsStandaloneRequest == '1') || (data.IsStandaloneRequest == 1)) {
      IsStandaloneRequest = true;
    }
    else {
      IsStandaloneRequest = false;
    }

    const Contras = data.Contras || [];

    const refID = (IsNew) ? generateLinkID() : data.LinkID;
    const latestApprovalVersion = await getLatestApprovalVersion('Disbursement Voucher');

    let obligationRequestNumber = data.ObligationRequestNumber;
    if (data.OBR_LinkID && !obligationRequestNumber) {
      const obr = await TransactionTableModel.findOne({
        where: { LinkID: data.OBR_LinkID },
        transaction: t
      });
      if (obr) {
        obligationRequestNumber = obr.InvoiceNumber;
        if (!FundsID) {
          FundsID = obr.FundsID;
        }
      }
    }

    let communityData = {
      DocumentTypeID: documentTypeID,
      LinkID: refID,
      APAR: 'Disbursement Voucher',
      VendorID: VendorID,
      InvoiceNumber: data.InvoiceNumber,
      InvoiceDate: data.InvoiceDate,
      BillingDueDate: data.BillingDueDate,
      Total: data.Total,
      VATExcludedPrice: data.VATExcludedPrice,
      BankID: data.BankID,
      CheckNumber: data.CheckNumber,
      ReceivedPaymentBy: data.ReceivedPaymentBy,
      RequestedBy: req.user.employeeID,
      Status: 'Requested',
      Active: 1,
      Credit: data.Total,
      Debit: data.Total,
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      EWT: data.EWT,
      WithheldAmount: data.WithheldAmount,
      Vat_Total: data.Vat_Total,
      Discounts: data.Discounts,
      AmountinWords: data.AmountinWords,
      EmployeeID: EmployeeID,
      ResponsibilityCenter: ResponsibilityCenter,
      OfficeUnitProject: data.OfficeUnitProject,
      ModeOfPayment: data.ModeOfPayment,
      ObligationRequestNumber: obligationRequestNumber,
      ApprovalProgress: 0,
      ContraAccountID: data.ContraAccountID,
      FundsID: FundsID,
      ContraNormalBalance: data.ContraNormalBalance,
      ApprovalVersion: latestApprovalVersion,
      CustomerID: CustomerID || null
    };

    let header;
    if (IsNew) {
      header = await TransactionTableModel.create(communityData, { transaction: t });
    } else {
      await TransactionTableModel.update(communityData, {
        where: { LinkID: refID },
        transaction: t
      });

      await TransactionItems.destroy({ where: { LinkID: refID }, transaction: t });
    }

    // Insert Transaction Items
    const UniqueID = generateLinkID();
    for (const item of data.Items) {
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
      let credit = 0;
      let debit = 0;
      if (!account) {
        throw new Error(`Budget with ID ${item.ChargeAccountID} not found`);
      }
      if (account.ChartofAccounts?.NormalBalance === 'Debit') debit = item.subtotal;
      else if (account.ChartofAccounts?.NormalBalance === 'Credit') credit = item.subtotal;

      const tax = await TaxCodeModel.findByPk(item.TAXCodeID, { transaction: t });
      if (!tax) {
        throw new Error(`Tax Code with ID ${item.TAXCodeID} not found`);
      }

      await TransactionItems.create({
        UniqueID: UniqueID,
        LinkID: refID,
        ItemID: item.ItemID,
        ChargeAccountID: item.ChargeAccountID,
        Quantity: item.Quantity,
        ItemUnitID: item.UnitID,
        Price: item.Price,
        TAXCodeID: item.TAXCodeID,
        TaxName: item.TaxName,
        TaxRate: item.TaxRate,
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
        EWTRate: item.withheldEWT,
        Discounts: item.discount,
        DiscountRate: item.DiscountRate,
        AmountDue: item.subtotal,
        PriceVatExclusive: item.subtotalTaxExcluded,
        Remarks: item.Remarks,
        FPP: item.FPP,
        Discounted: item.Discounted,
        InvoiceNumber: data.InvoiceNumber
      }, { transaction: t });
    }

    // Contra Account Logic
    await ContraAccountModel.destroy({ where: { LinkID: refID }, transaction: t });

    if (Array.isArray(Contras)) {
      for (const contra of Contras) {
        await ContraAccountModel.create({
          LinkID: refID,
          ContraAccountID: contra.ContraAccountID,
          NormalBalance: contra.NormalBalance,
          Amount: contra.Amount
        }, { transaction: t });
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


    // Update Obligation Status
    if (!IsStandaloneRequest) {
      await TransactionTableModel.update(
        { Status: 'Posted, Disbursement Pending' },
        { where: { LinkID: data.OBR_LinkID }, transaction: t }
      );
    }

    await t.commit();
    return res.status(200).json({ message: 'success' });

  } catch (error) {
    console.error(error);
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};


exports.selectListForDV = async (req, res) => {
  try {
    const id = req.query.id || 0;
    const type = req.query.type || '';
    const reqType = req.query.requestType || '';

    let apar = 'N/A';
    if (reqType == 'Obligation Request') {
      apar = 'Obligation Request';
    }
    else if (reqType == 'FURS') {
      apar = 'Fund Utilization Request';
    }
    else {
      throw new Error('Invalid reqType specified');
    }

    let whereCondition = {
      Status: 'Posted',
      APAR: {
        [Op.like]: `%` + apar + `%`
      }
    };

    let includeModel = null;

    if (type === 'Employee') {
      whereCondition.EmployeeID = id;
      includeModel = {
        model: EmployeeModel,
        as: 'Employee',
        attributes: ['FirstName', 'MiddleName', 'LastName', 'StreetAddress'],
      };
    } else if (type === 'Vendor') {
      whereCondition.VendorID = id;
      includeModel = {
        model: VendorModel,
        as: 'Vendor',
        attributes: ['Name', 'TIN', 'StreetAddress'],
      };
    } else if (type === 'Individual') {
      whereCondition.CustomerID = id;
      includeModel = {
        model: CustomerModel,
        as: 'Customer',
        attributes: ['Name', 'TIN', 'StreetAddress'],
      };
    } else {
      throw new Error('Invalid type specified');
    }

    const results = await TransactionTableModel.findAll({
      where: whereCondition,
      include: [
        includeModel,
        {
          model: FundsModel,
          as: 'sourceFunds',
          required: false,
        },
        {
          model: TransactionItems,
          as: 'TransactionItemsAll',
          required: false,
          include: [
            {
              model: ItemModel,
              as: 'Item',
              required: false,
            },
            {
              model: BudgetModel,
              as: 'ChargeAccount',
              include: [
                {
                  model: ChartofAccountsModel,
                  as: 'ChartofAccounts',
                  required: false,
                }
              ],
              required: false,
            },
          ]
        },
      ],
      order: [['InvoiceDate', 'ASC']],
    });

    res.json(results);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { selectedDepartmentID } = req.query;

    const condition = {
      Active: 1,
      APAR: {
        [Op.like]: '%Disbursement Voucher%'
      }
    };

    let whereClause = {};
    if (selectedDepartmentID && selectedDepartmentID !== '') {
      // Filter by department ID if not "All"
      whereClause['DepartmentID'] = Number(selectedDepartmentID);
    }

    // Filter by requesting user's department if not in [1,2,3,4]
    // if (![1, 2, 3, 4].includes(departmentID)) {
    //   condition['$RequestedByEmployee.DepartmentID$'] = departmentID;
    // }

    const data = await TransactionTableModel.findAll({
      where: condition,
      include: [
        {
          model: AttachmentModel,
          as: 'Attachments',
          required: false,
        },
        {
          model: DepartmentModel,
          as: 'Department',
          required: false,
        },
        {
          model: FundsModel,
          as: 'Funds',
          required: false,
        },
        {
          model: EmployeeModel,
          where: whereClause,
          as: 'RequestedByEmployee', // Employee who requested the voucher
          required: false,
          include: [
            {
              model: DepartmentModel,
              as: 'Department', // The requester's department
              required: false,
            }
          ]
        }
      ],
      order: [['CreatedDate', 'DESC']]
    });

    res.status(200).json(data);
  } catch (err) {
    console.error("Error loading disbursement vouchers:", err);
    res.status(500).json({ error: err.message });
  }
};


exports.getById = async (req, res) => {
  try {
    throw new Error('getById is not implemented for Disbursement Vouchers');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// exports.update = async (req, res) => {
//   const t = await db.sequelize.transaction();
//   try {
//     const {
//       ID, // Main record ID (required)
//       InvoiceNumber,
//       InvoiceDate,
//       BillingDueDate,
//       Total,
//       VATExcludedPrice,
//       BankID,
//       CheckNumber,
//       ReceivedPaymentBy,
//       EWT,
//       WithheldAmount,
//       Vat_Total,
//       Discounts,
//       AmountinWords,
//       OfficeUnitProject,
//       ModeOfPayment,
//       ObligationRequestNumber,
//       ContraAccountID,
//       ContraNormalBalance,

//       Items,
//       Contras
//     } = req.body;

//     let { 
//       VendorID,
//       CustomerID,
//       EmployeeID,
//       ResponsibilityCenter,
//       FundsID
//     } = req.body;

//     VendorID = Number(VendorID) || 0;
//     CustomerID = Number(CustomerID) || 0;
//     EmployeeID = Number(EmployeeID) || 0;
//     ResponsibilityCenter = Number(ResponsibilityCenter) || 0;
//     FundsID = Number(FundsID) || 0;

//     const LinkID = req.body.LinkID;

//     if (!ID || !LinkID) throw new Error("ID and LinkID are required for update");

//     // Update TransactionTable
//     await TransactionTableModel.update({
//         Status: 'Requested',
//         VendorID,
//         InvoiceNumber,
//         InvoiceDate,
//         ResponsibilityCenter,
//         BillingDueDate,
//         Total,
//         VATExcludedPrice,
//         BankID,
//         CheckNumber,
//         ReceivedPaymentBy,
//         ModifyBy: req.user.id,
//         ModifyDate: new Date(),
//         Credit: Total,
//         EWT,
//         WithheldAmount,
//         Vat_Total,
//         Discounts,
//         EmployeeID,
//         OfficeUnitProject,
//         ModeOfPayment,
//         Debit: Total,
//         ObligationRequestNumber,
//         AmountinWords,
//         ContraAccountID,
//         ApprovalProgress: 0,
//         CustomerID
//     }, {
//       where: { ID },
//       transaction: t
//     });

//     // Delete and reinsert TransactionItems
//     await TransactionItems.destroy({ where: { LinkID }, transaction: t });

//     const UniqueID = generateLinkID();
//     for (const item of Items) {
//       let credit = 0;
//       let debit = 0;

//       await TransactionItems.create({
//         UniqueID,
//         LinkID,
//         ItemID: item.ItemID,
//         ChargeAccountID: item.ChargeAccountID,
//         Quantity: item.Quantity,
//         ItemUnitID: item.ItemUnitID,
//         Price: item.Price,
//         TAXCodeID: item.TAXCodeID,
//         TaxName: item.TaxName,
//         TaxRate: item.TaxRate,
//         Sub_Total_Vat_Ex: item.Sub_Total_Vat_Ex,
//         Active: 1,
//         CreatedBy: req.user.id,
//         CreatedDate: new Date(),
//         Credit: credit,
//         Debit: debit,
//         Vat_Total: item.Vat_Total,
//         EWT: item.EWT,
//         WithheldAmount: item.WithheldAmount,
//         Sub_Total: item.Sub_Total,
//         EWTRate: item.EWTRate,
//         Discounts: item.Discounts,
//         DiscountRate: item.DiscountRate,
//         AmountDue: item.AmountDue,
//         PriceVatExclusive: item.PriceVatExclusive,
//         Remarks: item.Remarks,
//         FPP: item.FPP,
//         Discounted: item.Discounted,
//         InvoiceNumber
//       }, { transaction: t });
//     }

//     // Delete and reinsert ContraAccounts
//     await ContraAccountModel.destroy({ where: { LinkID }, transaction: t });

//     if (Array.isArray(Contras)) {
//       for (const row of Contras) {
//         await ContraAccountModel.create({
//           LinkID,
//           ContraAccountID: row.ContraAccountID,
//           NormalBalance: row.NormalBalance,
//           Amount: Number(row.Amount)
//         }, { transaction: t });
//       }
//     }

//     // Delete and reinsert Attachments
//     await Attachment.destroy({ where: { LinkID }, transaction: t });

//     if (req.files && req.files.length > 0) {
//       const blobAttachments = req.files.map((file) => ({
//         LinkID,
//         DataName: file.originalname,
//         DataType: file.mimetype,
//         DataImage: `${req.uploadPath}/${file.filename}`,
//       }));

//       await Attachment.bulkCreate(blobAttachments, { transaction: t });
//     }

//     await t.commit();

//     res.status(200).json("updated");
//   } catch (err) {
//     console.error("Error updating data:", err);
//     await t.rollback();
//     res.status(500).json({ error: err.message });
//   }
// };


exports.delete = async (req, res) => {
  try {
    throw new Error('delete is not implemented for Disbursement Vouchers');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.approve = async (req, res) => {
  const { ID } = req.body;
  const id = ID;

  const t = await db.sequelize.transaction();

  try {
    // 1. Fetch Transaction Record
    const trx = await TransactionTableModel.findOne({
      where: { ID: id },
      include: [
        { model: TransactionItems, as: 'TransactionItemsAll', required: false }, // Fixed alias from TransactionItems to TransactionItemsAll
        { model: GeneralLedgerModel, as: 'GeneralLedger', required: false },
        { model: FundsModel, as: 'Funds', required: false }
        // Add associations for Budget, etc. if needed
      ],
      transaction: t
    });

    if (!trx) throw new Error('Transaction not found');

    if (trx.Status && trx.Status.includes('Posted')) {
      await t.rollback();
      return res.json({ message: 'Transaction already posted.' });
    }

    const fundCode = trx.Funds?.Code;
    const approvalProgress = Number(trx.ApprovalProgress) || 0;
    const varLinkID = trx.LinkID;
    const dtItemList = trx.TransactionItemsAll || []; // Use updated alias
    const dtGeneralLedgerDV = trx.GeneralLedger || [];

    console.log(`[DV Approve] Processing ID: ${id}, LinkID: ${varLinkID}`);
    console.log(`[DV Approve] Found ${dtItemList.length} items in TransactionItemsAll`);

    // 2. Generate new invoice number (e.g., 200-202508-0012)
    const docType = await DocumentTypeModel.findOne({ where: { ID: 14 }, transaction: t });
    const currentNumber = parseInt(docType.CurrentNumber || 0) + 1;
    const currentYYMM = new Date().toISOString().slice(0, 7).replace('-', '');
    const newInvoiceNumber = `${fundCode}-${currentYYMM}-${currentNumber.toString().padStart(4, '0')}`;

    // 3. Validate Budget (simplified)
    const chargeAccountSums = {};
    for (const item of dtItemList) {
      const acctId = item.ChargeAccountID;
      const debit = parseFloat(item.Debit || 0);
      const credit = parseFloat(item.Credit || 0);
      const subtotal = debit > 0 ? debit : -credit;

      console.log(`[DV Approve] Item: ChargeAccountID=${acctId}, Subtotal=${subtotal}`);
      chargeAccountSums[acctId] = (chargeAccountSums[acctId] || 0) + subtotal;
    }

    for (const acctId of Object.keys(chargeAccountSums)) {
      const budget = await BudgetModel.findOne({ where: { ID: acctId }, transaction: t });
      const requiredAmount = chargeAccountSums[acctId];

      if (!budget) {
        console.error(`[DV Approve] Budget record not found for ID: ${acctId}`);
        throw new Error(`Budget record not found for account ${acctId}`);
      }

      console.log(`[DV Approve] Budget ID ${acctId} BEFORE update: AllotmentBalance=${budget.AllotmentBalance}, Encumbrance=${budget.Encumbrance}, Charges=${budget.Charges}`);

      if (budget.AllotmentBalance < requiredAmount) {
        throw new Error(`Insufficient budget for account ${acctId}`);
      }

      // Update budget values
      await budget.update({
        Encumbrance: parseFloat(budget.Encumbrance || 0) - requiredAmount,
        AllotmentBalance: parseFloat(budget.AllotmentBalance || 0) - requiredAmount,
        Charges: parseFloat(budget.Charges || 0) + requiredAmount
      }, { transaction: t });

      console.log(`[DV Approve] Budget ID ${acctId} AFTER update: Deducted ${requiredAmount} from Encumbrance & AllotmentBalance, Added to Charges`);
    }

    // 4. Update Transaction Table
    await trx.update({
      ApprovalProgress: approvalProgress + 1,
      InvoiceNumber: newInvoiceNumber,
      Status: fundCode === '200' || fundCode === '300'
        ? 'Posted, Cheque Pending'
        : 'Posted'
    }, { transaction: t });

    // 5. Insert General Ledger
    for (const gl of dtGeneralLedgerDV) {
      await GeneralLedgerModel.create({
        LinkID: gl.LinkID,
        FundID: gl.FundID,
        FundName: gl.FundName,
        LedgerItem: gl.LedgerItem,
        AccountName: gl.AccountName,
        AccountCode: gl.AccountCode,
        Debit: gl.Debit,
        Credit: gl.Credit,
        CreatedBy: trx.CreatedBy,
        CreatedDate: new Date(),
        DocumentTypeName: ""
      }, { transaction: t });
    }

    // 6. Update Transaction Items
    await TransactionItems.update(
      { InvoiceNumber: newInvoiceNumber },
      { where: { LinkID: varLinkID }, transaction: t }
    );

    // 7. Update Document Type Number
    await docType.update({ CurrentNumber: currentNumber }, { transaction: t });

    // 8. Insert into Approval Audit
    await ApprovalAuditModel.create({
      LinkID: trx.LinkID,
      InvoiceLink: trx.LinkID,
      PositionorEmployee: "Employee",
      PositionorEmployeeID: req.user.employeeID,
      SequenceOrder: approvalProgress,
      ApprovalOrder: 0, // adjust as needed
      ApprovalDate: new Date(),
      CreatedBy: trx.CreatedBy,
      CreatedDate: new Date(),
      ApprovalVersion: trx.ApprovalVersion
    }, { transaction: t });

    // 9. Update OBR Status if linked
    if (trx.ObligationRequestNumber) {
      await TransactionTableModel.update(
        { Status: "Posted, Disbursement Posted" },
        {
          where: {
            InvoiceNumber: trx.ObligationRequestNumber,
            APAR: { [Op.like]: "Obligation Request%" }
          },
          transaction: t
        }
      );
    }

    await t.commit();
    res.json({ message: "Approved successfully" });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

exports.reject = async (req, res) => {
  const { ID } = req.body; // only send ID from frontend
  const id = ID;

  const t = await db.sequelize.transaction();

  try {
    // 1. Fetch Transaction Record with associations
    const trx = await TransactionTableModel.findOne({
      where: { ID: id },
      include: [
        { model: TransactionItems, as: 'TransactionItemsAll', required: false }, // Fixed alias
        { model: GeneralLedgerModel, as: 'GeneralLedger', required: false }
      ],
      transaction: t
    });

    if (!trx) throw new Error('Transaction not found');

    const obligationNumber = trx.InvoiceNumber;
    const approvalLink = trx.LinkID;
    const invoiceLink = trx.LinkID;
    const approvalVersion = trx.ApprovalVersion;
    const createdBy = trx.CreatedBy;

    // 2. UPDATE Transaction Table: set status = Rejected, ApprovalProgress = 0
    await trx.update(
      {
        Status: 'Rejected',
        ApprovalProgress: 0
      },
      { transaction: t }
    );

    // 3. UPDATE other transaction (OBR) with Posted, Disbursement Rejected if linked
    if (trx.ObligationRequestNumber) {
      await TransactionTableModel.update(
        { Status: 'Posted, Disbursement Rejected' },
        {
          where: {
            InvoiceNumber: trx.ObligationRequestNumber,
            APAR: { [Op.like]: 'Obligation Request%' }
          },
          transaction: t
        }
      );
    }

    // 4. INSERT into Approval Audit
    await ApprovalAuditModel.create(
      {
        LinkID: approvalLink,
        InvoiceLink: invoiceLink,
        RejectionDate: new Date(),
        Remarks: req.body.reason || '',
        CreatedBy: createdBy,
        CreatedDate: new Date(),
        ApprovalVersion: approvalVersion
      },
      { transaction: t }
    );

    // 5. Commit transaction
    await t.commit();

    res.json({ message: 'Transaction rejected successfully' });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
