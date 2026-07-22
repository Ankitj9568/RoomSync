const express = require('express');
const router = express.Router();
const groceryController = require('../controllers/groceryController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', groceryController.getGroceries);
router.post('/', groceryController.addGrocery);
router.put('/:id', groceryController.updateGrocery);
router.delete('/:id', groceryController.deleteGrocery);

module.exports = router;
