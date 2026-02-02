const { Watermarks, sequelize } = require('../config/database');
const watermarks = Watermarks;
const path = require('path');


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
    const items = await watermarks.findAll({
      include: [
        {
          model: sequelize.models.DocumentType,
          as: 'DocumentType',
          attributes: ['Name']
        }
      ],
      order: [['ID', 'ASC']],
    });

    console.log(`GET /watermarks - Success, found ${items.length} records`);
    res.json(items);
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