const { Item } = require('../config/database');
const { taxCode } = require('../config/database');
const item = Item;
const TaxCodeModel = taxCode;

exports.create = async (req, res) => {
  try {
    const { Code, Name, Category, ChargeAccountID, TAXCodeID, TaxRate, UnitID, EWT, PurchaseOrSales, Vatable } = req.body;
    const item_r = await item.create({ Code, Name, Category, ChargeAccountID, TAXCodeID, TaxRate, UnitID, EWT, PurchaseOrSales, Vatable, Active: true, CreatedBy: req.user.id, CreatedDate: new Date(), ModifyBy: req.user.id, ModifyDate: new Date() });
    res.status(201).json(item_r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const items = await item.findAll({
      where: { Active: true },
      include: [
        {
          model: TaxCodeModel,
          as: 'TaxCode',
          required: false
        }
      ]
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await item.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "item not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { Code, Name, Category, ChargeAccountID, TAXCodeID, TaxRate, UnitID, EWT, PurchaseOrSales, Vatable } = req.body;
    const [updated] = await item.update({ Code, Name, Category, ChargeAccountID, TAXCodeID, TaxRate, UnitID, EWT, PurchaseOrSales, Vatable, ModifyBy: req.user.id, ModifyDate: new Date() }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await item.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "item not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    // const deleted = await item.destroy({ where: { id: req.params.id } });

    const [updated] = await item.update(
      { Activate: false, ModifyBy: req.user.id, ModifyDate: new Date() },
      { where: { id: req.params.id, Active: true }}
    )
    if (updated) res.json({ message: "item deactivated" });
    else res.status(404).json({ message: "item not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};