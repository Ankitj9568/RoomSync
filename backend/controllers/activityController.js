const ActivityLogModel = require('../models/activityLogModel');

class ActivityController {
    static async getGroupActivities(req, res) {
        try {
            const groupId = req.params.groupId;
            const userId = req.session.userId;
            
            // Check if user belongs to group
            const GroupModel = require('../models/groupModel');
            const isMember = await GroupModel.isMember(groupId, userId);
            if (!isMember) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            const activities = await ActivityLogModel.getByGroupId(groupId);
            res.json({ success: true, data: activities });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error fetching activities' });
        }
    }
}

module.exports = ActivityController;
