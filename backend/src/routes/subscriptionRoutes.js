const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');

router.get('/:userId', subscriptionController.getSubscription);
router.post('/upgrade', subscriptionController.upgradeSubscription);

module.exports = router;