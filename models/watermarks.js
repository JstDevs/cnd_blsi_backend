const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Watermarks', {
    ID: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    DocumentID: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    Confidential: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
  }, {
    sequelize,
    tableName: 'watermarks',
  
    timestamps: false
  });
};
