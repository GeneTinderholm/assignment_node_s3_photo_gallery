const User = require("./models/user");

// ------------------
// addUser Middleware
//-------------------


let addUser = async (email, password, next) => {
  try {
    const user = new User({ email, password });
    await user.save();
    next();
  } catch (err) {
    console.log(err);
  }
};

module.exports = addUser;
