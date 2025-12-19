const { bank } = require('../config/database');
const db = require('../config/database');
const {getAllWithAssociations}=require("../models/associatedDependency");
exports.create = async (req, res) => {
  try {
    const { BranchCode, Branch, Name, Address, AccountNumber, IBAN, SwiftCode, Balance, CurrencyID } = req.body;
    const item = await bank.create({ BranchCode, Branch, Name, Address, AccountNumber, IBAN, SwiftCode, Balance, CurrencyID, Active: true, CreatedBy: req.user.id, CreatedDate: new Date(), ModifyBy: req.user.id, ModifyDate: new Date() });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const items = await getAllWithAssociations(bank, 1, { Active: true});
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await bank.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "bank not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { BranchCode, Branch, Name, Address, AccountNumber, IBAN, SwiftCode, Balance, CurrencyID } = req.body;
    const [updated] = await bank.update({ BranchCode, Branch, Name, Address, AccountNumber, IBAN, SwiftCode, Balance, CurrencyID, ModifyBy: req.user.id, ModifyDate: new Date() }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await bank.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "bank not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    // const deleted = await bank.destroy({ where: { id: req.params.id } });
    // if (deleted) res.json({ message: "bank deleted" });

    // SOFT DELETE

    const [updated] = await bank.update(
      { Active: false, ModifyBy: req.user.id, ModifyDate: new Date() },
      { where: { id: req.params.id, Active: true } }
    );
    if (updated) res.json({ message: "bank deactivated" });
    else res.status(404).json({ message: "bank not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};