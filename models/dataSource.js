const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('DataSource', {
    ID: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    InformationOne: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    InformationTwo: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    InformationThree: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    InformationFour: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    InformationFive: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    InformationSix: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    InformationSeven: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    InformationEight: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    InformationNine: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    InformationTen: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
  }, {
    sequelize,
    tableName: 'datasource',
  
    timestamps: false
  });
};
