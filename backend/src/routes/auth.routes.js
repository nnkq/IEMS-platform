const express = require("express");
const passport = require("passport");
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  googleSuccess,
  googleFailure,
  selectRole,
} = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/select-role", protect, selectRole);

router.get(
  "/google",
  (req, res, next) => {
    const origin = String(req.query.origin || "").trim();
    passport.authenticate("google", {
      scope: ["profile", "email"],
      state: origin,
    })(req, res, next);
  }
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/api/auth/google/failure",
    session: false,
  }),
  googleSuccess
);

router.get("/google/failure", googleFailure);

module.exports = router;
