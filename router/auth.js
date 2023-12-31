const express = require("express");
const passport = require("passport");
const bcrypt = require("bcrypt");
const { User } = require("../config/db-config.js");
const authRouter = express.Router();
const filter = require("../component/filter.js");
const { isAuthenticated, adminAccess } = require("../middleware/authing.js");

authRouter.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingUser = await User.findOne({
      where: {
        username,
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Username already Exist" });
    }

    if (req.session.user) {
      return res
        .status(403)
        .json({ error: "Please logout to access this function" });
    }

    const adminUser = await User.findByPk(1);

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      password: hashedPassword,
      role: adminUser ? "user" : "admin",
    });

    req.session.user = newUser;

    return res.status(201).json({ newUser });
  } catch (error) {
    console.error("Register Failed", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

authRouter.post(
  "/login",
  passport.authenticate("basic", { session: false }),
  (req, res) => {
    try {
      req.session.user = req.user;
      return res.status(200).json({ message: "Login successful" });
    } catch (error) {
      console.error("Login failed");
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get All User
authRouter.get("/all-user", adminAccess, async (req, res) => {
  try {
    const { username, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    whereCondition = {};

    filter.searchUserName(whereCondition, username);

    const getUser = await User.findAll({
      order: [["id", "ASC"]],
      limit: pageSize,
      offset: offset,
      where: whereCondition,
    });
    if (getUser.length === 0) {
      return res
        .status(404)
        .json({ error: "No user found with the specified criteria" });
    }

    const totalCount = await User.count({ where: whereCondition });
    const totalPages = Math.ceil(totalCount / pageSize);

    const response = {
      user: getUser,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error Fetching Data", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Edit Username and Password
authRouter.put("/edit-user/:id", isAuthenticated, async (req, res) => {
  const { username, password } = req.body;
  const id = parseInt(req.params.id, 10);
  const userId = req.session.user.id;

  try {
    if (userId !== id) {
      return res
        .status(403)
        .json({ error: "Unauthorized: You can only edit your own profile" });
    }

    if (password) {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      await User.update(
        {
          username,
          password: hashedPassword,
        },
        { where: { id } }
      );
    } else {
      // If no new password provided, update only username and picture
      await User.update(
        {
          username,
        },
        { where: { id } }
      );
    }

    const updatedUser = await User.findByPk(id);

    if (!updatedUser) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.status(200).json(updatedUser);
    }
  } catch (error) {
    console.error("Error editing user");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete User
authRouter.delete("/delete-user/:id", adminAccess, async (req, res) => {
  try {
    const id = req.params.id;
    const numDelete = await User.destroy({ where: { id }, returning: true });
    if (numDelete === 0) {
      return res.status(404).json({ error: "User Not Found" });
    } else {
      return res.status(200).json({ message: "Success deleting data" });
    }
  } catch (error) {
    console.error("Error deleting user");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

authRouter.post("/logout", isAuthenticated, async (req, res) => {
  try {
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", error);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        return res.status(200).json({ message: "Logout successful" });
      }
    });
  } catch (error) {
    // Handle errors
    console.error("Error during logout:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = authRouter;
