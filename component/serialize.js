const moment = require("moment");

const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 2,
});

const serializeUserBalance = (balance) => {
  return {
    id: balance.id,
    username: balance.user.username,
    current_balance: formatter.format(balance.balance),
  };
};

const serializeIncome = (income) => {
  return {
    id: income.id,
    user: income.user.username,
    category: income.category.name,
    note: income.note,
    amount: formatter.format(income.amount),
    createdAt: moment(income.createdAt).format("MMMM DD, YYYY HH:mm:ss"),
  };
};

const serializeExpense = (expense) => {
  return {
    id: expense.id,
    user: expense.user.uername,
    category: expense.category.name,
    note: expense.note,
    amount: formatter.format(expense.amount),
    createdAt: moment(expense.createdAt).format("MMMM DD, YYYY HH:mm:ss"),
  };
};

const serializeGoal = (Goal) => {
  return {
    id: Goal.id,
    note: Goal.note,
    price: formatter.format(Goal.price),
    category: Goal.category.name,
    progress:
      Goal.progress > 100 ? "Goal exceeds the limit" : `${Goal.progress} %`,
    createdAt: moment(Goal.createdAt).format("MMMM DD, YYYY HH:mm:ss"),
  };
};

module.exports = {
  serializeIncome,
  serializeUserBalance,
  serializeExpense,
  serializeGoal,
};
