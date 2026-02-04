const { Lgu } = require('../config/database');
const lgu = Lgu;
const path = require('path');


exports.create = async (req, res) => {
  try {
    const { Code, Name, TIN, RDO, PhoneNumber, EmailAddress, Website, StreetAddress, BarangayID, MunicipalityID, ProvinceID, RegionID, ZIPCode, Active, CreatedBy, CreatedDate, ModifyBy, ModifyDate } = req.body;
    const item = await lgu.create({ Logo: logoPath, Code, Name, TIN, RDO, PhoneNumber, EmailAddress, Website, StreetAddress, BarangayID, MunicipalityID, ProvinceID, RegionID, ZIPCode, Active, CreatedBy, CreatedDate, ModifyBy, ModifyDate });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// exports.getAll = async (req, res) => {
//   try {
//     const items = await lgu.findAll();
//     res.json(items);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
exports.getAll = async (req, res) => {
  try {
    const latest = await lgu.findOne({
      order: [['ID', 'DESC']],
    });

    if (!latest) return res.status(404).json({ message: 'No LGU found' });

    // Convert Sequelize instance to plain object
    const data = latest.toJSON();

    // Append full URL to logo if it exists
    if (data.Logo) {
      data.Logo = `${process.env.BASE_URL_SERVER}/uploads/${data.Logo}`; // full path to logo
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getById = async (req, res) => {
  try {
    const item = await lgu.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "lgu not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    let logoPath = null;
    if (req.file) {
      logoPath = path.join(req.uploadPath, req.file.filename).replace(/\\/g, '/'); // ensure forward slashes
    }
    const { Code, Name, TIN, RDO, PhoneNumber, EmailAddress, Website, StreetAddress, BarangayID, MunicipalityID, ProvinceID, RegionID, ZIPCode } = req.body;
    const [updated] = await lgu.update({ Logo: logoPath, Code, Name, TIN, RDO, PhoneNumber, EmailAddress, Website, StreetAddress, BarangayID, MunicipalityID, ProvinceID, RegionID, ZIPCode, ModifyBy: req.user.id, ModifyDate: new Date() }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await lgu.findByPk(req.params.id);

      if (updatedItem.Logo) {
        updatedItem.Logo = `${process.env.BASE_URL}/uploads/${updatedItem.Logo}`; // full path to logo
      }
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "lgu not found" });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const deleted = await lgu.destroy({ where: { id: req.params.id } });
    if (deleted) res.json({ message: "lgu deleted" });
    else res.status(404).json({ message: "lgu not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};