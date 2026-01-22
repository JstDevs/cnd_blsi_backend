const { TravelOrder } = require('../config/database');
const TravelersModel = require('../config/database').Travelers;
const TravelDocumentsModel = require('../config/database').TravelDocuments;
const TravelPaymentsModel = require('../config/database').TravelPayment;
const AttachmentModel = require('../config/database').Attachment;
const TransactionTableModel = require('../config/database').TransactionTable;
const DepartmentModel = require('../config/database').department;
const DocumentTypeModel = require('../config/database').documentType;
const travelOrder = TravelOrder;

const { getAllWithAssociations } = require("../models/associatedDependency");
const db = require('../config/database')
const { Op } = require('sequelize');

const generateLinkID = require("../utils/generateID")
const makeInvoiceNumberTravelOrder = require('../utils/makeInvoiceNumberTravelOrder');
const getLatestApprovalVersion = require('../utils/getLatestApprovalVersion');

function shortenInclusiveDates(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const sameDay = sameMonth && start.getDate() === end.getDate();

  const format = (date, options) =>
    new Intl.DateTimeFormat("en-US", options).format(date);

  if (sameDay) {
    // Example: January 1, 2024
    return format(start, { month: "long", day: "numeric", year: "numeric" });
  }

  if (sameMonth) {
    // Example: January 1 - 3, 2024
    return `${format(start, { month: "long", day: "numeric" })} - ${format(end, { day: "numeric", year: "numeric" })}`;
  }

  if (sameYear) {
    // Example: January 31 - February 2, 2024
    return `${format(start, { month: "long", day: "numeric" })} - ${format(end, { month: "long", day: "numeric", year: "numeric" })}`;
  }

  // Example: December 31, 2023 - January 1, 2024
  return `${format(start, { month: "long", day: "numeric", year: "numeric" })} - ${format(end, { month: "long", day: "numeric", year: "numeric" })}`;
}


exports.create = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const parsedFields = {};
    for (const key in req.body) {
      try {
        parsedFields[key] = JSON.parse(req.body[key]);
      } catch {
        parsedFields[key] = req.body[key];
      }
    }

    const {
      BudgetID,
      DateStart,
      DateEnd,
      Place,
      Venue,
      Remarks,
      Purpose,
      Plane,
      Vessels,
      PUV,
      ServiceVehicle,
      RentedVehicle,
      Travelers,
      TravelPayments,
      TravelDocuments,
    } = parsedFields;

    const LinkID = generateLinkID();

    let TotalAmount = 0;
    if (Array.isArray(TravelPayments)) {
      TotalAmount = TravelPayments.reduce((sum, item) => {
        const amount = parseFloat(item.Amount);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
    }

    const invoiceNo = await makeInvoiceNumberTravelOrder(req.user.departmentCode);
    const docID = 15;
    let statusValue = '';
    const matrixExists = await db.ApprovalMatrix.findOne({
      where: {
        DocumentTypeID: docID,
        Active: 1,
      },
      transaction: t
    });

    statusValue = matrixExists ? 'Requested' : 'Posted';
    const latestApprovalVersion = await getLatestApprovalVersion('Allotment Release Order');

    await TransactionTableModel.create({
      LinkID,
      Status: statusValue,
      APAR: 'Travel Order',
      DocumentTypeID: docID,
      RequestedBy: req.user.employeeID,
      InvoiceDate: new Date(),
      InvoiceNumber: invoiceNo,
      Active: true,
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      ApprovalProgress: 0,
      ApprovalVersion: latestApprovalVersion,
      Total: TotalAmount,
    }, { transaction: t });

    const No_of_Days = Math.floor(
      (new Date(DateEnd) - new Date(DateStart)) / (1000 * 60 * 60 * 24)
    ) + 1;

    const inclusivesDate = shortenInclusiveDates(DateStart, DateEnd);

    const travelOrderItem = await travelOrder.create({
      LinkID,
      InvoiceNumber: invoiceNo,
      CreatedBy: req.user.id,
      BudgetID,
      DateCreated: new Date(),
      DateStart,
      DateEnd,
      No_of_Days,
      InclusivesDate: inclusivesDate,
      Purpose,
      Place,
      Venue,
      Remarks,
      Plane,
      Vessels,
      PUV,
      ServiceVehicle,
      RentedVehicle,
      ApprovalProgress: 0,
      ApprovalVersion: latestApprovalVersion,
    }, { transaction: t });

    if (Array.isArray(Travelers)) {
      const travelerData = Travelers.filter(t => t.TravelerID && t.TravelerID !== '0')
        .map(t => ({ LinkID, TravelerID: t.TravelerID }));
      await TravelersModel.bulkCreate(travelerData, { transaction: t });
    }

    if (Array.isArray(TravelPayments)) {
      const expenseData = TravelPayments.map(e => ({
        LinkID,
        Amount: e.Amount,
        BudgetID: e.BudgetID,
        Type: e.Type,
      }));
      await TravelPaymentsModel.bulkCreate(expenseData, { transaction: t });
    }

    if (Array.isArray(TravelDocuments)) {
      const docData = TravelDocuments.map(d => ({
        LinkID,
        Name: d.Name,
      }));
      await TravelDocumentsModel.bulkCreate(docData, { transaction: t });
    }

    if (req.files && req.files.length > 0) {
      const blobAttachments = req.files.map((file) => ({
        LinkID,
        DataName: file.originalname,
        DataType: file.mimetype,
        DataImage: `${req.uploadPath}/${file.filename}`,
      }));

      await AttachmentModel.bulkCreate(blobAttachments, { transaction: t });
    }

    // Update Document Type
    const docType = await DocumentTypeModel.findOne({ where: { Code: 'TO' }, transaction: t });
    if (docType) {
      docType.CurrentNumber += 1;
      await docType.save({ transaction: t });
    }

    await t.commit(); // commit transaction

    // Fetch complete record (after commit)
    const fullRecord = await travelOrder.findOne({
      where: { ID: travelOrderItem.ID },
      include: [
        { model: TravelersModel, as: 'Travelers', attributes: ['ID', 'TravelerID', 'LinkID'], required: false },
        { model: TravelPaymentsModel, as: 'TravelPayments', attributes: ['ID', 'Amount', 'BudgetID', 'Type', 'LinkID'], required: false },
        { model: TravelDocumentsModel, as: 'TravelDocuments', attributes: ['ID', 'Name', 'LinkID'], required: false },
        { model: AttachmentModel, as: 'Attachments', attributes: ['ID', 'DataName', 'DataType', 'DataImage'], required: false },
        { model: TransactionTableModel, as: 'Transaction', attributes: ['Status'], required: false },
        { model: DepartmentModel, as: 'BudgetDepartment', attributes: ['Name'], required: false },
      ],
    });

    const json = fullRecord.toJSON();

    json.TransactionStatus = json.Transaction?.Status || null;
    delete json.Transaction;

    json.BudgetDepartmentName = json.BudgetDepartment?.Name || null;
    delete json.BudgetDepartment;

    res.status(201).json(json);

  } catch (err) {
    console.error('❌ Error creating travel order:', err);
    await t.rollback(); // rollback transaction
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};



// exports.getAll = async (req, res) => {
//   try {
//     const items = await getAllWithAssociations(travelOrder,1);
//     res.json(items);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.getAll = async (req, res) => {
  try {
    const items = await TravelOrder.findAll({
      include: [
        {
          model: TravelersModel,
          as: 'Travelers',
          required: false,
        },
        {
          model: TravelPaymentsModel,
          as: 'TravelPayments',
          required: false,
        },
        {
          model: TravelDocumentsModel,
          as: 'TravelDocuments',
          required: false,
        },
        {
          model: AttachmentModel,
          as: 'Attachments',
          attributes: ['ID', 'DataName', 'DataType', 'DataImage'],
          required: false,
        },
        {
          model: TransactionTableModel,
          as: 'Transaction',
          attributes: ['Status'],
          required: false,
        },
        {
          model: DepartmentModel,
          as: 'BudgetDepartment',
          attributes: ['Name'],
          required: false,
        },
      ],
      order: [['DateCreated', 'DESC']],
    });

    const formattedItems = items.map((item) => {
      const json = item.toJSON();

      json.TransactionStatus = json.Transaction?.Status || null;
      delete json.Transaction;

      json.BudgetDepartmentName = json.BudgetDepartment?.Name || null;
      delete json.BudgetDepartment;

      return json;
    });

    res.json(formattedItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



exports.getById = async (req, res) => {
  try {
    const item = await travelOrder.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "travelOrder not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// exports.update = async (req, res) => {
//   try {
//     const { Status, LinkID, InvoiceNumber, CreatedBy, TravelerID, BudgetID, DateCreated, DateStart, DateEnd, No_of_Days, InclusivesDate, Purpose, Place, Venue, RequiredDocuments, Cost, Remarks, Plane, Vessels, PUV, ServiceVehicle, RentedVehicle, ApprovalProgress, ApprovalVersion, ObligationLink } = req.body;
//     const [updated] = await travelOrder.update({ Status, LinkID, InvoiceNumber, CreatedBy, TravelerID, BudgetID, DateCreated, DateStart, DateEnd, No_of_Days, InclusivesDate, Purpose, Place, Venue, RequiredDocuments, Cost, Remarks, Plane, Vessels, PUV, ServiceVehicle, RentedVehicle, ApprovalProgress, ApprovalVersion, ObligationLink }, {
//       where: { id: req.params.id }
//     });
//     if (updated) {
//       const updatedItem = await travelOrder.findByPk(req.params.id);
//       res.json(updatedItem);
//     } else {
//       res.status(404).json({ message: "travelOrder not found" });
//     }
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


exports.update = async (req, res) => {
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
      BudgetID,
      DateStart,
      DateEnd,
      Place,
      Venue,
      Remarks,
      Purpose,
      Plane,
      Vessels,
      PUV,
      ServiceVehicle,
      RentedVehicle,
      Travelers,
      TravelPayments,
      TravelDocuments,
      LinkID,
      Attachments = [],
    } = parsedFields;

    // Check if the travel order is in a state that allows updates
    const transactionRecord = await TransactionTableModel.findOne({ where: { LinkID } });
    if (!transactionRecord || transactionRecord.Status !== 'Rejected') {
      return res.status(400).json({ message: 'Only Rejected travel orders can be updated.' });
    }

    const ID = req.params.id;
    const existingOrder = await travelOrder.findByPk(ID);
    if (!existingOrder) {
      return res.status(404).json({ message: 'Travel order not found' });
    }

    const No_of_Days = Math.floor(
      (new Date(DateEnd) - new Date(DateStart)) / (1000 * 60 * 60 * 24)
    ) + 1;

    const inclusivesDate = shortenInclusiveDates(DateStart, DateEnd);

    await existingOrder.update({
      BudgetID,
      DateStart,
      DateEnd,
      No_of_Days,
      InclusivesDate: inclusivesDate,
      Purpose,
      Place,
      Venue,
      Remarks,
      Plane,
      Vessels,
      PUV,
      ServiceVehicle,
      RentedVehicle,
    }, { transaction: t });

    await TravelersModel.destroy({ where: { LinkID }, transaction: t });
    await TravelPaymentsModel.destroy({ where: { LinkID }, transaction: t });
    await TravelDocumentsModel.destroy({ where: { LinkID }, transaction: t });


    if (Array.isArray(Travelers)) {
      const travelerData = Travelers.filter(t => t.TravelerID && t.TravelerID !== '0')
        .map(t => ({ LinkID, TravelerID: t.TravelerID }));
      await TravelersModel.bulkCreate(travelerData, { transaction: t });
    }

    if (Array.isArray(TravelPayments)) {
      const expenseData = TravelPayments.map(e => ({
        LinkID,
        Amount: e.Amount,
        BudgetID: e.BudgetID,
        Type: e.Type,
      }));
      await TravelPaymentsModel.bulkCreate(expenseData, { transaction: t });
    }

    if (Array.isArray(TravelDocuments)) {
      const docData = TravelDocuments.map(d => ({
        LinkID,
        Name: d.Name,
      }));
      await TravelDocumentsModel.bulkCreate(docData, { transaction: t });
    }



    // Attachment handling
    const existingIDs = Attachments.filter(att => att.ID).map(att => att.ID);

    // Delete attachments removed from the list
    await AttachmentModel.destroy({
      where: {
        LinkID,
        ID: { [Op.notIn]: existingIDs }
      },
      transaction: t
    });

    // Add new files
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        LinkID,
        DataName: file.originalname,
        DataType: file.mimetype,
        DataImage: `${req.uploadPath}/${file.filename}`
      }));
      await AttachmentModel.bulkCreate(newAttachments, { transaction: t });
    }

    await t.commit();

    const fullRecord = await travelOrder.findOne({
      where: { ID },
      include: [
        { model: TravelersModel, as: 'Travelers', attributes: ['ID', 'TravelerID', 'LinkID'], required: false },
        { model: TravelPaymentsModel, as: 'TravelPayments', attributes: ['ID', 'Amount', 'BudgetID', 'Type', 'LinkID'], required: false },
        { model: TravelDocumentsModel, as: 'TravelDocuments', attributes: ['ID', 'Name', 'LinkID'], required: false },
        { model: AttachmentModel, as: 'Attachments', attributes: ['ID', 'DataName', 'DataType', 'DataImage'], required: false },
        { model: TransactionTableModel, as: 'Transaction', attributes: ['Status'], required: false },
        { model: DepartmentModel, as: 'BudgetDepartment', attributes: ['Name'], required: false },
      ],
    });

    res.status(200).json(fullRecord);

  } catch (err) {
    await t.rollback();
    console.error('❌ Error updating travel order:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};


// exports.delete = async (req, res) => {
//   try {
//     const deleted = await travelOrder.destroy({ where: { id: req.params.id } });
//     if (deleted) res.json({ message: "travelOrder deleted" });
//     else res.status(404).json({ message: "travelOrder not found" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.delete = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    // Fetch the travel order to get the LinkID
    const travelOrderItem = await travelOrder.findByPk(req.params.id, { transaction: t });
    if (!travelOrderItem) {
      await t.rollback();
      return res.status(404).json({ message: "TravelOrder not found" });
    }

    const linkID = travelOrderItem.LinkID;

    // Find the transaction record
    const transactionRecord = await TransactionTableModel.findOne({ where: { LinkID: linkID }, transaction: t });
    if (!transactionRecord) {
      await t.rollback();
      return res.status(404).json({ message: 'Transaction record not found' });
    }

    if (transactionRecord.Status !== 'Rejected') {
      await t.rollback();
      return res.status(400).json({ message: 'Only Rejected travel orders can be voided.' });
    }

    // Update status to Void instead of deleting
    await transactionRecord.update({
      Status: 'Void',
      ModifyBy: req.user.id,
      ModifyDate: new Date()
    }, { transaction: t });

    // Log the void action in ApprovalAudit
    const ApprovalAuditModel = require('../config/database').ApprovalAudit;
    await ApprovalAuditModel.create({
      LinkID: generateLinkID(),
      InvoiceLink: linkID,
      CreatedDate: new Date(),
      Remarks: 'Travel Order Voided',
      CreatedBy: req.user.id,
      ApprovalVersion: transactionRecord.ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: "Travel Order voided successfully" });

  } catch (err) {
    await t.rollback();
    console.error('❌ Error voiding travel order:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.approveTransaction = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const { ID } = req.body;

    if (!ID) {
      await t.rollback();
      return res.status(400).json({ error: 'Travel Order ID is required' });
    }

    // Find the travel order by ID
    const travelOrderItem = await travelOrder.findByPk(ID, { transaction: t });
    if (!travelOrderItem) {
      await t.rollback();
      return res.status(404).json({ error: 'Travel Order not found' });
    }

    const linkID = travelOrderItem.LinkID;

    // Find the transaction record
    const transactionRecord = await TransactionTableModel.findOne({
      where: { LinkID: linkID },
      transaction: t
    });

    if (!transactionRecord) {
      await t.rollback();
      return res.status(404).json({ error: 'Transaction record not found' });
    }

    if (transactionRecord.Status === 'Void') {
      await t.rollback();
      return res.status(400).json({ error: 'Cannot approve a voided travel order' });
    }

    if (transactionRecord.Status === 'Approved' || transactionRecord.Status === 'Posted') {
      await t.rollback();
      return res.status(400).json({ error: 'Travel order is already approved' });
    }

    // Update status to Approved
    await transactionRecord.update({
      Status: 'Approved',
      ModifyBy: req.user.id,
      ModifyDate: new Date()
    }, { transaction: t });

    // Log the approval in ApprovalAudit
    const ApprovalAuditModel = require('../config/database').ApprovalAudit;
    await ApprovalAuditModel.create({
      LinkID: generateLinkID(),
      InvoiceLink: linkID,
      PositionEmployee: 'Employee',
      PositionEmployeeID: req.user.employeeID,
      ApprovalDate: new Date(),
      Remarks: 'Travel Order Approved',
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      ApprovalVersion: transactionRecord.ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Travel Order approved successfully' });

  } catch (err) {
    await t.rollback();
    console.error('❌ Error approving travel order:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.rejectTransaction = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const { ID, Reason } = req.body;

    if (!ID) {
      await t.rollback();
      return res.status(400).json({ error: 'Travel Order ID is required' });
    }

    // Find the travel order by ID
    const travelOrderItem = await travelOrder.findByPk(ID, { transaction: t });
    if (!travelOrderItem) {
      await t.rollback();
      return res.status(404).json({ error: 'Travel Order not found' });
    }

    const linkID = travelOrderItem.LinkID;

    // Find the transaction record
    const transactionRecord = await TransactionTableModel.findOne({
      where: { LinkID: linkID },
      transaction: t
    });

    if (!transactionRecord) {
      await t.rollback();
      return res.status(404).json({ error: 'Transaction record not found' });
    }

    if (transactionRecord.Status === 'Void') {
      await t.rollback();
      return res.status(400).json({ error: 'Cannot reject a voided travel order' });
    }

    if (transactionRecord.Status === 'Rejected') {
      await t.rollback();
      return res.status(400).json({ error: 'Travel order is already rejected' });
    }

    // Update status to Rejected
    await transactionRecord.update({
      Status: 'Rejected',
      ModifyBy: req.user.id,
      ModifyDate: new Date()
    }, { transaction: t });

    // Log the rejection in ApprovalAudit
    const ApprovalAuditModel = require('../config/database').ApprovalAudit;
    await ApprovalAuditModel.create({
      LinkID: generateLinkID(),
      InvoiceLink: linkID,
      RejectionDate: new Date(),
      Remarks: Reason || 'Travel Order Rejected',
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      ApprovalVersion: transactionRecord.ApprovalVersion
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Travel Order rejected successfully' });

  } catch (err) {
    await t.rollback();
    console.error('❌ Error rejecting travel order:', err);
    res.status(500).json({ error: err.message });
  }
};

