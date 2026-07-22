const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/create', groupController.createGroup);
router.post('/join', groupController.joinGroup);
router.get('/members', groupController.getMembers);
router.post('/members/add', groupController.addMemberDirectly);
router.post('/members/remove', groupController.removeMember);
router.get('/logs', groupController.getLogs);

module.exports = router;
