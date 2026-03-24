const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');

// Mở 2 đường dẫn API để lấy và lưu hồ sơ
router.get('/profile/:userId', storeController.getStoreProfile);
router.post('/profile', storeController.updateStoreProfile);

module.exports = router;