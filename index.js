// index
const express = require("express");
const app = express();
const session = require("express-session");
const cors = require("cors");
const port = process.env.PORT || 7000;
const passport = require("./config/passport.js");
const { sequelize } = require("./config/db-config.js");
const authRouter = require("./router/auth.js");
const router = require("./router/api.js");
const incomeRouter = require("./router/income.js");
const expenseRouter = require("./router/expense.js");
const goalRouter = require("./router/goal.js");

app.use(cors());

// Session and Passport Middleware
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Middleware to parse JSON requests
app.use(express.json());

app.use(passport.initialize());
app.use(passport.session());

sequelize.sync();

app.use("/auth", authRouter);
app.use("/", router);
app.use("/income", incomeRouter);
app.use("/expense", expenseRouter);
app.use("/goal", goalRouter);

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
