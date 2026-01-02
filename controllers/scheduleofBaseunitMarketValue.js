const { ScheduleofBaseunitMarketValue } = require('../config/database');
const { Op } = require('sequelize');
const scheduleofBaseunitMarketValue = ScheduleofBaseunitMarketValue;

exports.create = async (req, res) => {
  try {
    const { GeneralRevisionYear, Classification, Location, Unit, ActualUse, SubClassification, Price, Createdby, CreatedDate, Modifiedby, ModifiedDate, Active, UsingStatus } = req.body;
    const item = await scheduleofBaseunitMarketValue.create({ GeneralRevisionYear, Classification, Location, Unit, ActualUse, SubClassification, Price, Createdby, CreatedDate, Modifiedby, ModifiedDate, Active, UsingStatus });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const items = await scheduleofBaseunitMarketValue.findAll({
      where: {
        [Op.or]: [{ Active: true }, { Active: null }]
      }
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await scheduleofBaseunitMarketValue.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "scheduleofBaseunitMarketValue not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { GeneralRevisionYear, Classification, Location, Unit, ActualUse, SubClassification, Price, Createdby, CreatedDate, Modifiedby, ModifiedDate, Active, UsingStatus } = req.body;
    const [updated] = await scheduleofBaseunitMarketValue.update({ GeneralRevisionYear, Classification, Location, Unit, ActualUse, SubClassification, Price, Createdby, CreatedDate, Modifiedby, ModifiedDate, Active, UsingStatus }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await scheduleofBaseunitMarketValue.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "scheduleofBaseunitMarketValue not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const [updated] = await scheduleofBaseunitMarketValue.update(
      { Active: false, Modifiedby: req.user.id, ModifiedDate: new Date() },
      { where: { id: req.params.id, Active: true } }
    );
    if (updated) res.json({ message: "scheduleofBaseunitMarketValue deactivated" });
    else res.status(404).json({ message: "scheduleofBaseunitMarketValue not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};