const pool = require('../config/db');

class ActivityLogModel {
    static async create(groupId, userId, action, description) {
        const [result] = await pool.execute(
            'INSERT INTO activity_logs (group_id, user_id, action, description) VALUES (?, ?, ?, ?)',
            [groupId, userId, action, description]
        );
        return result.insertId;
    }

    static async getByGroupId(groupId, limit = 20) {
        const [rows] = await pool.execute(
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
