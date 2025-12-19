const { ppe } = require('../config/database');
const ppeSupplierModel = require('../config/database').ppeSupplier;
const ppeCategoryModel = require('../config/database').ppeCategory;

exports.create = async (req, res) => {
  try {
    const { LinkID, CategoryID, SupplierID, PPENumber, Unit, Description, Cost, Barcode, Quantity, DateAcquired, EstimatedUsefulLife, DepreciationRate, DepreciationValue, NetBookValue, PONumber, PRNumber, InvoiceNumber, AIRNumber, RISNumber, Remarks } = req.body;
    const item = await ppe.create({ LinkID, CategoryID, SupplierID, PPENumber, Unit, Description, Cost, Barcode, Quantity, DateAcquired, EstimatedUsefulLife, DepreciationRate, DepreciationValue, NetBookValue, PONumber, PRNumber, InvoiceNumber, AIRNumber, RISNumber, Remarks, Active: true, ModifiedBy: req.user.id, ModifiedDate: new Date(), CreatedBy: req.user.id, CreatedDate: new Date() });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// exports.getAll = async (req, res) => {
//   try {
//     const items = await ppe.findAll();
//     res.json(items);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.getAll = async (req, res) => {
  try {
    const items = await ppe.findAll({
      where: {
        Active: true
      },
      include: [
        {
          model: ppeCategoryModel,
          as: 'Category',
          require: false,
        },
        {
          model: ppeSupplierModel,
          as: 'Supplier',
          require: false,
        }
      ],
      order: [['Unit', 'ASC']],
    });

    res.json(items);
  } catch (error) {
    console.error('Error loading PPE grid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


exports.getById = async (req, res) => {
  try {
    const item = await ppe.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "ppe not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { LinkID, CategoryID, SupplierID, PPENumber, Unit, Description, Cost, Barcode, Quantity, DateAcquired, EstimatedUsefulLife, DepreciationRate, DepreciationValue, NetBookValue, PONumber, PRNumber, InvoiceNumber, AIRNumber, RISNumber, Remarks } = req.body;
    const [updated] = await ppe.update({ LinkID, CategoryID, SupplierID, PPENumber, Unit, Description, Cost, Barcode, Quantity, DateAcquired, EstimatedUsefulLife, DepreciationRate, DepreciationValue, NetBookValue, PONumber, PRNumber, InvoiceNumber, AIRNumber, RISNumber, Remarks, ModifiedBy: req.user.id, ModifiedDate: new Date() }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await ppe.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "ppe not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const [updated] = await ppe.update(
      { Active: false, ModifiedBy: req.user.id, ModifiedDate: new Date() },
      { where: { id: req.params.id, Active: true } }
    );
    if (updated) res.json({ message: "ppe deactivated" });
    else res.status(404).json({ message: "ppe not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};