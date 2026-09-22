const AdjustmentModel = require('../models/adjustmentModel');
const GroupModel = require('../models/groupModel');
const ActivityLogModel = require('../models/activityLogModel');
const { toCents } = require('../utils/validation');

const adjustmentController = {
    async getAdjustments(req, res) {
        try {
            const { group_id } = req.query;
            const userId = req.session.userId;

            if (!group_id) {
                return res.status(400).json({ success: false, message: 'group_id is required' });
            }

            const isMember = await GroupModel.isMember(group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }
            if (isMember.role !== 'admin') return res.status(403).json({ success: false, message: 'NOT_ADMIN' });

            const adjustments = await AdjustmentModel.getAdjustmentsByGroup(group_id);
            res.json({ success: true, data: adjustments });
        } catch (error) {
            console.error('Get adjustments error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async addAdjustment(req, res) {
        try {
            const { group_id, from_user, to_user, amount, reason } = req.body;
            const userId = req.session.userId;

            if (!group_id || !from_user || !to_user || amount === undefined || !String(reason || '').trim()) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
            if (String(reason).length > 255) {
                return res.status(400).json({ success: false, message: 'Reason is too long' });
            }
            if (toCents(amount) <= 0) {
                return res.status(400).json({ success: false, message: 'Valid amount greater than zero is required' });
            }
            if (Number(from_user) === Number(to_user)) {
                return res.status(400).json({ success: false, message: 'Cannot adjust balance with yourself' });
            }

            const role = await GroupModel.isMember(group_id, userId);
            if (!role) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }
            // Only admins can create manual balance adjustments
            if (role.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Only admins can create adjustments' });
            }
            if (!await GroupModel.isMember(group_id, from_user) || !await GroupModel.isMember(group_id, to_user)) {
                return res.status(400).json({ success: false, message: 'MEMBER_NOT_FOUND' });
            }

            const adjustmentId = await AdjustmentModel.addAdjustment(group_id, from_user, to_user, amount, String(reason).trim(), userId);
            await ActivityLogModel.create(group_id, userId, 'ADDED_ADJUSTMENT', `Added a balance adjustment of ₹ ${amount}`);
            res.status(201).json({ success: true, data: { adjustment_id: adjustmentId } });
        } catch (error) {
            console.error('Add adjustment error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async deleteAdjustment(req, res) {
        try {
            const adjustmentId = req.params.id;
            const userId = req.session.userId;

            const adjustment = await AdjustmentModel.getAdjustmentById(adjustmentId);
            if (!adjustment) {
                return res.status(404).json({ success: false, message: 'Adjustment not found' });
            }

            const role = await GroupModel.isMember(adjustment.group_id, userId);
            if (!role || role.role !== 'admin') return res.status(403).json({ success: false, message: 'NOT_ADMIN' });

            await AdjustmentModel.deleteAdjustment(adjustmentId);
            res.json({ success: true, message: 'Adjustment deleted' });
        } catch (error) {
            console.error('Delete adjustment error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = adjustmentController;
