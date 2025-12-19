const { FiscalYear } = require('../config/database');
const fiscalYear = FiscalYear;

exports.create = async (req, res) => {
  try {
    const { Code, Name, Year, MonthStart, MonthEnd } = req.body;
    const item = await fiscalYear.create({ Code, Name, Year, MonthStart, MonthEnd, Active: true, CreatedBy: req.user.id, CreatedDate: new Date(), ModifyBy: req.user.id, ModifyDate: new Date() });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const items = await fiscalYear.findAll({ where: { Active: true } });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await fiscalYear.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "fiscalYear not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { Code, Name, Year, MonthStart, MonthEnd } = req.body;
    const [updated] = await fiscalYear.update({ Code, Name, Year, MonthStart, MonthEnd, ModifyBy: req.user.id, ModifyDate: new Date() }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await fiscalYear.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "fiscalYear not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    // const deleted = await fiscalYear.destroy({ where: { id: req.params.id } });

    const [updated] = await fiscalYear.update(
      { Active: false, ModifyBy: req.user.id, ModifyDate: new Date() },
      { wher: { id: req.params.id, Active: true } }
    )
    if (updated) res.json({ message: "fiscalYear deactivated" });
    else res.status(404).json({ message: "fiscalYear not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};