const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationClicked,
} = require('../controllers/user.controller');

const router = express.Router();

router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);
router.put('/me/change-password', protect, changeMyPassword);
router.post('/notifications/read-all', protect, markAllNotificationsRead);
router.post('/notifications/:id/read', protect, markNotificationRead);
router.post('/notifications/:id/click', protect, markNotificationClicked);

module.exports = router;
