const express = require("express");
const app = express();

const User = require("./models/user");
const addUser = require("./addUser");

// ----------------------------------------
// App Variables
// ----------------------------------------
app.locals.appName = "Photo Gallery";

// ----------------------------------------
// ENV
// ----------------------------------------
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// ----------------------------------------
// Body Parser
// ----------------------------------------
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

// ----------------------------------------
// Sessions/Cookies
// ----------------------------------------
const cookieSession = require("cookie-session");

app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "secret"]
  })
);

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// ----------------------------------------
// Flash Messages
// ----------------------------------------
const flash = require("express-flash-messages");
app.use(flash());

// ----------------------------------------
// Method Override
// ----------------------------------------
const methodOverride = require("method-override");
const getPostSupport = require("express-method-override-get-post-support");

app.use(
  methodOverride(
    getPostSupport.callback,
    getPostSupport.options // { methods: ['POST', 'GET'] }
  )
);

// ----------------------------------------
// Referrer
// ----------------------------------------
app.use((req, res, next) => {
  req.session.backUrl = req.header("Referer") || "/";
  next();
});

// ----------------------------------------
// Public
// ----------------------------------------
app.use(express.static(`${__dirname}/public`));

// ----------------------------------------
// Logging
// ----------------------------------------
const morgan = require("morgan");
const morganToolkit = require("morgan-toolkit")(morgan);

app.use(morganToolkit());

// ----------------------------------------
// Template Engine
// ----------------------------------------
const expressHandlebars = require("express-handlebars");
const helpers = require("./helpers");

const hbs = expressHandlebars.create({
  helpers: helpers,
  partialsDir: "views/",
  defaultLayout: "application"
});

app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");

// ----------------------------------------
// Mongoose
// ----------------------------------------
const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/assignment_node_s3_photo_gallery");
app.use((req, res, next) => {
  if (mongoose.connection.readyState) {
    next();
  } else {
    require("./mongo")().then(() => next());
  }
});

// ----------------------------------------
// Passport
// ----------------------------------------

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
app.use(passport.initialize());

// ----------------------------------------
// Express Sessions
// ----------------------------------------

const expressSession = require("express-session");
app.use(passport.session());

// ----------------------------------------
// Local Strategy
// ----------------------------------------

passport.use(
  new LocalStrategy((email, password, done) => {
    User.findOne({ email }, (err, user) => {
      if (err) return done(err);
      if (!user.validPassword(password)) {
        return done(null, false, { message: "Invalid Password!" });
      }
      if (!user) {
        return done(null, false, { message: "Invalid Email!" });
      }
      return done(null, user);
    });
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

// ----------------------------------------
// login/logout Middlewares
// ----------------------------------------

const loggedInOnly = (req, res, next) => {
  return req.session.passport && req.session.passport.user
    ? next()
    : res.redirect("/login");
};

const loggedOutOnly = (req, res, next) => {
  return !req.user ? next() : res.redirect("/");
};

// ----------------------------------------
// Routes
// ----------------------------------------

const ImageUpload = require("./services/imageUpload");

let currentUser;

app.get(["/", "photos"], loggedInOnly, async (req, res) => {
  try {
    currentUser = await User.findById(req.session.passport.user);
    const photos = require("./data/photos");
    res.render("welcome/index", {
      currentUser: currentUser,
      photos: photos
    });
  } catch (err) {
    console.log(err);
  }
});

app.get("/photos/new", (req, res) => {
  res.render("newPhoto");
});

const mw = ImageUpload.single("photo[file]");
app.post("/photos", mw, (req, res, next) => {
  console.log("Files", req.file);

  ImageUpload.upload(
    {
      data: req.file.buffer,
      name: req.file.originalname,
      mimetype: req.file.mimetype
    },
    req.body.photo.username
  )
    .then(data => {
      console.log("------------------------");
      console.log(data);
      req.flash("success", "Photo created!");
      res.redirect("/photos");
    })
    .catch(next);
});

app.delete("/photos/:id", (req, res, next) => {
  ImageUpload.remove(req.params.id)
    .then(() => {
      res.redirect("/photos");
    })
    .catch(next);
});

// ----------------------------------------
// Routes for /login
// ----------------------------------------

app.get("/login", loggedOutOnly, (req, res) => {
  res.render("login");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
  })
);

// ----------------------------------------
// Routes for /register
// ----------------------------------------

app.get("/register", loggedOutOnly, (req, res) => {
  res.render("register");
});

app.post("/register", loggedOutOnly, async (req, res) => {
  const { email, password } = req.body;
  await addUser(email, password);
  res.redirect("/login");
});

// ----------------------------------------
// Route for /logout
// ----------------------------------------

const onLogout = async (req, res) => {
  req.logout();
  req.session.passport.user = null;
  res.redirect("/login");
};

app.get("/logout", loggedInOnly, onLogout);

// ----------------------------------------
// Server
// ----------------------------------------
const port = process.env.PORT || process.argv[2] || 3000;
const host = "localhost";

let args;
process.env.NODE_ENV === "production" ? (args = [port]) : (args = [port, host]);

args.push(() => {
  console.log(`Listening: http://${host}:${port}\n`);
});

if (require.main === module) {
  app.listen.apply(app, args);
}

// ----------------------------------------
// Error Handling
// ----------------------------------------
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.stack) {
    err = err.stack;
  }
  res.status(500).render("errors/500", { error: err });
});

module.exports = app;
