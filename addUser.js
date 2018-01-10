const User = require("./models/user");

// ------------------
// addUser Middleware
//-------------------

let newId = 0;

let addUser = async (fname, lname, email, password, next) => {
  try {
    userId = newId++;
    const user = new User({ fname, lname, email, password, userId });
    await user.save();
    next();
  } catch (err) {
    console.log(err);
  }
};

module.exports = addUser;
