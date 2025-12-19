const { PropertyTaxDeclaration, TaxDeclarationProperty, sequelize } = require('../config/database');
const propertyTaxDeclaration = PropertyTaxDeclaration;

// exports.create = async (req, res) => {
//   try {
//     const { T_D_No, PropertyID, OwnerID, OwnerTIN, OwnerAddress, OwnerTelephoneNumber, BeneficialorAdminUserID, BeneficialorAdminTIN, BeneficialorAdminAddress, BeneficialorAdminTelephoneNumber, OCT_TCT_CLOA_Number, CCT, LotNumber, BlockNumber, Dated, North, East, South, West, KindofProperty, Description, AssessedValue, AmountInWords, Taxable, SurveyNumber, Type, Classification, ActualUse, Storeys, MarketValue, CancelTDNumber, PreviousAssessedValue, Createdby, CreatedDate, Class, AssessmentLevel, Modifiedby, Modifieddate, Active, GeneralRevision } = req.body;
//     const item = await propertyTaxDeclaration.create({ T_D_No, PropertyID, OwnerID, OwnerTIN, OwnerAddress, OwnerTelephoneNumber, BeneficialorAdminUserID, BeneficialorAdminTIN, BeneficialorAdminAddress, BeneficialorAdminTelephoneNumber, OCT_TCT_CLOA_Number, CCT, LotNumber, BlockNumber, Dated, North, East, South, West, KindofProperty, Description, AssessedValue, AmountInWords, Taxable, SurveyNumber, Type, Classification, ActualUse, Storeys, MarketValue, CancelTDNumber, PreviousAssessedValue, Createdby, CreatedDate, Class, AssessmentLevel, Modifiedby, Modifieddate, Active, GeneralRevision });
//     res.status(201).json(item);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.create = async (req, res) => {
  const t = await sequelize.transaction(); // Start a transaction

  try {
    const {
      T_D_No, PropertyID, OwnerID, OwnerTIN, OwnerAddress, OwnerTelephoneNumber,
      BeneficialorAdminUserID, BeneficialorAdminTIN, BeneficialorAdminAddress, BeneficialorAdminTelephoneNumber,
      OCT_TCT_CLOA_Number, CCT, LotNumber, BlockNumber, Dated,
      North, East, South, West, KindofProperty, Description, AssessedValue,
      AmountInWords, Taxable, SurveyNumber, Type, Classification, ActualUse,
      Storeys, MarketValue, CancelTDNumber, PreviousAssessedValue, Class, AssessmentLevel, GeneralRevision,
      assessmentRows
    } = req.body;

    // 1. Create main tax declaration
    await propertyTaxDeclaration.create({
      T_D_No, PropertyID, OwnerID, OwnerTIN, OwnerAddress, OwnerTelephoneNumber,
      BeneficialorAdminUserID, BeneficialorAdminTIN, BeneficialorAdminAddress, BeneficialorAdminTelephoneNumber,
      OCT_TCT_CLOA_Number, CCT, LotNumber, BlockNumber, Dated,
      North, East, South, West, KindofProperty, Description, AssessedValue,
      AmountInWords, Taxable, SurveyNumber, Type, Classification, ActualUse,
      Storeys, MarketValue, CancelTDNumber, PreviousAssessedValue,
      Class, AssessmentLevel, Active: true, GeneralRevision,
      Createdby: req.user.id, CreatedDate: new Date(),
      Modifiedby: req.user.id, Modifieddate: new Date()
    }, { transaction: t });

    // 2. Insert assessment rows
    if (Array.isArray(assessmentRows)) {
      for (const row of assessmentRows) {
        await TaxDeclarationProperty.create({
          T_D_No: T_D_No,
          PropertyID: PropertyID,
          Kind: row.Kind,
          Classification: row.Classification,
          Area: row.Area,
          MarketValue: row.MarketValue,
          ActualUse: row.ActualUse,
          AssessmentLevel: row.AssessmentLevel,
          AssessmentValue: row.AssessmentValue
        }, { transaction: t });
      }
    }
    await t.commit(); // Commit transaction


    const fullData = await propertyTaxDeclaration.findOne({
      where: { T_D_No, PropertyID },
    });

    if (!fullData) {
      return res.status(404).json({ error: 'Property Tax Declaration not found' });
    }

    const AssessmentRows = await TaxDeclarationProperty.findAll({
      where: {
        T_D_No: fullData.T_D_No,
        PropertyID: fullData.PropertyID
      }
    });

    // Optionally merge them
    const result = {
      ...fullData.toJSON(),   // Convert Sequelize instance to plain object
      AssessmentRows         // Add assessment rows manually
    };

    res.status(200).json(result);
  } catch (err) {
    // await t.rollback(); // Rollback on error
    console.error("Create Error:", err);
    res.status(500).json({ error: err.message });
  }
};


// exports.getAll = async (req, res) => {
//   try {
//     const items = await propertyTaxDeclaration.findAll();
//     res.json(items);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
exports.getAll = async (req, res) => {
  try {
    
    const allDeclarations = await propertyTaxDeclaration.findAll({ where: {Active: true} });

    const fullData = await Promise.all(
      allDeclarations.map(async (item) => {
        const itemPlain = item.toJSON();

        const assessmentRows = await TaxDeclarationProperty.findAll({
          where: {
            Active: true,
            T_D_No: itemPlain.T_D_No,
            PropertyID: itemPlain.PropertyID,
          },
        });

        return {
          ...itemPlain,
          AssessmentRows: assessmentRows.map(row => row.toJSON()),
        };
      })
    );

    res.json(fullData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getById = async (req, res) => {
  try {
    const item = await propertyTaxDeclaration.findByPk(req.params.id);
    if (item) res.json(item);
    else res.status(404).json({ message: "propertyTaxDeclaration not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// exports.update = async (req, res) => {
//   try {
//     const { T_D_No, PropertyID, OwnerID, OwnerTIN, OwnerAddress, OwnerTelephoneNumber, BeneficialorAdminUserID, BeneficialorAdminTIN, BeneficialorAdminAddress, BeneficialorAdminTelephoneNumber, OCT_TCT_CLOA_Number, CCT, LotNumber, BlockNumber, Dated, North, East, South, West, KindofProperty, Description, AssessedValue, AmountInWords, Taxable, SurveyNumber, Type, Classification, ActualUse, Storeys, MarketValue, CancelTDNumber, PreviousAssessedValue, Createdby, CreatedDate, Class, AssessmentLevel, Modifiedby, Modifieddate, Active, GeneralRevision } = req.body;
//     const [updated] = await propertyTaxDeclaration.update({ T_D_No, PropertyID, OwnerID, OwnerTIN, OwnerAddress, OwnerTelephoneNumber, BeneficialorAdminUserID, BeneficialorAdminTIN, BeneficialorAdminAddress, BeneficialorAdminTelephoneNumber, OCT_TCT_CLOA_Number, CCT, LotNumber, BlockNumber, Dated, North, East, South, West, KindofProperty, Description, AssessedValue, AmountInWords, Taxable, SurveyNumber, Type, Classification, ActualUse, Storeys, MarketValue, CancelTDNumber, PreviousAssessedValue, Createdby, CreatedDate, Class, AssessmentLevel, Modifiedby, Modifieddate, Active, GeneralRevision }, {
//       where: { id: req.params.id }
//     });
//     if (updated) {
//       const updatedItem = await propertyTaxDeclaration.findByPk(req.params.id);
//       res.json(updatedItem);
//     } else {
//       res.status(404).json({ message: "propertyTaxDeclaration not found" });
//     }
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
exports.update = async (req, res) => {
  const t = await sequelize.transaction(); // Start transaction

  try {
    const {
      T_D_No, PropertyID, OwnerID, OwnerTIN, OwnerAddress, OwnerTelephoneNumber,
      BeneficialorAdminUserID, BeneficialorAdminTIN, BeneficialorAdminAddress, BeneficialorAdminTelephoneNumber,
      OCT_TCT_CLOA_Number, CCT, LotNumber, BlockNumber, Dated,
      North, East, South, West, KindofProperty, Description, AssessedValue,
      AmountInWords, Taxable, SurveyNumber, Type, Classification, ActualUse,
      Storeys, MarketValue, CancelTDNumber, PreviousAssessedValue, Class, AssessmentLevel, GeneralRevision,
      assessmentRows
    } = req.body;

    // get current ids
    const oldDataMain = await propertyTaxDeclaration.findOne({
      where: { ID: req.params.id },
    });
    if (!oldDataMain) {
      return res.status(404).json({ message: "propertyTaxDeclaration not found" });
    }
    const { T_D_No: T_D_No_old, PropertyID: PropertyID_old } = oldDataMain;

    // 1. Update main tax declaration
    await propertyTaxDeclaration.update({
      T_D_No, PropertyID, OwnerID, OwnerTIN, OwnerAddress, OwnerTelephoneNumber,
      BeneficialorAdminUserID, BeneficialorAdminTIN, BeneficialorAdminAddress, BeneficialorAdminTelephoneNumber,
      OCT_TCT_CLOA_Number, CCT, LotNumber, BlockNumber, Dated,
      North, East, South, West, KindofProperty, Description, AssessedValue,
      AmountInWords, Taxable, SurveyNumber, Type, Classification, ActualUse,
      Storeys, MarketValue, CancelTDNumber, PreviousAssessedValue,
      Class, AssessmentLevel, GeneralRevision,
      Modifiedby: req.user.id,
      Modifieddate: new Date()
    }, {
      where: { id: req.params.id },
      transaction: t
    });

    // 2. Delete old assessmentRows (optional: only if you're replacing them)
    await TaxDeclarationProperty.destroy({
      where: { T_D_No: T_D_No_old, PropertyID: PropertyID_old },
      transaction: t
    });

    // 3. Insert new assessment rows
    if (Array.isArray(assessmentRows)) {
      for (const row of assessmentRows) {
        await TaxDeclarationProperty.create({
          T_D_No,
          PropertyID,
          Kind: row.Kind,
          Classification: row.Classification,
          Area: row.Area,
          MarketValue: row.MarketValue,
          ActualUse: row.ActualUse,
          AssessmentLevel: row.AssessmentLevel,
          AssessmentValue: row.AssessmentValue
        }, { transaction: t });
      }
    }

    await t.commit(); // Commit transaction
    


    // Fetch the updated main record and its related assessment rows
    const fullData = await propertyTaxDeclaration.findOne({
      where: { ID: req.params.id },
    });

    if (!fullData) {
      return res.status(404).json({ error: 'Property Tax Declaration not found' });
    }

    const AssessmentRows = await TaxDeclarationProperty.findAll({
      where: {
        T_D_No: fullData.T_D_No,
        PropertyID: fullData.PropertyID
      }
    });

    // Optionally merge them
    const result = {
      ...fullData.toJSON(),   // Convert Sequelize instance to plain object
      AssessmentRows         // Add assessment rows manually
    };

    res.status(200).json(result);


  } catch (err) {
    await t.rollback(); // Rollback on error
    console.error("Update Error:", err);
    res.status(500).json({ error: err.message });
  }
};


// exports.delete = async (req, res) => {
//   try {
//     const deleted = await propertyTaxDeclaration.destroy({ where: { id: req.params.id } });
//     if (deleted) res.json({ message: "propertyTaxDeclaration deleted" });
//     else res.status(404).json({ message: "propertyTaxDeclaration not found" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.delete = async (req, res) => {
  const t = await sequelize.transaction(); // Start transaction

  try {
    const { id } = req.params;

    // Step 1: Find the main record to get T_D_No and PropertyID
    const declaration = await propertyTaxDeclaration.findByPk(id);

    if (!declaration) {
      return res.status(404).json({ message: "propertyTaxDeclaration not found" });
    }

    const { T_D_No, PropertyID } = declaration;

    // Soft delete related assessment rows
    await TaxDeclarationProperty.update(
      { Active: false, Modifiedby: req.user.id, ModifiedDate: new Date() },
      { where: { T_D_No, PropertyID, Active: true }, transaction: t }
    );

    // Soft delete main record
    const [updated] = await propertyTaxDeclaration.update(
      { Active: false, Modifiedby: req.user.id, Modifieddate: new Date() },
      { where: { ID: id, Active: true }, transaction: t }
    );

    await t.commit();
    if (updated) res.json({ message: "propertyTaxDeclaration deactivated" });
    else res.status(404).json({ message: "propertyTaxDeclaration not found" });

  } catch (err) {
    await t.rollback();
    console.error("Delete Error:", err);
    res.status(500).json({ error: err.message });
  }
};
