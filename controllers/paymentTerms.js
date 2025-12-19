const { paymentTerms, vendor } = require('../config/database');

exports.create = async (req, res) => {
  try {
    const { Code, Name, NumberOfDays } = req.body;
    const item = await paymentTerms.create({ Code, Name, NumberOfDays, Active: true, CreatedBy: req.user.id, CreatedDate: new Date(), ModifyBy: req.user.id, ModifyDate: new Date() });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const items = await paymentTerms.findAll({ where: { Active: true} });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await paymentTerms.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "paymentTerms not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { Code, Name, NumberOfDays } = req.body;
    const [updated] = await paymentTerms.update({ Code, Name, NumberOfDays, ModifyBy: req.user.id, ModifyDate: new Date() }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await paymentTerms.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "paymentTerms not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Check if payment term is used in vendor details
    const isUsed = await vendor.findOne({
      where: { PaymentTermsID: id }
    });

    if (isUsed) {
      return res.status(400).json({
        message: "Cannot delete. Payment term is already used in vendor details."
      });
    }
    // SOFT DEL
    const [updated] = await paymentTerms.update(
      { Active: false, ModifyBy: req.user.id, ModifyDate: new Date() },
      { where: { ID: id, Active: true } }
    );

    // // 2️⃣ Delete if not used
    // await paymentTerms.destroy({ where: { ID: id } });

    if (updated) res.json({ message: "paymentTerms deactivated" });
    else res.status(404).json({ message: "paymentTerms not found" });
    res.json({ message: "success" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};