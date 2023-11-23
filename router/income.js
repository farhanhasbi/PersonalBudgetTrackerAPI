const express = require("express");
const passport = require("passport");
const {
  UserBalance,
  Category,
  Income,
  User,
} = require("../config/db-config.js");
const incomeRouter = express.Router();
const filter = require("../component/filter.js");
const { serializeIncome } = require("../component/serialize.js");

incomeRouter.post(
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
        .filter((category) => category.isexpense === false)
        .map((category) => category.id);

      if (!selectedCategory || selectedCategory.isexpense) {
        return res.status(400).json({
          error: `Invalid category for income, You should select this category [${selectCategory.join(
            ", "
          )}]`,
        });
      }

      if (!selectedBalance) {
        return res.status(404).json({ error: "Balance Not Found" });
      }

      const newIncome = await Income.create({
        amount,
        note,
        categoryId,
        balanceId,
        userId,
      });

      const userBalance = await UserBalance.findByPk(balanceId);

      if (!userBalance) {
        return res.status(400).json({ error: "Invalid balanceId" });
      }

      userBalance.balance += amount; // Assuming balance is a numeric field

      // Save the updated UserBalance
      await userBalance.save();

      return res.status(201).json(newIncome);
    } catch (error) {
      console.error("Error adding income", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

incomeRouter.get(
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

      const getIncome = await Income.findAll({
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

      const incomeAmount = getIncome.map((income) => income.amount);

      const total = filter.sumTotal(incomeAmount);

      const formatter = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 2,
      });
      const formattedTotal = formatter.format(total);

      if (getIncome.length === 0) {
        return res.status(404).json({ error: "Income Not Found" });
      }

      const totalCount = await Income.count({ where: whereCondition });
      const totalPages = Math.ceil(totalCount / pageSize);

      const serializedIncome = getIncome.map(serializeIncome);

      const response = {
        income: serializedIncome,
        pagination: {
          totalCount,
          currentPage: page,
          totalPages,
        },
        totalIncomes: formattedTotal,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error("Error fetching data", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

incomeRouter.put(
  "/edit/:id",
  passport.authenticate("basic", { session: false }),
  async (req, res) => {
    try {
      const id = req.params.id;
      const { note, amount: newAmount, categoryId } = req.body;
      const userId = req.user.id;
      const selectedIncome = await Income.findByPk(id);
      const balanceId = selectedIncome.balanceId;

      // Check Condition
      const selectedCategory = await Category.findByPk(categoryId);
      const selectedBalance = await UserBalance.findByPk(balanceId);

      if (!selectedCategory || selectedCategory.isexpense) {
        return res.status(400).json({ error: "Invalid category for income" });
      }

      if (!selectedBalance) {
        return res.status(404).json({ error: "Balance Not Found" });
      }

      if (selectedBalance.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Each User can only edit their own's income" });
      }

      // Calculate the difference between the old and new amounts
      const amountDifference = newAmount - selectedIncome.amount;

      const [numUpdated, updateIncome] = await Income.update(
        {
          amount: newAmount,
          note,
          categoryId,
          balanceId,
        },
        { where: { id }, returning: true }
      );

      if (numUpdated === 0) {
        return res.status(404).json({ error: "Income Not Found" });
      } else {
        // Increase the balance in UserBalance
        const userBalance = await UserBalance.findByPk(balanceId);

        if (!userBalance) {
          return res.status(400).json({ error: "Invalid balanceId" });
        }

        userBalance.balance += amountDifference; // Assuming balance is a numeric field

        // Save the updated UserBalance
        await userBalance.save();
        return res.status(200).json(updateIncome[0]);
      }
    } catch (error) {
      console.error("Error updating data", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

incomeRouter.delete(
  "/delete/:id",
  passport.authenticate("basic", { session: false }),
  async (req, res) => {
    try {
      const id = req.params.id;
      const userId = req.user.id;
      const selectedIncome = await Income.findByPk(id);
      const balanceId = selectedIncome.balanceId;
      const selectedBalance = await UserBalance.findByPk(balanceId);
      const reduceIncomeAmount = selectedIncome.amount;

      if (selectedBalance.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Each User can only delete their own's income" });
      }
      const numDeleted = await Income.destroy({
        where: { id },
        returning: true,
      });

      if (numDeleted === 0) {
        return res.status(404).json({ error: "Income Not Found" });
      } else {
        // decrease the balance in UserBalance
        const userBalance = await UserBalance.findByPk(
          selectedIncome.balanceId
        );

        if (!userBalance) {
          return res.status(400).json({ error: "Invalid balanceId" });
        }

        userBalance.balance -= reduceIncomeAmount; // Assuming balance is a numeric field

        // Save the updated UserBalance
        await userBalance.save();

        return res.status(200).json({ message: "Success deleting data" });
      }
    } catch (error) {
      console.error("Error deleting data", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = incomeRouter;
