const { Op } = require("sequelize");
const { Category } = require("../config/db-config.js");

const searchUserName = (whereCondition, username) => {
  if (username) {
    whereCondition.username = {
      [Op.iLike]: `%${username}%`,
    };
  }
};

const searchNote = (whereCondition, note) => {
  if (note) {
    whereCondition.note = {
      [Op.iLike]: `%${note}%`,
    };
  }
};

const filterByDate = (whereCondition, min_createdAt, max_createdAt) => {
  if (min_createdAt || max_createdAt) {
    whereCondition.createdAt = {}; // Ensure due_date is an object

    if (min_createdAt) {
      whereCondition.createdAt[Op.gte] = new Date(min_createdAt);
    }

    if (max_createdAt) {
      // If due_date already has conditions, add this as an AND condition
      if (whereCondition.createdAt[Op.gte]) {
        whereCondition.createdAt[Op.lte] = new Date(max_createdAt);
      } else {
        // If no existing conditions, overwrite due_date with a new object
        whereCondition.createdAt = {
          [Op.lte]: new Date(max_createdAt),
        };
      }
    }
  }
};

const filterbyCategoryStatus = (whereCondition, isexpense) => {
  if (isexpense) {
    whereCondition.isexpense = isexpense;
  }
};

const sumTotal = (arr) => {
  let sum = 0;
  for (const element of arr) {
    sum += element;
  }
  return sum;
};

module.exports = {
  searchUserName,
  filterbyCategoryStatus,
  searchNote,
  filterByDate,
  sumTotal,
};
