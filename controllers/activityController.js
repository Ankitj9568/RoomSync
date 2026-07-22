const ActivityLogModel = require('../models/activityLogModel');

class ActivityController {
    static async getGroupActivities(req, res) {
        try {
            const groupId = req.params.groupId;
            
            // Check if user belongs to group
            if (req.session.user.groupId != groupId) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            const activities = await ActivityLogModel.getByGroupId(groupId);
            res.json(activities);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error fetching activities' });
        }
    }
}

module.exports = ActivityController;
