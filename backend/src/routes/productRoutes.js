const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/:userId', productController.getProducts);
router.post('/', productController.addProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;