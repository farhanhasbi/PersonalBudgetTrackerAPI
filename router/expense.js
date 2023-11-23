const express = require("express");
const passport = require("passport");
const {
  UserBalance,
  Category,
  Expense,
  User,
} = require("../config/db-config.js");
const expenseRouter = express.Router();
const filter = require("../component/filter.js");
const { serializeExpense } = require("../component/serialize.js");

expenseRouter.post(
  "/add",
  passport.authenticate("basic", { session: false }),
  async (req, res) => {
    try {
      const { amount, note, categoryId } = req.body;
      const userId = req.user.id;
      const selectedBalance = await UserBalance.findOne({ where: { userId } });
      const balanceId = selectedBalance.id;
      const selectedCategory = await Category.findByPk(categoryId);
      const allCategory = await Category.findAll();
      const selectCategory = allCategory
        .filter((category) => category.isexpense === true)
        .map((category) => category.id);

      if (!selectedCategory || !selectedCategory.isexpense) {
        return res.status(400).json({
          error: `Invalid category for expense, You should select this category [${selectCategory.join(
            ", "
          )}]`,
        });
      }

      if (!selectedBalance) {
        return res.status(404).json({ error: "Balance Not Found" });
      }

      // Create the expense record
      const newExpense = await Expense.create({
        amount,
        note,
        categoryId,
        balanceId,
        userId,
      });

      // Increase the balance in UserBalance
      const userBalance = await UserBalance.findByPk(balanceId);

      if (!userBalance) {
        return res.status(400).json({ error: "Invalid balanceId" });
      }

      userBalance.balance -= amount; // Assuming balance is a numeric field

      // Save the updated UserBalance
      await userBalance.save();

      return res.status(201).json(newExpense);
    } catch (error) {
      console.error("Error adding expense", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

expenseRouter.get(
  "/list",
  passport.authenticate("basic", { session: false }),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        note,
        min_createdAt,
        max_createdAt,
        page = 1,
        pageSize = 10,
      } = req.query;
      const offset = (page - 1) * pageSize;
      const whereCondition = {
        userId,
      };

      filter.searchNote(whereCondition, note);
      filter.filterByDate(whereCondition, min_createdAt, max_createdAt);

      const getExpense = await Expense.findAll({
        order: [["id", "ASC"]],
        where: whereCondition,
        limit: pageSize,
        offset: offset,
        include: [
          {
            model: Category,
            as: "category",
          },
          {
            model: User,
            as: "user",
          },
        ],
      });

      const expenseAmount = getExpense.map((expense) => expense.amount);

      const total = filter.sumTotal(expenseAmount);
      const formatter = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 2,
      });
      const formattedTotal = formatter.format(total);

      if (getExpense.length === 0) {
        return res.status(404).json({ error: "Expense Not Found" });
      }

      const totalCount = await Expense.count({ where: whereCondition });
      const totalPages = Math.ceil(totalCount / pageSize);

      const serializedExpense = getExpense.map(serializeExpense);

      const response = {
        expense: serializedExpense,
        pagination: {
          totalCount,
          currentPage: page,
          totalPages,
        },
        totalExpense: formattedTotal,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error("Error fetching data", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

expenseRouter.put(
  "/edit/:id",
  passport.authenticate("basic", { session: false }),
  async (req, res) => {
    try {
      const id = req.params.id;
      const { note, amount: newAmount, categoryId } = req.body;
      const userId = req.user.id;
      const selectedExpense = await Expense.findByPk(id);
      const balanceId = selectedExpense.balanceId;

      // Check Condition
      const selectedCategory = await Category.findByPk(categoryId);
      const selectedBalance = await UserBalance.findByPk(balanceId);

      if (!selectedCategory || !selectedCategory.isexpense) {
        return res.status(400).json({ error: "Invalid category for expense" });
      }

      if (!selectedBalance) {
        return res.status(404).json({ error: "Balance Not Found" });
      }

      if (selectedBalance.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Each User can only edit their own's expense" });
      }

      // Calculate the difference between the old and new amounts
      const amountDifference = newAmount - selectedExpense.amount;

      const [numUpdated, updateExpense] = await Expense.update(
        {
          amount: newAmount,
          note,
          categoryId,
          balanceId,
        },
        { where: { id }, returning: true }
      );

      if (numUpdated === 0) {
        return res.status(404).json({ error: "Expense Not Found" });
      } else {
        // Increase the balance in UserBalance
        const userBalance = await UserBalance.findByPk(balanceId);

        if (!userBalance) {
          return res.status(400).json({ error: "Invalid balanceId" });
        }

        userBalance.balance -= amountDifference; // Assuming balance is a numeric field

        // Save the updated UserBalance
        await userBalance.save();
        return res.status(200).json(updateExpense[0]);
      }
    } catch (error) {
      console.error("Error updating expense", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

expenseRouter.delete(
  "/delete/:id",
  passport.authenticate("basic", { session: false }),
  async (req, res) => {
    try {
      const id = req.params.id;
      const userId = req.user.id;
      const selectedExpense = await Expense.findByPk(id);
      const balanceId = selectedExpense.balanceId;
      const selectedBalance = await UserBalance.findByPk(balanceId);
      const expenseAmount = selectedExpense.amount;

      if (selectedBalance.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Each User can only delete their own's expense" });
      }
      const numDeleted = await Expense.destroy({
        where: { id },
        returning: true,
      });

      if (numDeleted === 0) {
        return res.status(404).json({ error: "expense Not Found" });
      } else {
        // decrease the balance in UserBalance
        const userBalance = await UserBalance.findByPk(
          selectedExpense.balanceId
        );

        if (!userBalance) {
          return res.status(400).json({ error: "Invalid balanceId" });
        }

        userBalance.balance += expenseAmount; // Assuming balance is a numeric field

        // Save the updated UserBalance
        await userBalance.save();

        return res.status(200).json({ message: "Success deleting expense" });
      }
    } catch (error) {
      console.error("Error deleting expense", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = expenseRouter;
