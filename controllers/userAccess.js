const { userAccess } = require('../config/database');
exports.create = async (req, res) => {
  try {
    const { Description } = req.body;
    const createdBy=req?.user?.id?req?.user?.id:1
    const item = await userAccess.create({ Description, Active: true, CreatedBy:createdBy , CreatedDate: new Date() });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    // Use simple findAll to avoid circular reference issues with getAllWithAssociations
    // Return basic userAccess items - associations can be added if needed
    const items = await userAccess.findAll({ 
      where: { Active: true },
      order: [['ID', 'ASC']]
    });
    res.json(items);
  } catch (err) {
    console.error('Error in userAccess.getAll:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await userAccess.findOne({ where: { id: req.params.id, Active: true } });
    if (item) res.json(item);
    else res.status(404).json({ message: "userAccess not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { Description, Active, CreatedBy, CreatedDate } = req.body;
    const [updated] = await userAccess.update({ Description, Active, CreatedBy, CreatedDate }, {
      where: { id: req.params.id, Active: true }
    });
    if (updated) {
      const updatedItem = await userAccess.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "userAccess not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const [updated] = await userAccess.update(
      { Active: false, ModifyBy: req?.user?.id ?? 1, ModifyDate: new Date() },
      { where: { id: req.params.id, Active: true } }
    );
    if (updated) res.json({ message: "userAccess deactivated" });
    else res.status(404).json({ message: "userAccess not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};