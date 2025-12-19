const { taxCode } = require('../config/database');

exports.create = async (req, res) => {
  try {
    const { Code, Name, Rate, Type } = req.body;
    const item = await taxCode.create({ Code, Name, Rate, Type, Active: true, CreatedBy: req.user.id, CreatedDate: new Date(), ModifyBy: req.user.id, ModifyDate: new Date() });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const items = await taxCode.findAll({ where: {Active: true} });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await taxCode.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "taxCode not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { Code, Name, Rate, Type } = req.body;
    const [updated] = await taxCode.update({ Code, Name, Rate, Type, ModifyBy: req.user.id, ModifyDate: new Date() }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await taxCode.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "taxCode not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    // const deleted = await taxCode.destroy({ where: { id: req.params.id } });

    const [updated] = await taxCode.update(
      { Active: false, ModifyBy: req.user.id, ModifyDate: new Date() },
      { where: { id: req.params.id, Active: true } }
    );
    if (updated) res.json({ message: "taxCode Deactivated" });
    else res.status(404).json({ message: "taxCode not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};