const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const subscriptionController = require('../controllers/subscriptionController');

router.get('/promotion-overview', protect, subscriptionController.getPromotionOverview);
router.post('/upgrade', subscriptionController.upgradeSubscription);
router.post('/broadcast-promotion', protect, subscriptionController.broadcastPromotion);
router.get('/:userId', subscriptionController.getSubscription);

module.exports = router;
