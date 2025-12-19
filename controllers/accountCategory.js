const { AccountCategory } = require('../config/database');
const accountCategory = require('../models/accountCategory');
  
exports.create = async (req, res) => {
  try {
    const { Code, Name, AccountSubTypeID } = req.body;
    const item = await AccountCategory.create({ Code, Name, Active: true, CreatedBy: req.user.id, CreatedDate: new Date(), ModifyBy: req.user.id, ModifyDate: new Date(), AccountSubTypeID });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const items = await AccountCategory.findAll({ where: { Active: true }});
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await AccountCategory.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "AccountCategory not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { Code, Name, AccountSubTypeID } = req.body;
    const [updated] = await AccountCategory.update({ Code, Name, AccountSubTypeID, ModifyBy: req.user.id, ModifyDate: new Date() }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await AccountCategory.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "AccountCategory not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    // const deleted = await AccountCategory.destroy({ where: { id: req.params.id } });
    // if (deleted) res.json({ message: "AccountCategory deleted" });

     // SOFT DELETE HEHE
    const [updated] = await AccountCategory.update(
      { Active: false, ModifyBy: req.user.id, ModifyDate: new Date() },
      { where: { id: req.params.id, Active: true } }
    );
    if (updated) res.json({ message: "AccountCategory deactivated" });
    else res.status(404).json({ message: "AccountCategory not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};