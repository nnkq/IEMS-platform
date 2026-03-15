const express = require("express");
const router = express.Router();

const repairController = require("../controllers/repairRequest.controller");

router.post("/repair-requests", repairController.createRepairRequest);

module.exports = router;