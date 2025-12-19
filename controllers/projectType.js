const { ProjectType } = require('../config/database');
const projectType = ProjectType;

exports.create = async (req, res) => {
  try {
    const { Type, Description } = req.body;
    const item = await projectType.create({ Type, Description, Active: true});
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const items = await projectType.findAll({ where: { Active: true } });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await projectType.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "projectType not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { Type, Description } = req.body;
    const [updated] = await projectType.update({ Type, Description }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await projectType.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "projectType not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const [updated] = await projectType.update( 
      { Active: false, ModifyBy: req.user.id, ModifyDate: new Date() },
      { where: { id: req.params.id, Active: true } }
    );
    if (updated) res.json({ message: "projectType deactivated" });
    else res.status(404).json({ message: "projectType not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};