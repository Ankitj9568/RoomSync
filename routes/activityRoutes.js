const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Example: /api/groups/:groupId/activities
router.get('/:groupId/activities', activityController.getGroupActivities);

module.exports = router;
