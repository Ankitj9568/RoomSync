const express = require('express');
const router = express.Router();
const adjustmentController = require('../controllers/adjustmentController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', adjustmentController.getAdjustments);
router.post('/', adjustmentController.addAdjustment);
router.delete('/:id', adjustmentController.deleteAdjustment);

module.exports = router;
