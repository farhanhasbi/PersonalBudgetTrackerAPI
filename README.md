# Overview
My personal api project to handle budget tracker

# Prerequisites
* postgresql
* node

# Initialization
* npm install
* connect to your postgres database in config/config.json and config/db-config.js
* npx sequelize-cli db:migrate
* node index

# Features
* User Authentication
* Initialize budget amount
* Automatically increase the budget after adding income
* Automatically decrease the budget after adding expense
* See the progress of your desired items or plans
