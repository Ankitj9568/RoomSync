const express = require('express');
const router = express.Router();
const shoppingListController = require('../controllers/shoppingListController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', shoppingListController.getList);
router.post('/', shoppingListController.addItem);
router.put('/:id', shoppingListController.updateItem);
router.delete('/:id', shoppingListController.deleteItem);

module.exports = router;
