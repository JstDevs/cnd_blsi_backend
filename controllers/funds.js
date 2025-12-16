const { Funds } = require('../config/database');
const {getAllWithAssociations}=require("../models/associatedDependency");
const db=require('../config/database')
const { Op } = require("sequelize");
const { sequelize, TransactionTable, Attachment, ApprovalAudit, documentType,ApprovalMatrix } =  require('../config/database');
const generateLinkID = require("../utils/generateID")

exports.saveRecord = async (req, res) => {
  const { Code, Name, Description, Amount, ID } = req.body;
  let { IsNew } = req.body;

  try {
    if((IsNew == "true") || (IsNew === true) || (IsNew == '1') || (IsNew == 1)) {
      IsNew = true;
    }
    else if((IsNew == "false") || (IsNew === false) || (IsNew == '0') || (IsNew == 0)) {
      IsNew = false;
    }
    else {
      throw new Error('Invalid value for IsNew. Expected true or false.');
    }

    const amount = parseFloat(Amount);
    const duplicateWhere = {
      [Op.and]: [
        {
          [Op.or]: [
            { Code: Code },
            { Name: Name }
          ]
        },
        { Description: Description },
        { OriginalAmount: amount },
        { Active: true }
      ]
    };

    // If updating, exclude the current ID
    if (!IsNew) {
      duplicateWhere[Op.and].push({ ID: { [Op.ne]: ID } });
    }

    const existing = await Funds.findOne({ where: duplicateWhere });

    if (existing) {
      throw new Error('Code or Name already exists!');
    }

    if (IsNew) {
      // INSERT logic
      const LinkID = generateLinkID();
      await Funds.create({
        LinkID,
        Code: Code,
        Name: Name,
        Description: Description,
        OriginalAmount: amount,
        Balance: amount,
        Total: amount,
        Active: true
      });
    } else {
      // UPDATE logic
      await Funds.update({
        Code: Code,
        Name: Name,
        Description: Description,
        OriginalAmount: amount,
        Balance: amount,
        Total: amount
      }, {
        where: { ID: ID }
      });
    }

    res.json({ message: 'success.' });

  } catch (error) {
    console.error('Error saving record:', error);
    res.status(500).json({ error: error.message || 'Failed to save record' });
  }
};


exports.create = async (req, res) => {
  try {
    const { LinkID, Code, Name, Description, OriginalAmount, Balance, Total, Active } = req.body;
    const item = await Funds.create({ LinkID, Code, Name, Description, OriginalAmount, Balance, Total, Active });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const records = await Funds.findAll({
      attributes: ['ID', 'Code', 'Name', 'Description', 'OriginalAmount'],
      where: { Active: true },
      order: [['Name', 'ASC']]
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await Funds.findOne({ where: { ID: req.params.id, Active: true } });
    if (item) res.json(item);
    else res.status(404).json({ message: "Funds not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { LinkID, Code, Name, Description, OriginalAmount, Balance, Total, Active } = req.body;
    const [updated] = await Funds.update({ LinkID, Code, Name, Description, OriginalAmount, Balance, Total, Active }, {
      where: { ID: req.params.id, Active: true }
    });
    if (updated) {
      const updatedItem = await Funds.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "Funds not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SOFT DELETE: Sets Active = false instead of removing from database
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;

    // Soft delete - sets Active to false, record remains in database
    const [updated] = await Funds.update(
      { Active: false },
      { where: { ID: id, Active: true } }
    );

    if (updated) {
      res.json({ message: 'success.' });
    } else {
      res.status(404).json({ message: "Funds not found" });
    }
  } catch (err) {
    console.error('Error deleting fund:', err);
    res.status(500).json({ error: err.message });
  }
};


// routes/funds.js



// Load all active funds
// exports.getAll=async (req, res) => {
//   try {
//     const funds = await db.Funds.findAll({
//       where: { Active: true },
//       attributes: ['ID', 'Code', 'Name', 'Description', 'OriginalAmount'],
//       order: [['Name', 'ASC']]
//     });
//     res.json({ success: true, data: funds });
//   } catch (err) {
//     console.error('Error loading funds:', err);
//     res.status(500).json({ success: false, message: 'Error fetching funds', error: err.message });
//   }
// };

// Create or update a fund
// exports.create= async (req, res) => {
//   const { ID, Code, Name, Description, OriginalAmount } = req.body;

//   if (!Code || !Name || !OriginalAmount) {
//     return res.status(400).json({ success: false, message: 'Code, Name, and Amount are required.' });
//   }

//   try {
//     if (!ID) {
//       // Check if already exists
//       const existing = await Fund.findOne({
//         where: {
//           [Op.or]: [{ Code }, { Name }],
//           Description,
//           OriginalAmount,
//           Active: true
//         }
//       });

//       if (existing) {
//         return res.status(409).json({ success: false, message: 'Code or Name already exists.' });
//       }

//       await Fund.create({
//         LinkID: Date.now().toString(),
//         Code,
//         Name,
//         Description,
//         OriginalAmount,
//         Balance: OriginalAmount,
//         Total: OriginalAmount,
//         Active: true
//       });

//     } else {
//       const existing = await Fund.findOne({
//         where: {
//           [Op.or]: [{ Code }, { Name }],
//           Description,
//           OriginalAmount,
//           ID: { [Op.ne]: ID },
//           Active: true
//         }
//       });

//       if (existing) {
//         return res.status(409).json({ success: false, message: 'Code or Name already exists.' });
//       }

//       await Fund.update({
//         Code,
//         Name,
//         Description,
//         OriginalAmount,
//         Balance: OriginalAmount,
//         Total: OriginalAmount
//       }, { where: { ID } });
//     }

//     res.json({ success: true, message: 'Data saved successfully.' });
//   } catch (err) {
//     console.error('Error saving fund:', err);
//     res.status(500).json({ success: false, message: 'Save failed', error: err.message });
//   }
// }

// // Soft delete a fund
// exports.update=async (req, res) => {
//   try {
//     await Fund.update({ Active: false }, { where: { ID: req.params.id } });
//     res.json({ success: true, message: 'Deleted successfully.' });
//   } catch (err) {
//     console.error('Error deleting fund:', err);
//     res.status(500).json({ success: false, message: 'Delete failed', error: err.message });
//   }
// }

// Search funds
exports.search= async (req, res) => {
  const { query } = req.query;
  try {
    const results = await db.Funds.findAll({
      where: {
        Active: true,
        [Op.or]: [
          { Name: { [Op.like]: `%${query}%` } },
          { Code: { [Op.like]: `%${query}%` } },
          sequelize.where(
            sequelize.cast(sequelize.col('OriginalAmount'), 'TEXT'),
            { [Op.like]: `%${query}%` }
          )
        ]
      }
    });
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, message: 'Search failed', error: err.message });
  }
}


// routes/funds.js



// Existing routes for fund management...

// Fund Transfer Save Endpoint
exports.savefundtransfer = async (req, res) => {
  const { balance, amount, remarks, sourceFundId, targetFundId, attachments = [], userId } = req.body;

  try {
    if (!sourceFundId || !targetFundId || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Missing or invalid input fields.' });
    }

    const maxValue = parseFloat(balance);
    const transferAmount = parseFloat(amount);

    if (transferAmount > maxValue) {
      return res.status(400).json({ success: false, message: `Transfer amount cannot exceed balance of ${maxValue}` });
    }
    docID=2
    // Get document type for Fund Transfer (ID = 26)
    const docType = await db.documentType.findOne({ where: {  } });
    if (!docType) return res.status(404).json({ success: false, message: 'Document type not found.' });
    const approvalVersion = await getLatestApprovalVersion("fund transfer")
    const invoiceText = `${docType.Prefix}-${docType.CurrentNumber}-${docType.Suffix}`;
    const linkID = Date.now().toString();

    const t = await sequelize.transaction();
    try {
      await TransactionTable.create({
        LinkID: linkID,
        Status: 'Requested',
        APAR: 'Fund Transfer',
        DocumentTypeID: 26,
        RequestedBy: userId || 1,
        InvoiceDate: new Date(),
        InvoiceNumber: invoiceText,
        Total: transferAmount,
        Active: true,
        Remarks: remarks,
        CreatedBy: 'system',
        CreatedDate: new Date(),
        ApprovalProgress: 0,
        FundsID: sourceFundId,
        TargetID: targetFundId,
        ApprovalVersion:approvalVersion,
      }, { transaction: t });

      await db.documentType.update(
        { CurrentNumber: docType.CurrentNumber + 1 },
        { where: { ID: 26 }, transaction: t }
      );

      for (const file of attachments) {
        await Attachment.create({
          LinkID: linkID,
          DataImage: file.data, // base64 or buffer
          DataName: file.name,
          DataType: file.type
        }, { transaction: t });
      }

      await t.commit();

      res.json({ success: true, message: 'Fund transfer saved successfully.' });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (err) {
    console.error('Fund transfer error:', err);
    res.status(500).json({ success: false, message: 'Transfer failed', error: err.message });
  }
};

// async function getLatestApprovalVersion() {
//   const result = await sequelize.query(
//     `SELECT MAX(a.[Version]) AS [LatestVersion] FROM [ApprovalMatrix] a
//      INNER JOIN [DocumentType] b ON a.[DocumentType ID] = b.ID
//      WHERE a.Active = 1 AND LOWER(b.[Name]) LIKE '%fund transfer%'`,
//     { type: sequelize.QueryTypes.SELECT }
//   );
//   return result?.[0]?.LatestVersion || 1;
// }



exports.transferlist= async (req, res) => {
  try {
    let totaltransfers=0;
    let pendingapproval=0
    let completed=0
    let totalamount=0
    const transfers = await TransactionTable.findAll({
      where: {
        Active: true,
        [Op.and]: sequelize.where(
    sequelize.fn('LOWER', sequelize.col('APAR')),
    {
      [Op.like]: '%fund transfer%'
    }
  )
       
      },
      include: [
        { model: Funds, as: 'targetFunds' },
        { model: Funds, as: 'sourceFunds' }
      ],
      order: [['CreatedDate', 'DESC']]
    });

      const formatted = transfers.map(tr => {
      const total=parseFloat(tr.Total);
      const sourceBalance = tr.FundSource?.Balance ?? 0;
      const targetBalance = tr.FundTarget?.Balance ?? 0;

      const sourceImpact = sourceBalance - total;
      const targetImpact = targetBalance + total;

      return {
        ID: tr.ID,
        LinkID: tr.LinkID,
        InvoiceNumber: tr.InvoiceNumber,
        FundSource: tr.FundSource?.Name || '',
        FundTarget: tr.FundTarget?.Name || '',
        Status: tr.Status,
        InvoiceDate: tr.InvoiceDate,
        Total: tr.Total,
        Remarks: tr.Remarks,
        ApprovalProgress: tr.ApprovalProgress,
        ApprovalVersion: tr.ApprovalVersion,
        FundSourceOriginalBalance: sourceBalance,
        FundSourcePostTransfer: sourceImpact,
        FundTargetOriginalBalance: targetBalance,
        FundTargetPostTransfer: targetImpact
      };
    });

    for (const transfer of formatted) {
      totaltransfers++;
      if (transfer.Status === 'Requested') {
        pendingapproval++;
      } else if (transfer.Status === 'Approved') {
        completed++;
      }
      totalamount += parseInt(transfer.Total);
    }
    res.json({ success: true, data: transfers,formatted, totaltransfers, pendingapproval, completed, totalamount });
  } catch (err) {
    console.error('Fetch transfer list error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch transfer list', error: err.message });
  }
}

async function getLatestApprovalVersion(name) {
  const latest = await ApprovalMatrix.findOne({
    include: [{
      model: db.documentType,
      as:"DocumentType",
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('DocumentType.Name')),
        'like',
        `%${name}%`
      )
    }],
    where: { Active: true },
    order: [['Version', 'DESC']],
    raw:true
  });

  if (!latest || !latest.Version) {
    throw new Error('Version of Approval Workflow doesn’t exist. Create an approval for the document type first!');
  }
  console.log("latest.Version", latest.Version,latest);
  return latest.Version;
}


