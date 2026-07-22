const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', groupController.createGroup);
router.get('/', groupController.getUserGroups);
router.get('/:id', groupController.getGroupDetails);
router.post('/join', groupController.joinGroup);
router.delete('/:id', groupController.deleteGroup);

router.get('/:id/members', groupController.getMembers);
router.delete('/:id/members/:userId', groupController.removeMember);
router.post('/:id/leave', groupController.leaveGroup);

router.get('/:id/settings', groupController.getSettings);
router.put('/:id/settings', groupController.updateSettings);

router.put('/:id/budget', groupController.updateBudget);

module.exports = router;
