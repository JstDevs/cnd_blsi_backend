const { Watermarks } = require('../config/database');
const watermarks = Watermarks;
const path = require('path');
const watermarks = require('../models/watermarks');


exports.create = async (req, res) => {
  try {
    const { DocumentID, Confidential } = req.body;
    const item = await watermarks.create({ DocumentID, Confidential });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    console.log('GET /watermarks - Attempting to fetch latest record');
    if (!watermarks) {
      console.error('Watermarks model is UNDEFINED in controller!');
      throw new Error('Watermarks model is not initialized');
    }
    const latest = await watermarks.findOne({
      order: [['ID', 'DESC']],
    });

    if (!latest) {
      console.log('GET /watermarks - No records found, returning empty object');
      return res.json({});
    }

    // Convert Sequelize instance to plain object
    const data = latest.toJSON();
    console.log('GET /watermarks - Success');
    res.json(data);
  } catch (err) {
    console.error('GET /watermarks - Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};


exports.getById = async (req, res) => {
  try {
    const item = await watermarks.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "watermarks not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { DocumentID, Confidential } = req.body;
    const [updated] = await watermarks.update({ DocumentID, Confidential }, {
      where: { ID: req.params.id }
    });
    if (updated) {
      const updatedItem = await watermarks.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "watermarks not found" });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const deleted = await watermarks.destroy({ where: { id: req.params.id } });
    if (deleted) res.json({ message: "watermarks deleted" });
    else res.status(404).json({ message: "watermarks not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};