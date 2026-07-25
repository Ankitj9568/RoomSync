const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');

// Public route to get group name by code for invite links
router.get('/code/:code', async (req, res) => {
    try {
        const GroupModel = require('../models/groupModel');
        const group = await GroupModel.getGroupByCode(req.params.code);
        if (!group) return res.status(404).json({ success: false, message: 'Invalid group code' });
        res.json({ success: true, data: { name: group.group_name } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.use(authMiddleware);

router.get('/', groupController.getUserGroups);
router.post('/create', groupController.createGroup);
router.post('/join', groupController.joinGroup);
router.get('/members', groupController.getMembers);
router.post('/members/add', groupController.addMemberDirectly);
router.post('/members/remove', groupController.removeMember);
router.get('/logs', groupController.getLogs);

// Join Requests Routes
router.get('/:id/join_requests', groupController.getJoinRequests);
router.patch('/:id/join_requests/:reqId', groupController.updateJoinRequest);
router.patch('/:id/settings', groupController.updateSettings);

// Must be at the bottom to avoid catching specific routes like 'logs'
router.get('/:id', groupController.getGroupDetails);

module.exports = router;
