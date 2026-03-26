const express = require("express");
const router = express.Router();

const repairController = require("../controllers/repairRequest.controller");
const { protect } = require("../middlewares/auth.middleware");

router.post("/repair-requests", protect, repairController.createRepairRequest);
router.get("/repair-requests/my", protect, repairController.getMyRepairRequests);
module.exports = router;    