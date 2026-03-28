const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
} = require('../controllers/user.controller');

const router = express.Router();

router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);
router.put('/me/change-password', protect, changeMyPassword);

module.exports = router;