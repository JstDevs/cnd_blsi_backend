const { users, UserUserAccess, userAccess, employee } = require('../config/database');
const bcrypt = require('bcrypt');
const { Op } = require("sequelize");
const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

exports.create = async (req, res) => {
  try {
    let { EmployeeID, UserName, Password, UserAccessArray } = req.body;

    // Check if username already exists
    const existingUser = await users.findOne({
        where: { UserName: UserName }
    });

    if (existingUser) {
      throw new Error('Username already exists');
    }

    Password = await hashPassword(Password);

    const item = await users.create({ EmployeeID, UserName, Password, Active: true, CreatedBy: req.user.id, CreatedDate: new Date() });
    
    
    // 🟢 Now create new ones
    for (const accessId of UserAccessArray) {
        await UserUserAccess.create({
            UserID: item.ID,
            UserAccessID: accessId
        });
    }

    res.status(201).json({message: "Success"});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    // Only return active users with necessary associations
    // Avoid getAllWithAssociations to prevent circular reference issues
    
    const items = await users.findAll({ 
      where: { Active: true },
      include: [
        {
          model: userAccess,
          as: 'accessList',
          required: false
        },
        {
          model: employee,
          as: 'Employee',
          required: false
        }
      ],
      order: [['ID', 'ASC']]
    });
    
    res.json({
      status: true,
      items
    });
  } catch (err) {
    console.error('Error in users.getAll:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await users.findOne({ where: { id: req.params.id, Active: true } });
    if (item) res.json(item);
    else res.status(404).json({ message: "users not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    let { EmployeeID, UserName, Password, UserAccessArray } = req.body;
    
    // Check if username already exists
    const existingUser = await users.findOne({
      where: {
        UserName: UserName,
        ID: { [Op.ne]: req.params.id } // Exclude current user from check
      }
    });

    if (existingUser) {
      throw new Error('Username already exists');
    }

    Password = await hashPassword(Password);

    const [updated] = await users.update({ EmployeeID, UserName, Password }, {
      where: { id: req.params.id, Active: true }
    });
    let updatedItem;
    if (updated) {
      updatedItem = await users.findByPk(req.params.id);
    } else {
      throw new Error("User not found");
    }
    
    // 🔴 Delete all previous accesses for this user
    await UserUserAccess.destroy({
        where: { UserID: updatedItem.ID }
    });

    // 🟢 Now create new ones
    for (const accessId of UserAccessArray) {
        await UserUserAccess.create({
            UserID: updatedItem.ID,
            UserAccessID: accessId
        });
    }

    res.json({message: "success"});

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SOFT DELETE: Sets Active = false instead of removing from database
exports.delete = async (req, res) => {
  try {
    const [updated] = await users.update(
      { Active: false, CreatedBy: req.user?.id ?? 1, CreatedDate: new Date() },
      { where: { id: req.params.id, Active: true } }
    );
    if (updated) res.json({ message: "users deactivated" });
    else res.status(404).json({ message: "users not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};