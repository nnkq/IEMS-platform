const express = require("express");
const router = express.Router();

const repairController = require("../controllers/repairRequest.controller");
const { protect } = require("../middlewares/auth.middleware");

router.post("/repair-requests", protect, repairController.createRepairRequest);

module.exports = router;