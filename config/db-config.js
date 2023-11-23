const { Sequelize, DataTypes } = require("sequelize");

// Connect to database
const sequelize = new Sequelize(
  "your_database",
  "your_username",
  "your_password",
  {
    host: "localhost",
    dialect: "postgres",
    logging: false,
  }
);

// Check Database Connection
sequelize
  .authenticate()
  .then(() => {
    console.log(
      "Connection to the database has been established successfully."
    );
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });

const User = sequelize.define("User", {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM("admin", "user"),
  },
});

const UserBalance = sequelize.define("UserBalance", {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  balance: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
});

const Category = sequelize.define("Category", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isexpense: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

const GoalCategory = sequelize.define("GoalCategory", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const Income = sequelize.define("Income", {
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  note: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  balanceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

const Expense = sequelize.define("Expense", {
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  note: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  balanceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

const Goal = sequelize.define("Goal", {
  note: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  progress: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  balanceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

// Relation Table
UserBalance.belongsTo(User, { foreignKey: "userId", as: "user" });
Income.belongsTo(Category, { foreignKey: "categoryId", as: "category" });
Income.belongsTo(UserBalance, { foreignKey: "balanceId", as: "balance" });
Income.belongsTo(User, { foreignKey: "userId", as: "user" });
Expense.belongsTo(Category, { foreignKey: "categoryId", as: "category" });
Expense.belongsTo(UserBalance, { foreignKey: "balanceId", as: "balance" });
Expense.belongsTo(User, { foreignKey: "userId", as: "user" });
Goal.belongsTo(GoalCategory, { foreignKey: "categoryId", as: "category" });
Goal.belongsTo(UserBalance, { foreignKey: "balanceId", as: "balance" });
Goal.belongsTo(User, { foreignKey: "userId", as: "user" });

// Export the sequelize instance
module.exports = {
  sequelize,
  User,
  UserBalance,
  Category,
  Income,
  Expense,
  GoalCategory,
  Goal,
};

// npx sequelize-cli model:generate --name "model-name" --attributes "column_name":"type_data"
// npx sequelize-cli db:migrate
