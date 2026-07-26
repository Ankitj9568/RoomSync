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
        res.json({ success: true, data: { name: group.group_name } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.use(authMiddleware);

router.get('/', groupController.getUserGroups);
router.post('/create', groupRateLimit, groupController.createGroup);
router.post('/join', groupRateLimit, groupController.joinGroup);
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
