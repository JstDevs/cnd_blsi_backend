const db=require('../config/database')
const BudgetModel = require('../config/database').Budget;
const { Op } = require('sequelize');
const FiscalYearModel = require('../config/database').FiscalYear;
const DepartmentModel = require('../config/database').department;
const SubDepartmentModel = require('../config/database').subDepartment;
const ChartOfAccountsModel = require('../config/database').ChartofAccounts;
const FundModel = require('../config/database').Funds;
const ProjectModel = require('../config/database').Project;

exports.save = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const data = req.body;

    let IsNew = '';
    if((data.IsNew == "true") || (data.IsNew === true) || (data.IsNew == '1') || (data.IsNew == 1)) {
      IsNew = true;
    }
    else if((data.IsNew == "false") || (data.IsNew === false) || (data.IsNew == '0') || (data.IsNew == 0)) {
      IsNew = false;
    }
    else {
      throw new Error('Invalid value for IsNew. Expected true or false.');
    }

    // 1. Duplicate name check
    const existing = await BudgetModel.findOne({
      where: {
        Name: data.Name,
        DepartmentID: data.DepartmentID,
        Active: true,
        ...(IsNew ? {} : { ID: { [Op.ne]: data.ID } })
      }
    });

    if (existing) {
      throw new Error('Name already exists!');
    }

    // 2. Data payload
    let payload = {};
    if(IsNew) {
      payload = {
        Name: data.Name,
        FiscalYearID: data.FiscalYearID,
        DepartmentID: data.DepartmentID,
        SubDepartmentID: data.SubDepartmentID,
        ChartofAccountsID: data.ChartOfAccountsID,
        FundID: data.FundID,
        ProjectID: data.ProjectID,
        Appropriation: data.Appropriation,
        TotalAmount: data.Appropriation,
        Charges: data.Charges,
        AppropriationBalance: data.Appropriation, // same in old software
        January: data.January,
        February: data.February,
        March: data.March,
        April: data.April,
        May: data.May,
        June: data.June,
        July: data.July,
        August: data.August,
        September: data.September,
        October: data.October,
        November: data.November,
        December: data.December,
        Active: true,
        CreatedBy: req.user.id,
        CreatedDate: new Date(),
        Change: 0,
        Supplemental: 0,
        Released: 0,
        Transfer: 0,
        PreEncumbrance: 0,
        Encumbrance: 0,
        AllotmentBalance: 0,
        ChargedAllotment: 0,
      };
    } else {
      payload = {
        Name: data.Name,
        FiscalYearID: data.FiscalYearID,
        DepartmentID: data.DepartmentID,
        SubDepartmentID: data.SubDepartmentID,
        ChartofAccountsID: data.ChartOfAccountsID,
        FundID: data.FundID,
        ProjectID: data.ProjectID,
        Appropriation: data.Appropriation,
        Charges: data.Charges,
        January: data.January,
        February: data.February,
        March: data.March,
        April: data.April,
        May: data.May,
        June: data.June,
        July: data.July,
        August: data.August,
        September: data.September,
        October: data.October,
        November: data.November,
        December: data.December,
        ModifyBy: req.user.id,
        CreatedDate: new Date(),
      };
    }

    // 3. Insert or Update
    if (IsNew) {
      await BudgetModel.create(payload, { transaction: t });
    } else {
      await BudgetModel.update(payload, {
        where: { ID: data.ID },
        transaction: t,
      });
    }

    // 4. Commit
    await t.commit();

    res.json({ message: 'success' });
  } catch (error) {
    console.error(error);
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};


exports.getAll = async (req, res) => {
  try {
    const userDepartmentID = req.user.departmentID;

    const whereClause = {
      Active: true,
      ...(userDepartmentID && ![1, 2, 3, 4].includes(userDepartmentID)
        ? { DepartmentID: userDepartmentID }
        : {})
    };

    const results = await BudgetModel.findAll({
      where: whereClause,
      include: [
        { model: FiscalYearModel, as: 'FiscalYear', required: false },
        { model: DepartmentModel, as: 'Department', required: false },
        { model: SubDepartmentModel, as: 'SubDepartment', required: false },
        { model: ChartOfAccountsModel, as: 'ChartofAccounts', required: false },
        { model: FundModel, as: 'Funds', required: false },
        { model: ProjectModel, as: 'Project', required: false }
      ],
      order: [['CreatedBy', 'ASC']]
    });

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load data.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await BudgetModel.findOne({ where: { ID: req.params.id, Active: true } });
    if (item) res.json(item);
    else res.status(404).json({ message: "budget not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { Name } = req.body;
    const [updated] = await BudgetModel.update({ Name, ModifyBy: req.user.id, ModifyDate: new Date() }, {
      where: { ID: req.params.id, Active: true }
    });
    if (updated) {
      const updatedItem = await BudgetModel.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "budget not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SOFT DELETE: Sets Active = false instead of removing from database
exports.delete = async (req, res) => {
  try {
    const id = req.params.id; // or req.body.id
    const userID = req.user.id;

    // Soft delete - sets Active to false, record remains in database
    const [updated] = await BudgetModel.update(
      {
        Active: false,
        ModifyBy: userID,
        ModifyDate: new Date(),
      },
      {
        where: { ID: id, Active: true },
      }
    );

    if (updated) {
      res.json({ message: 'success' });
    } else {
      res.status(404).json({ message: "budget not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};