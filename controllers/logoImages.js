const { LogoImages } = require('../config/database');
const logoimages = LogoImages;
const path = require('path');


exports.create = async (req, res) => {
  try {
    const fields = ['ImageOne', 'ImageTwo', 'ImageThree', 'ImageFour', 'ImageFive', 'ImageSix', 'ImageSeven', 'ImageEight', 'ImageNine', 'ImageTen'];
    const data = {};
    fields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });

    const item = await logoimages.create(data);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    console.log('GET /logoImages - Fetching latest record');
    const latest = await logoimages.findOne({
      order: [['ID', 'DESC']],
    });

    if (!latest) {
      console.log('GET /logoImages - No records found');
      return res.json({});
    }

    const data = latest.toJSON();
    const fields = ['ImageOne', 'ImageTwo', 'ImageThree', 'ImageFour', 'ImageFive', 'ImageSix', 'ImageSeven', 'ImageEight', 'ImageNine', 'ImageTen'];

    // Append full URL if the field has a value
    fields.forEach(field => {
      if (data[field]) {
        data[field] = `${process.env.BASE_URL_SERVER}/uploads/${data[field]}`;
      }
    });

    res.json(data);
  } catch (err) {
    console.error('GET /logoImages - Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const relativePath = path.join(req.uploadPath, req.file.filename).replace(/\\/g, '/');
    res.json({ filePath: relativePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getById = async (req, res) => {
  try {
    const item = await logoimages.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "logo images not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { ImageOne, ImageTwo, ImageThree, ImageFour, ImageFive, ImageSix, ImageSeven, ImageEight, ImageNine, ImageTen } = req.body;
    const [updated] = await logoimages.update({ ImageOne, ImageTwo, ImageThree, ImageFour, ImageFive, ImageSix, ImageSeven, ImageEight, ImageNine, ImageTen }, {
      where: { ID: req.params.id }
    });
    if (updated) {
      const updatedItem = await logoimages.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "logo images not found" });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const deleted = await logoimages.destroy({ where: { id: req.params.id } });
    if (deleted) res.json({ message: "logo images deleted" });
    else res.status(404).json({ message: "logo images not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};