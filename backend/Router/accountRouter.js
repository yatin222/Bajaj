const express = require("express");
const userController = require('../controllers/userController.js');

const app = express.Router();

app.post('/forgotPassword', userController.forgot);
app.patch('/resetPassword/:token', userController.reset);

module.exports = app;