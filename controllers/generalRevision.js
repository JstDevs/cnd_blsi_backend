const { generalRevision } = require('../config/database');

exports.create = async (req, res) => {
  try {
    const { LinkID, General_Revision_Date_Year, GeneralRevisionCode, TaxDeclarationCode, CityorMunicipalityAssessor, CityorMunicipalityAssistantAssessor, ProvincialAssessor, ProvincialAssistantAssessor } = req.body;
    const item = await generalRevision.create({ LinkID, General_Revision_Date_Year, GeneralRevisionCode, TaxDeclarationCode, CityorMunicipalityAssessor, CityorMunicipalityAssistantAssessor, ProvincialAssessor, ProvincialAssistantAssessor, Createdby: req.user.id, CreatedDate: new Date(), Modifiedby: req.user.id, ModifiedDate: new Date(), Active: true, UsingStatus: true });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const items = await generalRevision.findAll({ where: { Active: true } });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await generalRevision.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "generalRevision not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { LinkID, General_Revision_Date_Year, GeneralRevisionCode, TaxDeclarationCode, CityorMunicipalityAssessor, CityorMunicipalityAssistantAssessor, ProvincialAssessor, ProvincialAssistantAssessor } = req.body;
    const [updated] = await generalRevision.update({ LinkID, General_Revision_Date_Year, GeneralRevisionCode, TaxDeclarationCode, CityorMunicipalityAssessor, CityorMunicipalityAssistantAssessor, ProvincialAssessor, ProvincialAssistantAssessor, Modifiedby: req.user.id, ModifiedDate: new Date() }, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedItem = await generalRevision.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "generalRevision not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const [updated] = await generalRevision.update(
      { Active: false, Modifiedby: req.user.id, ModifiedDate: new Date() },
      { where: { id: req.params.id, Active: true } }
    );
    if (updated) res.json({ message: "generalRevision deactivated" });
    else res.status(404).json({ message: "generalRevision not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};