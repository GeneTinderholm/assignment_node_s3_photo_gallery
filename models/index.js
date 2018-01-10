const mongoose = require("mongoose");
const bluebird = require("bluebird");

// Set bluebird as the promise
// library for mongoose
mongoose.Promise = bluebird;

let models = {};

// Load models and attach to models here
models.User = require("./user");
//... more models

module.exports = models;
