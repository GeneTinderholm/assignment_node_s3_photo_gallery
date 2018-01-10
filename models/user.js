const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

// -----------------------------
// User Model
// -----------------------------
const UserSchema = new Schema(
  {
    email: { type: String, required: true },
    passwordHash: { type: String, required: true }
  },
  {
    timestamps: true
  }
);

// -----------------------------
// Passport, password validation
// -----------------------------

UserSchema.plugin(uniqueValidator);

UserSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.passwordHash);
};

UserSchema.virtual("password")
  .get(function() {
    return this._password;
  })
  .set(function(value) {
    this._password = value;
    this.passwordHash = bcrypt.hashSync(value, 8);
  });

const User = mongoose.model("User", UserSchema);

module.exports = User;
