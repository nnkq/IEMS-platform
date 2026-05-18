const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");

const {
  diagnoseWithStoreData,
  listChatSessions,
  getChatSession,
  createChatSession,
  updateChatSession,
  uploadChatImage,
} = require("../controllers/aiDiagnosis.controller");

router.post("/diagnose", diagnoseWithStoreData);
router.post("/upload-image", protect, uploadChatImage);
router.get("/sessions", protect, listChatSessions);
router.get("/sessions/:id", protect, getChatSession);
router.post("/sessions", protect, createChatSession);
router.put("/sessions/:id", protect, updateChatSession);

module.exports = router;
