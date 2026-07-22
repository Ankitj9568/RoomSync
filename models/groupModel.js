const db = require('../config/db');

const GroupModel = {
    async createGroup(groupName, groupCode, userId) {
        try {
            await db.run('BEGIN TRANSACTION');

            const groupResult = await db.run(
                'INSERT INTO `groups` (group_name, group_code, created_by) VALUES (?, ?, ?)',
                [groupName, groupCode, userId]
            );
            const groupId = groupResult.lastID;

            await db.run(
                'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
                [groupId, userId, 'admin']
            );

            await db.run(
                'INSERT INTO group_settings (group_id) VALUES (?)',
                [groupId]
            );

            await db.run('COMMIT');
            return groupId;
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    },

    async getUserGroups(userId) {
        const rows = await db.all(`
            SELECT g.group_id, g.group_name, g.group_code, gm.role,
            (SELECT COUNT(*) FROM group_members WHERE group_id = g.group_id) as member_count
            FROM `groups` g
            JOIN group_members gm ON g.group_id = gm.group_id
            WHERE gm.user_id = ?
        `, [userId]);
        return rows;
    },

    async getGroupById(groupId) {
        const rows = await db.all(`
            SELECT group_id, group_name, group_code, created_by
            FROM `groups` WHERE group_id = ?
        `, [groupId]);
        return rows[0];
    },

    async getGroupByCode(groupCode) {
        const rows = await db.all('SELECT group_id, group_name FROM `groups` WHERE group_code = ?', [groupCode]);
        return rows[0];
    },

    async getGroupMembers(groupId) {
        const rows = await db.all(`
            SELECT u.user_id, u.name, u.email, u.phone, u.upi_id, gm.role, gm.joined_at
            FROM group_members gm
            JOIN users u ON gm.user_id = u.user_id
            WHERE gm.group_id = ?
        `, [groupId]);
        return rows;
    },

    async isMember(groupId, userId) {
        const rows = await db.all('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
        return rows[0];
    },

    async addMember(groupId, userId, role = 'member') {
        await db.run('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)', [groupId, userId, role]);
    },

    async removeMember(groupId, userId) {
        await db.run('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
    },

    async deleteGroup(groupId) {
        await db.run('DELETE FROM `groups` WHERE group_id = ?', [groupId]);
    },

    async getSettings(groupId) {
        const rows = await db.all('SELECT meal_cutoff_time FROM group_settings WHERE group_id = ?', [groupId]);
        return rows[0];
    },

    async updateSettings(groupId, mealCutoffTime) {
        await db.run('UPDATE group_settings SET meal_cutoff_time = ? WHERE group_id = ?', [mealCutoffTime, groupId]);
    },

    async assignNewAdmin(groupId) {
        const rows = await db.all('SELECT user_id FROM group_members WHERE group_id = ? ORDER BY joined_at ASC LIMIT 1', [groupId]);
        if (rows.length > 0) {
            await db.run('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?', ['admin', groupId, rows[0].user_id]);
        }
    },

    async updateBudget(groupId, userId, budget) {
        await db.run('UPDATE group_members SET monthly_budget = ? WHERE group_id = ? AND user_id = ?', [budget, groupId, userId]);
    }
};

module.exports = GroupModel;
