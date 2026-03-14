const express = require("express");
const { protect } = require("../middlewares/auth.middleware");
const { getHomeDashboard, searchHome } = require("../controllers/home.controller");

const router = express.Router();

router.get("/dashboard", protect, getHomeDashboard);
router.get("/search", protect, searchHome);

module.exports = router;