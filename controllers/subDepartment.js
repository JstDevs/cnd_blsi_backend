const { subDepartment } = require('../config/database');
const db = require('../config/database');
const {getAllWithAssociations}=require("../models/associatedDependency");
exports.create = async (req, res) => {
  try {
    const { Code, Name, DepartmentID } = req.body;
    const item = await subDepartment.create({ Code, Name, DepartmentID, Active: true, CreatedBy: req.user.id, CreatedDate: new Date(), ModifyBy: req.user.id, ModifyDate: new Date() });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    // Only return active sub-departments (soft delete filter)
    const items = await getAllWithAssociations(db.subDepartment, 1, { Active: true });
    res.json({
      items,
      // includes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    // Only return active sub-department (soft delete filter)
    const item = await subDepartment.findOne({ where: { id: req.params.id, Active: true } });
    if (item) res.json(item);
    else res.status(404).json({ message: "subDepartment not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { Code, Name, DepartmentID } = req.body;
    // Only update active sub-departments (soft delete filter)
    const [updated] = await subDepartment.update({ Code, Name, DepartmentID, ModifyBy: req.user.id, ModifyDate: new Date() }, {
      where: { id: req.params.id, Active: true }
    });
    if (updated) {
      const updatedItem = await subDepartment.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "subDepartment not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SOFT DELETE FUNCTION: Sets Active = false instead of removing from database
// Database table affected: 'subdepartment'
exports.delete = async (req, res) => {
  try {
    // Soft delete - sets Active to false, record remains in database
    const [updated] = await subDepartment.update(
      { Active: false, ModifyBy: req.user?.id ?? 1, ModifyDate: new Date() },
      { where: { id: req.params.id, Active: true } }
    );
    if (updated) res.json({ message: "subDepartment deactivated" });
    else res.status(404).json({ message: "subDepartment not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};