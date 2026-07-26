const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/me', userController.getProfile);
router.put('/me', userController.updateProfile);
router.put('/me/password', userController.changePassword);

module.exports = router;
