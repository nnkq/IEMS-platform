const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const subscriptionController = require('../controllers/subscriptionController');

router.get('/:userId', subscriptionController.getSubscription);
router.post('/upgrade', subscriptionController.upgradeSubscription);
router.post('/broadcast-promotion', protect, subscriptionController.broadcastPromotion);

module.exports = router;
