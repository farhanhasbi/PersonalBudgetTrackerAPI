'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Goal extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Goal.init({
    note: DataTypes.STRING,
    price: DataTypes.FLOAT,
    status: DataTypes.BOOLEAN,
    progress: DataTypes.FLOAT,
    categoryId: DataTypes.INTEGER,
    balanceId: DataTypes.INTEGER,
    userId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Goal',
  });
  return Goal;
};