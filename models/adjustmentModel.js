const db = require('../config/db');

const AdjustmentModel = {
    async getAdjustmentsByGroup(groupId) {
        const [rows] = await db.execute(`
            SELECT a.adjustment_id, a.amount, a.reason, a.created_at,
                   a.from_user, u1.name as from_user_name,
                   a.to_user, u2.name as to_user_name,
                   a.created_by, u3.name as created_by_name
            FROM adjustments a
            JOIN users u1 ON a.from_user = u1.user_id
            JOIN users u2 ON a.to_user = u2.user_id
            JOIN users u3 ON a.created_by = u3.user_id
            WHERE a.group_id = ?
            ORDER BY a.created_at DESC
        `, [groupId]);
        return rows;
    },

    async getAdjustmentById(adjustmentId) {
        const [rows] = await db.execute('SELECT * FROM adjustments WHERE adjustment_id = ?', [adjustmentId]);
        return rows[0];
    },

    async addAdjustment(groupId, fromUser, toUser, amount, reason, createdBy) {
        const [result] = await db.execute(
            'INSERT INTO adjustments (group_id, from_user, to_user, amount, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [groupId, fromUser, toUser, amount, reason, createdBy]
        );
        return result.insertId;
    },

    async deleteAdjustment(adjustmentId) {
        await db.execute('DELETE FROM adjustments WHERE adjustment_id = ?', [adjustmentId]);
    }
};

module.exports = AdjustmentModel;
