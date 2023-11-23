const express = require("express");
const passport = require("passport");
const {
  UserBalance,
  GoalCategory,
  Category,
  Goal,
  User,
  Expense,
} = require("../config/db-config.js");
const goalRouter = express.Router();
const { serializeGoal } = require("../component/serialize.js");

goalRouter.post(
  "/add",
  passport.authenticate("basic", { session: false }),
  async (req, res) => {
    try {
      const { note, price, categoryId } = req.body;
      const userId = req.user.id;
      const selectedBalance = await UserBalance.findOne({ where: { userId } });
      const balanceId = selectedBalance.id;

      if (!selectedBalance) {
        return res.status(404).json({ error: "Balance Not Found" });
      }

      const progress = (selectedBalance.balance / price) * 100;
      const roundedProgress = progress.toFixed(2);

      const status = progress >= 100;

      const newGoal = await Goal.create({
        note,
        price,
        status,
        progress: roundedProgress,
        categoryId,
        balanceId,
        userId,
      });

      return res.status(201).json(newGoal);
    } catch (error) {
      console.error("Error adding Goal", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

goalRouter.get(
  "/list",
  passport.authenticate("basic", { session: false }),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, pageSize = 10 } = req.query;
      const offset = (page - 1) * pageSize;
      const whereCondition = { userId };

      const getGoal = await Goal.findAll({
        order: [["id", "ASC"]],
        where: whereCondition,
        limit: pageSize,
        offset: offset,
        include: [
          {
            model: GoalCategory,
            as: "category",
          },
          {
            model: User,
            as: "user",
          },
        ],
      });

      const totalCount = await Goal.count({ where: whereCondition });
      const totalPages = Math.ceil(totalCount / pageSize);

      const serializedGoal = getGoal.map(serializeGoal);

      const response = {
        goal: serializedGoal,
        pagination: {
          totalCount,
          currentPage: page,
          totalPages,
        },
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error("Error adding Goal", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

goalRouter.put(
  "/edit/:id",
  passport.authenticate("basic", { session: false }),
  async (req, res) => {
    try {
      const id = req.params.id;
      const { note, price, categoryId } = req.body;
      const userId = req.user.id;

      const selectedGoal = await Goal.findByPk(id);
      const balanceId = selectedGoal.balanceId;
      const selectedBalance = await UserBalance.findByPk(balanceId);

      if (selectedBalance.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Each User can only edit their own's Goal" });
      }

      const progress = (selectedBalance.balance / price) * 100;
      const roundedProgress = progress.toFixed(2);

      const status = progress >= 100;

      const [numUpdated, updateGoal] = await Goal.update(
        {
          note,
          price,
          status,
          progress: roundedProgress,
          categoryId,
          balanceId,
          userId,
        },
        { where: { id }, returning: true }
      );

      if (numUpdated === 0) {
        return res.status(404).json({ error: "Income Not Found" });
      } else {
        return res.status(200).json(updateGoal[0]);
      }
    } catch (error) {
      console.error("Error updating Goal", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

goalRouter.delete(
  "/delete/:id",
  passport.authenticate("basic", { session: false }),
  async (req, res) => {
    try {
      const id = req.params.id;
      const userId = req.user.id;

      const selectedGoal = await Goal.findByPk(id);
      const balanceId = selectedGoal.balanceId;
      const selectedBalance = await UserBalance.findByPk(balanceId);

      if (selectedBalance.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Each User can only delete their own's Goal" });
      }

      const numDeleted = await Goal.destroy({
        where: { id },
        returning: true,
      });

      if (numDeleted === 0) {
        return res.status(404).json({ error: "Goal Not Found" });
      } else {
        return res.status(200).json({ message: "Success deleting Goal" });
      }
    } catch (error) {
      console.error("Error deleting Goal", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

goalRouter.delete(
  "/complete/:id",
  passport.authenticate("basic", { session: false }),
  async (req, res) => {
    try {
      const id = req.params.id;
      const userId = req.user.id;

      const selectedGoal = await Goal.findByPk(id);

      if (!selectedGoal) {
        return res.status(404).json({ error: "Goal Not Found" });
      }

      const balanceId = selectedGoal.balanceId;
      const selectedBalance = await UserBalance.findByPk(balanceId);

      if (!selectedBalance || selectedBalance.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Each User can only delete their own Goal" });
      }

      if (!selectedGoal.status) {
        return res.status(403).json({ error: "status must be true" });
      }

      if (selectedGoal.status) {
        // Ensure the 'Goal' category is created
        const [GoalCategory, created] = await Category.findOrCreate({
          where: { name: "Goal" },
        });

        // Use the ID of the 'Goal' category
        const categoryId = GoalCategory.id;

        const numDeleted = await Goal.destroy({
          where: { id },
          returning: true,
        });

        if (numDeleted === 0) {
          return res.status(404).json({ error: "Goal Not Found" });
        }

        await Expense.create({
          note: selectedGoal.note,
          amount: selectedGoal.price,
          userId: selectedGoal.userId,
          balanceId: selectedGoal.balanceId,
          categoryId,
        });

        // Decrease the balance in UserBalance
        const userBalance = await UserBalance.findByPk(selectedGoal.balanceId);

        if (!userBalance) {
          return res.status(400).json({ error: "Invalid balanceId" });
        }

        userBalance.balance -= selectedGoal.price; // Assuming balance is a numeric field

        // Save the updated UserBalance
        await userBalance.save();

        return res
          .status(200)
          .json({ message: "Your Goal has been completed" });
      }
    } catch (error) {
      console.error("Error completing Goal", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = goalRouter;
