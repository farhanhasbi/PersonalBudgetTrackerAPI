const express = require("express");
const {
  UserBalance,
  Category,
  GoalCategory,
  User,
  Income,
  Expense,
} = require("../config/db-config.js");
const router = express.Router();
const filter = require("../component/filter.js");
const { serializeUserBalance } = require("../component/serialize.js");
const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 2,
});
const { isAuthenticated, adminAccess } = require("../middleware/authing.js");

router.post("/initial-balance", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { balance } = req.body;

    const existingUser = await UserBalance.findOne({
      where: {
        userId,
      },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Each user can only have one balance" });
    }
    const addBalance = await UserBalance.create({
      userId,
      balance,
    });
    return res.status(201).json(addBalance);
  } catch (error) {
    console.error("Error adding balance");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/user-balance", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const getUserBalance = await UserBalance.findOne({
      where: {
        userId,
      },
      include: [
        {
          model: User,
          as: "user",
        },
      ],
    });

    if (getUserBalance === null) {
      return res
        .status(404)
        .json({ error: "User has not input a balance yet" });
    }

    // Get Current Balance
    const currentBalance = getUserBalance.balance;

    // Calculate User Income
    const getIncome = await Income.findAll({
      where: { balanceId: getUserBalance.id },
    });
    const incomeAmount = getIncome.map((income) => income.amount);
    const totalIncome = filter.sumTotal(incomeAmount);

    // Calculate User Expense
    const getExpense = await Expense.findAll({
      where: { balanceId: getUserBalance.id },
    });
    const expenseAmount = getExpense.map((expense) => expense.amount);
    const totalExpense = filter.sumTotal(expenseAmount);

    // Get Initial Balance
    const initialBalance = formatter.format(
      currentBalance + totalExpense - totalIncome
    );

    // profit or loss
    const Profit = formatter.format(totalIncome - totalExpense);

    const serializedUserBalance = serializeUserBalance(getUserBalance);

    const response = {
      current_balance: serializedUserBalance,
      initial_balance: initialBalance,
      profit: Profit,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching data", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/add-category", adminAccess, async (req, res) => {
  try {
    const { name, isexpense } = req.body;

    const existingCategory = await Category.findOne({
      where: {
        name,
      },
    });

    if (existingCategory) {
      return res.status(400).json({ error: "Category already exist" });
    }

    const newCategory = await Category.create({
      name,
      isexpense,
    });

    return res.status(201).json(newCategory);
  } catch (error) {
    console.error("Error adding category", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/list-category", isAuthenticated, async (req, res) => {
  try {
    const { isexpense } = req.query;
    const whereCondition = {};

    filter.filterbyCategoryStatus(whereCondition, isexpense);

    const getCategory = await Category.findAll({
      order: [["id", "ASC"]],
      where: whereCondition,
    });

    return res.status(200).json(getCategory);
  } catch (error) {
    console.error("Error fetching category", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/edit-category/:id", adminAccess, async (req, res) => {
  try {
    const { name, isexpense } = req.body;
    const id = req.params.id;

    const [numUpdated, updateCategory] = await Category.update(
      { name, isexpense },
      { where: { id }, returning: true }
    );
    if (numUpdated === 0) {
      return res.status(404).json({ error: "Category Not Found" });
    } else {
      return res.status(200).json(updateCategory[0]);
    }
  } catch (error) {
    console.error("Error editing category", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/delete-category/:id", adminAccess, async (req, res) => {
  try {
    const id = req.params.id;

    const numDelete = await Category.destroy({
      where: { id },
      returning: true,
    });
    if (numDelete === 0) {
      return res.status(404).json({ error: "Category Not Found" });
    } else {
      return res.status(200).json({ message: "Success deleting data" });
    }
  } catch (error) {
    console.error("Error editing category", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Goal Category
router.post("/add-goalcategory", adminAccess, async (req, res) => {
  try {
    const { name } = req.body;

    const existingCategory = await GoalCategory.findOne({
      where: {
        name,
      },
    });

    if (existingCategory) {
      return res.status(400).json({ error: "Category already exist" });
    }

    const newCategory = await GoalCategory.create({
      name,
    });

    return res.status(201).json(newCategory);
  } catch (error) {
    console.error("Error adding category", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/list-goalcategory", isAuthenticated, async (req, res) => {
  try {
    const getCategory = await GoalCategory.findAll({
      order: [["id", "ASC"]],
    });

    if (getCategory.length === 0) {
      return res.status(404).json({ error: "Empty Category" });
    }

    return res.status(200).json(getCategory);
  } catch (error) {
    console.error("Error fetching category", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/edit-goalcategory/:id", adminAccess, async (req, res) => {
  try {
    const { name } = req.body;
    const id = req.params.id;

    const [numUpdated, updateCategory] = await GoalCategory.update(
      { name },
      { where: { id }, returning: true }
    );
    if (numUpdated === 0) {
      return res.status(404).json({ error: "Category Not Found" });
    } else {
      return res.status(200).json(updateCategory[0]);
    }
  } catch (error) {
    console.error("Error editing category", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/delete-goalcategory/:id", adminAccess, async (req, res) => {
  try {
    const id = req.params.id;

    const numDelete = await GoalCategory.destroy({
      where: { id },
      returning: true,
    });
    if (numDelete === 0) {
      return res.status(404).json({ error: "Category Not Found" });
    } else {
      return res.status(200).json({ message: "Success deleting data" });
    }
  } catch (error) {
    console.error("Error deleting category", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
// End Goal Category

module.exports = router;
