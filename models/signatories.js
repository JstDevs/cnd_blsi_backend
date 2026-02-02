const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  return sequelize.define('Signatories', {
    ID: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    DocumentTypeID: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    EmployeeOne: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    EmployeeTwo: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    EmployeeThree: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    EmployeeFour: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    EmployeeFive: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
  }, {
    sequelize,
    tableName: 'signatories',

    timestamps: false
  });
};
