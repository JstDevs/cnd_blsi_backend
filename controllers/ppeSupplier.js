const { ppeSupplier } = require('../config/database');

exports.create = async (req, res) => {
  try {
    const { Name } = req.body;
    const item = await ppeSupplier.create({ Name, Active: true, CreatedBy: req.user.id, CreatedDate: new Date(), ModifiedBy: req.user.id, ModifiedDate: new Date() });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const items = await ppeSupplier.findAll({ where: { Active: true } });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await ppeSupplier.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "ppeSupplier not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { Name } = req.body;
    const [updated] = await ppeSupplier.update({ Name, ModifiedBy: req.user.id, ModifiedDate: new Date() }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await ppeSupplier.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "ppeSupplier not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const [updated] = await ppeSupplier.update(
      { Active: false, ModifiedBy: req.user.id, ModifiedDate: new Date() },
      { where: { id: req.params.id, Active: true } }
    );
    if (updated) res.json({ message: "ppeSupplier deactivated" });
    else res.status(404).json({ message: "ppeSupplier not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};