const AdjustmentModel = require('../models/adjustmentModel');
const GroupModel = require('../models/groupModel');

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

            if (!group_id || !from_user || !to_user || !amount || !reason) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
            if (from_user === to_user) {
                return res.status(400).json({ success: false, message: 'Cannot adjust balance with yourself' });
            }

            const isMember = await GroupModel.isMember(group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            const adjustmentId = await AdjustmentModel.addAdjustment(group_id, from_user, to_user, amount, reason, userId);
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

            // Only the creator can delete it
            if (adjustment.created_by !== userId) {
                return res.status(403).json({ success: false, message: 'Only creator can delete' });
            }

            await AdjustmentModel.deleteAdjustment(adjustmentId);
            res.json({ success: true, message: 'Adjustment deleted' });
        } catch (error) {
            console.error('Delete adjustment error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = adjustmentController;
