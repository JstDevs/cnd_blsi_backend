const { DataSource } = require('../config/database');
const datasource = DataSource;
const path = require('path');


exports.create = async (req, res) => {
  try {
    const { InformationOne, InformationTwo, InformationThree, InformationFour, InformationFive, InformationSix, InformationSeven, InformationEight, InformationNine, InformationTen } = req.body;
    const item = await datasource.create({ InformationOne, InformationTwo, InformationThree, InformationFour, InformationFive, InformationSix, InformationSeven, InformationEight, InformationNine, InformationTen });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const latest = await datasource.findOne({
      order: [['ID', 'DESC']],
    });

    if (!latest) return res.status(404).json({ message: 'No Data Source found' });

    // Convert Sequelize instance to plain object
    const data = latest.toJSON();

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getById = async (req, res) => {
  try {
    const item = await datasource.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "data source not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { InformationOne, InformationTwo, InformationThree, InformationFour, InformationFive, InformationSix, InformationSeven, InformationEight, InformationNine, InformationTen } = req.body;
    const [updated] = await datasource.update({ InformationOne, InformationTwo, InformationThree, InformationFour, InformationFive, InformationSix, InformationSeven, InformationEight, InformationNine, InformationTen }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await datasource.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "data source not found" });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const deleted = await datasource.destroy({ where: { id: req.params.id } });
    if (deleted) res.json({ message: "data source deleted" });
    else res.status(404).json({ message: "data source not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};