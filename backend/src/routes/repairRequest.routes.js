const express = require("express");
const router = express.Router();

const repairController = require("../controllers/repairRequest.controller");
const { protect } = require("../middlewares/auth.middleware");

router.post("/repair-requests", protect, repairController.createRepairRequest);
router.get("/repair-requests/my", protect, repairController.getMyRepairRequests);
router.get("/repair-requests/:id", protect, repairController.getRepairRequestsDetail);

router.get("/repair-requests/:id/review", protect, repairController.getReviewForRequest);
router.post("/repair-requests/:id/review", protect, repairController.submitReviewForRequest);

router.get("/repair-requests/ongoing", protect, repairController.getOngoingRepairs);
router.put("/repair-requests/:id/progress", protect, repairController.updateRepairProgress);

router.get('/repair-requests/store-orders/:storeId', repairController.getStoreRequests);
router.put('/repair-requests/store-orders/:id/status', repairController.updateRequestStatus);
router.post('/repair-requests/:id/quote/accept', protect, repairController.acceptQuote);
router.post('/repair-requests/:id/quote/reject', protect, repairController.rejectQuote);
router.post('/repair-requests/:id/confirm-completed', protect, repairController.confirmRepairCompletion);
router.delete('/repair-requests/store-orders/:id', repairController.deleteRequest);
router.get("/repair-requests/store/:storeId/reviews", protect, repairController.getStoreReviews);
module.exports = router;