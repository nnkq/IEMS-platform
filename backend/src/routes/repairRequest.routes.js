const express = require("express");
const router = express.Router();

const repairController = require("../controllers/repairRequest.controller");
const { protect } = require("../middlewares/auth.middleware");

// ======================================================================
// --- CÁC ROUTE CỦA USER ---
// ======================================================================
router.post("/repair-requests", protect, repairController.createRepairRequest);
router.get("/repair-requests/my", protect, repairController.getMyRepairRequests);
router.get("/repair-requests/:id", protect, repairController.getRepairRequestsDetail);
// ======================================================================
// --- ROUTE TIẾN ĐỘ SỬA CHỮA ---
// ======================================================================
router.get("/repair-requests/ongoing", protect, repairController.getOngoingRepairs);
router.put("/repair-requests/:id/progress", protect, repairController.updateRepairProgress);

// ======================================================================
// --- ĐƯỜNG DẪN DÀNH CHO STORE ---
// ======================================================================
router.get('/repair-requests/store-orders/:storeId', repairController.getStoreRequests);
router.put('/repair-requests/store-orders/:id/status', repairController.updateRequestStatus);
router.delete('/repair-requests/store-orders/:id', repairController.deleteRequest);

module.exports = router;