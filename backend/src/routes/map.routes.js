const express = require("express");
const router = express.Router();
const {
  getNearbyStores,
  getNearbyRequests,
} = require("../controllers/map.controller");

router.post("/stores/nearby", getNearbyStores);
router.post("/requests/nearby", getNearbyRequests);

module.exports = router;