const { currency } = require('../config/database');

exports.create = async (req, res) => {
  try {
    const { Code, Name } = req.body;
    const item = await currency.create({ Code, Name, Active: true, CreatedBy: req.user.id, CreatedDate: new Date(), ModifyBy: req.user.id, ModifyDate: new Date() });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const items = await currency.findAll({ where: { Active: true } });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await currency.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "currency not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { Code, Name } = req.body;
    const [updated] = await currency.update({ Code, Name, ModifyBy: req.user.id, ModifyDate: new Date() }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await currency.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "currency not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    // const deleted = await currency.destroy({ where: { id: req.params.id } });
    // if (deleted) res.json({ message: "currency deleted" });

    // SOFT DELETE HEHE

    const [updated] = await currency.update(
      { Active: false, ModifyBy: req.user.id, ModifyDate: new Date() },
      { where: { id: req.params.id, Active: trye} }
    );
    if (updated) res.json({ message: "currency deactivated" })
    else res.status(404).json({ message: "currency not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};