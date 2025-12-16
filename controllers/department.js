const { department } = require('../config/database');

exports.create = async (req, res) => {
  try {
    const { Code, Name } = req.body;
    const item = await department.create({ Code, Name, Active: true, CreatedBy: req.user.id, CreatedDate: new Date(), ModifyBy: req.user.id, ModifyDate: new Date() });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    // Only return active departments (soft delete filter)
    const items = await department.findAll({ where: { Active: true } });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    // Only return active department (soft delete filter)
    const item = await department.findOne({ where: { id: req.params.id, Active: true } });
    if (item) res.json(item);
    else res.status(404).json({ message: "department not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { Code, Name } = req.body;
    // Only update active departments (soft delete filter)
    const [updated] = await department.update(
      {
        Code,
        Name,
        ModifyBy: req.user.id,
        ModifyDate: new Date()
      },
      {
        where: { id: req.params.id, Active: true }
      }
    );
    if (updated) {
      const updatedItem = await department.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "department not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SOFT DELETE FUNCTION: Sets Active = false instead of removing from database
// Database table affected: 'department'
exports.delete = async (req, res) => {
  try {
    // Soft delete - sets Active to false, record remains in database
    const [updated] = await department.update(
      { Active: false, ModifyBy: req.user?.id ?? 1, ModifyDate: new Date() },
      { where: { id: req.params.id, Active: true } }
    );
    if (updated) res.json({ message: "department deactivated" });
    else res.status(404).json({ message: "department not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};