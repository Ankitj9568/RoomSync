const db = require('../config/db');

const GroupModel = {
    async createGroup(groupName, groupCode, userId) {
        return db.transaction(async tx => {
            const groupResult = await tx.run(
                'INSERT INTO `groups` (group_name, group_code, created_by) VALUES (?, ?, ?)',
                [groupName, groupCode, userId]
            );
            const groupId = groupResult.lastID;

            await tx.run(
                'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
                [groupId, userId, 'admin']
            );

            await tx.run(
                'INSERT INTO group_settings (group_id) VALUES (?)',
                [groupId]
            );

            return groupId;
        });
    },

    async getUserGroups(userId) {
        const rows = await db.all(`
            SELECT g.group_id, g.group_name, g.group_code, gm.role,
            (SELECT COUNT(*) FROM group_members WHERE group_id = g.group_id) as member_count
            FROM \`groups\` g
            JOIN group_members gm ON g.group_id = gm.group_id
            WHERE gm.user_id = ?
        `, [userId]);
        return rows;
    },

    async getGroupById(groupId) {
        const rows = await db.all(`
            SELECT group_id, group_name, group_code, created_by
            FROM \`groups\` WHERE group_id = ?
        `, [groupId]);
        return rows[0];
    },

    async getGroupByCode(groupCode) {
        const rows = await db.all('SELECT group_id, group_name, group_code FROM `groups` WHERE UPPER(group_code) = UPPER(?)', [groupCode]);
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

    async leaveGroup(groupId, userId) {
        return db.transaction(async tx => {
            const members = await tx.all('SELECT user_id, role FROM group_members WHERE group_id = ? ORDER BY joined_at ASC, group_member_id ASC', [groupId]);
            const member = members.find(item => Number(item.user_id) === Number(userId));
            if (!member) {
                const error = new Error('NOT_A_MEMBER');
                error.code = 'NOT_A_MEMBER';
                throw error;
            }
            if (members.length === 1) {
                const error = new Error('CANNOT_LEAVE_LAST_MEMBER');
                error.code = 'CANNOT_LEAVE_LAST_MEMBER';
                throw error;
            }

            let transferredTo = null;
            if (member.role === 'admin' && members.filter(item => item.role === 'admin').length === 1) {
                const replacement = members.find(item => Number(item.user_id) !== Number(userId));
                await tx.run('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?', ['admin', groupId, replacement.user_id]);
                transferredTo = replacement.user_id;
            }
            await tx.run('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
            return { transferredTo };
        });
    },

    async updateMemberRole(groupId, userId, role) {
        await db.run('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?', [role, groupId, userId]);
    },

    async getOldestMember(groupId, excludeUserId = null) {
        const params = [groupId];
        let query = 'SELECT user_id FROM group_members WHERE group_id = ?';
        if (excludeUserId !== null) {
            query += ' AND user_id <> ?';
            params.push(excludeUserId);
        }
        query += ' ORDER BY joined_at ASC, group_member_id ASC LIMIT 1';
        const rows = await db.all(query, params);
        return rows[0];
    },

    async deleteGroup(groupId) {
        await db.run('DELETE FROM `groups` WHERE group_id = ?', [groupId]);
    },

    async getSettings(groupId) {
        const rows = await db.all('SELECT meal_cutoff_time, allow_direct_join FROM group_settings WHERE group_id = ?', [groupId]);
        return rows[0];
    },

    async updateSettings(groupId, mealCutoffTime, allowDirectJoin) {
        const existing = await db.get('SELECT group_id FROM group_settings WHERE group_id = ?', [groupId]);
        if (existing) {
            await db.run('UPDATE group_settings SET meal_cutoff_time = ?, allow_direct_join = ? WHERE group_id = ?',
                [mealCutoffTime, allowDirectJoin, groupId]);
        } else {
            await db.run('INSERT INTO group_settings (group_id, meal_cutoff_time, allow_direct_join) VALUES (?, ?, ?)',
                [groupId, mealCutoffTime, allowDirectJoin]);
        }
    },
    
    async createJoinRequest(groupId, userId) {
        const result = await db.run(
            'INSERT INTO join_requests (group_id, user_id, status) VALUES (?, ?, ?)',
            [groupId, userId, 'pending']
        );
        return result.lastID;
    },
    
    async getPendingJoinRequests(groupId) {
        return await db.all(`
            SELECT jr.request_id, jr.group_id, jr.user_id, jr.status, jr.created_at, u.name as user_name, u.email as user_email
            FROM join_requests jr
            JOIN users u ON jr.user_id = u.user_id
            WHERE jr.group_id = ? AND jr.status = 'pending'
            ORDER BY jr.created_at DESC
        `, [groupId]);
    },
    
    async getJoinRequestById(requestId) {
        const rows = await db.all('SELECT * FROM join_requests WHERE request_id = ?', [requestId]);
        return rows[0];
    },
    
    async updateJoinRequestStatus(requestId, status) {
        await db.run('UPDATE join_requests SET status = ? WHERE request_id = ?', [status, requestId]);
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
