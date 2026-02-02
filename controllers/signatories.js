const { Signatories, sequelize } = require('../config/database');
const signatories = Signatories;
const path = require('path');


exports.create = async (req, res) => {
  try {
    const { DocumentTypeID, EmployeeOne, EmployeeTwo, EmployeeThree, EmployeeFour, EmployeeFive } = req.body;
    const item = await signatories.create({ DocumentTypeID, EmployeeOne, EmployeeTwo, EmployeeThree, EmployeeFour, EmployeeFive });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const items = await signatories.findAll({
      include: [
        {
          model: sequelize.models.DocumentType,
          as: 'DocumentType',
          attributes: ['Name']
        },
        { model: sequelize.models.Employee, as: 'SignatoryOne', attributes: ['FirstName', 'LastName'] },
        { model: sequelize.models.Employee, as: 'SignatoryTwo', attributes: ['FirstName', 'LastName'] },
        { model: sequelize.models.Employee, as: 'SignatoryThree', attributes: ['FirstName', 'LastName'] },
        { model: sequelize.models.Employee, as: 'SignatoryFour', attributes: ['FirstName', 'LastName'] },
        { model: sequelize.models.Employee, as: 'SignatoryFive', attributes: ['FirstName', 'LastName'] },
      ],
      order: [['ID', 'ASC']],
    });

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getById = async (req, res) => {
  try {
    const item = await signatories.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "signatories not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { DocumentTypeID, EmployeeOne, EmployeeTwo, EmployeeThree, EmployeeFour, EmployeeFive } = req.body;
    const [updated] = await signatories.update({ DocumentTypeID, EmployeeOne, EmployeeTwo, EmployeeThree, EmployeeFour, EmployeeFive }, {
      where: { ID: req.params.id }
    });
    if (updated) {
      const updatedItem = await signatories.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "signatories not found" });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const deleted = await signatories.destroy({ where: { id: req.params.id } });
    if (deleted) res.json({ message: "signatories deleted" });
    else res.status(404).json({ message: "signatories not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};