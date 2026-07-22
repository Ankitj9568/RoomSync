const express = require('express');
const router = express.Router();
const mealController = require('../controllers/mealController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', mealController.getMeals);
router.post('/', mealController.toggleMeal);
router.get('/menu', mealController.getMenu);
router.post('/menu', mealController.saveMenu);

module.exports = router;
