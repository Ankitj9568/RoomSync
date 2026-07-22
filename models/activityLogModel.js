const db = require('../config/db');

class ActivityLogModel {
    static async create(groupId, userId, action, description) {
        const result = await db.run(
            'INSERT INTO activity_logs (group_id, user_id, action, description) VALUES (?, ?, ?, ?)',
            [groupId, userId, action, description]
        );
        return result.lastID;
    }

    static async getByGroupId(groupId, limit = 20) {
        const rows = await db.all(
            `SELECT a.*, u.name as user_name 
             FROM activity_logs a 
             LEFT JOIN users u ON a.user_id = u.user_id 
             WHERE a.group_id = ? 
             ORDER BY a.created_at DESC 
             LIMIT ?`,
            [groupId, limit]
        );
        return rows;
    }
}

module.exports = ActivityLogModel;
