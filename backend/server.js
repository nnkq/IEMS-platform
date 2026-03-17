const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();

const db = require("./src/config/db");

const authRoutes = require("./src/routes/auth.routes");
const homeRoutes = require("./src/routes/home.routes");
const repairRoutes = require("./src/routes/repairRequest.routes");
const mapRoutes = require("./src/routes/map.routes");
const app = express();

/* ---------------- CORS ---------------- */
app.use("/api/map", mapRoutes);
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

/* ---------------- JSON ---------------- */

app.use(express.json());

/* ---------------- SESSION ---------------- */

app.use(
  session({
    secret: "iems_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

/* ---------------- PASSPORT ---------------- */

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const name = profile.displayName;
        const email = profile.emails?.[0]?.value || null;

        db.query(
          "SELECT * FROM users WHERE email = ? OR google_id = ?",
          [email, googleId],
          (err, results) => {
            if (err) return done(err);

            if (results.length > 0) {
              const user = results[0];

              db.query(
                "UPDATE users SET google_id = ? WHERE id = ?",
                [googleId, user.id],
                (updateErr) => {
                  if (updateErr) return done(updateErr);
                  return done(null, { ...user, google_id: googleId });
                }
              );
            } else {
              db.query(
                "INSERT INTO users (name, email, google_id, role) VALUES (?, ?, ?, ?)",
                [name, email, googleId, "USER"],
                (insertErr, result) => {
                  if (insertErr) return done(insertErr);

                  return done(null, {
                    id: result.insertId,
                    name,
                    email,
                    google_id: googleId,
                    role: "USER",
                  });
                }
              );
            }
          }
        );
      } catch (error) {
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

/* ---------------- ROUTES ---------------- */

app.get("/", (req, res) => {
  res.send("IEMS API Running");
});

app.use("/api/auth", authRoutes);
app.use("/api/home", homeRoutes);
app.use("/api", repairRoutes);

/* ---------------- SERVER ---------------- */

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});