const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');

const rateLimitMap = new Map();
function groupRateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 30; // Slightly higher than auth, but prevents spam

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, firstAttempt: now });
        return next();
    }

    const entry = rateLimitMap.get(ip);
    if (now - entry.firstAttempt > windowMs) {
        rateLimitMap.set(ip, { count: 1, firstAttempt: now });
        return next();
    }

    entry.count++;
    if (entry.count > maxAttempts) {
        return res.status(429).json({
            success: false,
            message: 'Too many requests. Please try again later.'
        });
    }
    next();
}

// Public route to get group name by code for invite links
router.get('/code/:code', groupRateLimit, async (req, res) => {
    try {
        const GroupModel = require('../models/groupModel');
        const group = await GroupModel.getGroupByCode(req.params.code);
        if (!group) return res.status(404).json({ success: false, message: 'Invalid group code' });
        res.json({ success: true, data: { group_id: group.group_id, name: group.group_name, group_code: group.group_code } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.use(authMiddleware);

router.get('/', groupController.getUserGroups);
router.post('/', groupRateLimit, groupController.createGroup);
router.post('/create', groupRateLimit, groupController.createGroup);
router.post('/join', groupRateLimit, groupController.joinGroup);
router.get('/members', groupController.getMembers);
router.post('/members/add', groupController.addMemberDirectly);
router.post('/members/remove', groupController.removeMember);
router.get('/logs', groupController.getLogs);

// Resource routes must remain below the fixed paths above.
router.get('/:id/members', groupController.getMembers);
router.delete('/:id/members/:userId', groupController.removeMember);
router.post('/:id/leave', groupController.leaveGroup);
router.delete('/:id', groupController.deleteGroup);

// Join Requests and settings routes
router.get('/:id/join_requests', groupController.getJoinRequests);
router.patch('/:id/join_requests/:reqId', groupController.updateJoinRequest);
router.get('/:id/settings', groupController.getSettings);
router.patch('/:id/settings', groupController.updateSettings);
router.put('/:id/settings', groupController.updateSettings);

// Must be at the bottom to avoid catching specific routes like 'logs'
router.get('/:id', groupController.getGroupDetails);

module.exports = router;
