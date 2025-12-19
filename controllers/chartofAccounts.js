const { ChartofAccounts } = require('../config/database');
const chartofAccounts = ChartofAccounts;
const db=require("../config/database")
const {getAllWithAssociations}=require("../models/associatedDependency");
exports.create = async (req, res) => {
  try {
    const { AccountCode, Code, Name, Description, AccountTypeID, AccountSubTypeID, AccountCategoryID, NormalBalance } = req.body;
    const item = await chartofAccounts.create({ AccountCode, Code, Name, Description, AccountTypeID, AccountSubTypeID, AccountCategoryID, NormalBalance, Active: true, CreatedBy: req.user.id, CreatedDate: new Date(), ModifyBy: req.user.id, ModifyDate: new Date(), SL: 0 });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const items = await getAllWithAssociations(chartofAccounts, 1, { Active: true })
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await chartofAccounts.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "chartofAccounts not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { AccountCode, Code, Name, Description, AccountTypeID, AccountSubTypeID, AccountCategoryID, NormalBalance } = req.body;
    const [updated] = await chartofAccounts.update({ AccountCode, Code, Name, Description, AccountTypeID, AccountSubTypeID, AccountCategoryID, NormalBalance, ModifyBy: req.user.id, ModifyDate: new Date() }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await chartofAccounts.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "chartofAccounts not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    // const deleted = await chartofAccounts.destroy({ where: { id: req.params.id } });
    // if (deleted) res.json({ message: "chartofAccounts deleted" });

    // SOFT DELETE HEHE

    const [updated] = await chartofAccounts.update(
      { Active: false, ModifyBy: req.user.id, ModifyDate: new Date() },
      { where: { id: req.params.id, Active: true } }
    );

    if (updated) res.json({ message: "chartofAccounts deactivated" });
    else res.status(404).json({ message: "chartofAccounts not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};