const { Customer } = require('../config/database');
const customer = Customer;

exports.create = async (req, res) => {
  try {
    const { Code, Name, PaymentTermsID, PaymentMethodID, TIN, RDO, TaxCodeID, TypeID, IndustryTypeID, ContactPerson, PhoneNumber, MobileNumber, EmailAddress, Website, StreetAddress, BarangayID, MunicipalityID, ProvinceID, RegionID, ZIPCode, Active, CreatedBy, CreatedDate, ModifyBy, ModifyDate, FirstName, MiddleName, LastName, CivilStatus, PlaceofBirth, Gender, Height, Weight, Birthdate, Citizenship, Occupation, ICRNumber, Type, PlaceofIncorporation, KindofOrganization, DateofRegistration } = req.body;
    const item = await customer.create({ Code, Name, PaymentTermsID, PaymentMethodID, TIN, RDO, TaxCodeID, TypeID, IndustryTypeID, ContactPerson, PhoneNumber, MobileNumber, EmailAddress, Website, StreetAddress, BarangayID, MunicipalityID, ProvinceID, RegionID, ZIPCode, Active, CreatedBy, CreatedDate, ModifyBy, ModifyDate, FirstName, MiddleName, LastName, CivilStatus, PlaceofBirth, Gender, Height, Weight, Birthdate, Citizenship, Occupation, ICRNumber, Type, PlaceofIncorporation, KindofOrganization, DateofRegistration });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const items = await customer.findAll({ where: { Active: true } });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await customer.findOne({ where: { id: req.params.id, Active: true } });
    if (item) res.json(item);
    else res.status(404).json({ message: "customer not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { Code, Name, PaymentTermsID, PaymentMethodID, TIN, RDO, TaxCodeID, TypeID, IndustryTypeID, ContactPerson, PhoneNumber, MobileNumber, EmailAddress, Website, StreetAddress, BarangayID, MunicipalityID, ProvinceID, RegionID, ZIPCode, Active, CreatedBy, CreatedDate, ModifyBy, ModifyDate, FirstName, MiddleName, LastName, CivilStatus, PlaceofBirth, Gender, Height, Weight, Birthdate, Citizenship, Occupation, ICRNumber, Type, PlaceofIncorporation, KindofOrganization, DateofRegistration } = req.body;
    const [updated] = await customer.update({ Code, Name, PaymentTermsID, PaymentMethodID, TIN, RDO, TaxCodeID, TypeID, IndustryTypeID, ContactPerson, PhoneNumber, MobileNumber, EmailAddress, Website, StreetAddress, BarangayID, MunicipalityID, ProvinceID, RegionID, ZIPCode, Active, CreatedBy, CreatedDate, ModifyBy, ModifyDate, FirstName, MiddleName, LastName, CivilStatus, PlaceofBirth, Gender, Height, Weight, Birthdate, Citizenship, Occupation, ICRNumber, Type, PlaceofIncorporation, KindofOrganization, DateofRegistration }, {
      where: { id: req.params.id, Active: true }
    });
    if (updated) {
      const updatedItem = await customer.findByPk(req.params.id);
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "customer not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SOFT DELETE: Sets Active = false instead of removing from database
exports.delete = async (req, res) => {
  try {
    const [updated] = await customer.update(
      { Active: false, ModifyBy: req.user?.id ?? 1, ModifyDate: new Date() },
      { where: { id: req.params.id, Active: true } }
    );
    if (updated) res.json({ message: "customer deactivated" });
    else res.status(404).json({ message: "customer not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};