const { ApprovalMatrix, Approvers, documentType, sequelize } = require('../config/database');
const getLatestApprovalMatrixInfo = require('../utils/getLatestApprovalMatrixInfo');
const { literal } = require('sequelize');

// exports.create = async (req, res) => {
//   try {
//     console.log(req.body);
//     // const { LinkID, DocumentTypeID, Version, SequenceLevel, AllorMajority, NumberofApprover, Active, CreatedBy, CreatedDate, AlteredBy, AlteredDate } = req.body;
//     // const item = await ApprovalMatrix.create({ LinkID, DocumentTypeID, Version, SequenceLevel, AllorMajority, NumberofApprover, Active, CreatedBy, CreatedDate, AlteredBy, AlteredDate });
//     // res.status(201).json(item);
//     res.status(201).json();
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      DocumentTypeID,
      SequenceLevel,
      AllorMajority,
      approvers,
    } = req.body;
    let { NumberofApprover } = req.body;

    if (!NumberofApprover) {
      NumberofApprover = 0;
    }

    // get version
    // const { rowCount, latestVersion } = await getLatestApprovalMatrixInfo(documentTypeText);
    approvalVersion = 1;

    const matrix = await ApprovalMatrix.create({
      DocumentTypeID,
      SequenceLevel,
      AllorMajority,
      NumberofApprover,
      Version: approvalVersion,
      Active: true,
      CreatedBy: req.user.id,
      CreatedDate: new Date(),
      AlteredBy: req.user.id,
      AlteredDate: new Date()
    }, { transaction: t });

    // Step 2: Create Approver rows
    const approverRecords = approvers?.map(a => ({
      LinkID: matrix.ID, // foreign key to ApprovalMatrix
      PositionorEmployee: a.PositionorEmployee,
      PositionorEmployeeID: a.PositionorEmployeeID,
      AmountFrom: a.AmountFrom,
      AmountTo: a.AmountTo,
    }));

    await Approvers.bulkCreate(approverRecords, { transaction: t });

    await t.commit();

    const createdItem = await ApprovalMatrix.findOne({
      where: { ID: matrix.ID },
      attributes: {
        include: [
          [literal('`DocumentType`.`Name`'), 'DocumentTypeName'],
        ]
      },
      include: [
        {
          model: Approvers,
          as: 'Approvers',
          require: false,
        },
        {
          model: documentType,
          as: 'DocumentType',
          require: false,
        },
      ],
    });

    res.status(201).json(createdItem);
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const items = await ApprovalMatrix.findAll({
      attributes: {
        include: [
          [literal('`DocumentType`.`Name`'), 'DocumentTypeName'],
        ]
      },
      include: [
        {
          model: Approvers,
          as: 'Approvers',
          require: false,
        },
        {
          model: documentType,
          as: 'DocumentType',
          require: false,
        },
      ],
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await ApprovalMatrix.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "ApprovalMatrix not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const {
      DocumentTypeID,
      SequenceLevel,
      AllorMajority,
      NumberofApprover,
      approvers,
    } = req.body;

    // Update ApprovalMatrix
    await ApprovalMatrix.update(
      {
        DocumentTypeID,
        SequenceLevel,
        AllorMajority,
        NumberofApprover,
        AlteredBy: req.user.id,
        AlteredDate: new Date(),
      },
      { where: { ID: id }, transaction }
    );

    // Delete existing approvers
    await Approvers.destroy({ where: { LinkID: id }, transaction });

    // Insert new approvers
    const approverRows = approvers.map((item) => ({
      LinkID: id,
      PositionorEmployee: item.PositionorEmployee,
      PositionorEmployeeID: item.PositionorEmployeeID,
      AmountFrom: item.AmountFrom,
      AmountTo: item.AmountTo,
    }));

    await Approvers.bulkCreate(approverRows, { transaction });

    // Commit transaction
    await transaction.commit();

    // Return the updated item (fetch outside transaction)
    const updatedItem = await ApprovalMatrix.findOne({
      where: { ID: id },
      include: [
        {
          model: Approvers,
          as: 'Approvers',
        },
      ],
    });

    res.status(200).json(updatedItem);
  } catch (err) {
    await transaction.rollback();
    console.error('Update Error:', err);
    res.status(500).json({ error: err.message });
  }
};



// exports.delete = async (req, res) => {
//   try {
//     const deleted = await ApprovalMatrix.destroy({ where: { id: req.params.id } });
//     if (deleted) res.json({ message: "ApprovalMatrix deleted" });
//     else res.status(404).json({ message: "ApprovalMatrix not found" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;

    // First delete associated approvers
    await Approvers.destroy({ where: { LinkID: id } });

    // Then delete the main approval matrix entry
    const deleted = await ApprovalMatrix.destroy({ where: { ID: id } });

    if (deleted) {
      res.json({ message: "ApprovalMatrix and its approvers deleted" });
    } else {
      res.status(404).json({ message: "ApprovalMatrix not found" });
    }
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.bulkUpdate = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { DocumentTypeID, sequences } = req.body;

    if (!DocumentTypeID) {
      throw new Error("DocumentTypeID is required");
    }

    // Step 1: Find existing matrices to clean up their approvers
    const existingMatrices = await ApprovalMatrix.findAll({
      where: { DocumentTypeID },
      attributes: ['ID'],
      transaction
    });

    const existingIds = existingMatrices.map(m => m.ID);

    if (existingIds.length > 0) {
      // Step 2: Delete associated approvers
      await Approvers.destroy({
        where: { LinkID: existingIds },
        transaction
      });

      // Step 3: Delete the matrices themselves
      await ApprovalMatrix.destroy({
        where: { ID: existingIds },
        transaction
      });
    }

    // Step 4: Create new sequences
    // We iterate to maintain order and get the new IDs
    const createdSequences = [];

    for (const seq of sequences) {
      // Create the matrix header
      // Default to 0 NumberofApprover if not present but usually UI provides it
      // Logic from create: NumberofApprover = 0 if !NumberofApprover

      const matrix = await ApprovalMatrix.create({
        DocumentTypeID,
        SequenceLevel: seq.SequenceLevel,
        AllorMajority: seq.AllorMajority,
        NumberofApprover: seq.NumberofApprover || 0,
        Version: 1, // Reset version or manage it? Assuming 1 for now or we could check max version. 
        // Simplicity: this whole set IS the current version.
        Active: true,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        AlteredBy: req.user.id,
        AlteredDate: new Date()
      }, { transaction });

      // Create associated approvers
      if (seq.approvers && seq.approvers.length > 0) {
        const approverRecords = seq.approvers.map(a => ({
          LinkID: matrix.ID,
          PositionorEmployee: a.PositionorEmployee,
          PositionorEmployeeID: a.PositionorEmployeeID,
          AmountFrom: a.AmountFrom,
          AmountTo: a.AmountTo,
        }));

        await Approvers.bulkCreate(approverRecords, { transaction });
      }

      createdSequences.push(matrix);
    }

    await transaction.commit();

    // Step 5: Return the full fresh list
    // Re-query to get the structure with Approvers populated
    const result = await ApprovalMatrix.findAll({
      where: { DocumentTypeID },
      include: [
        {
          model: Approvers,
          as: 'Approvers',
        },
        {
          model: documentType,
          as: 'DocumentType',
        }
      ],
      order: [['SequenceLevel', 'ASC']] // Ensure we return in order users expect (if SequenceLevel is numeric or sortable string)
      // Note: sequenceLevel might be "1", "2" string. 
    });

    res.status(200).json(result);

  } catch (err) {
    await transaction.rollback();
    console.error("Bulk Update Error:", err);
    res.status(500).json({ error: err.message });
  }
};
