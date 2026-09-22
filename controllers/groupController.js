const GroupModel = require('../models/groupModel');
const UserModel = require('../models/userModel');
const ActivityLogModel = require('../models/activityLogModel');
const { isValidTime } = require('../utils/validation');
const crypto = require('crypto');

function generateGroupCode() {
    return crypto.randomBytes(5).toString('hex').slice(0, 8).toUpperCase();
}

function parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    return String(value).toLowerCase() === 'true' || String(value) === '1';
}

const groupController = {
    async getUserGroups(req, res) {
        try {
            const groups = await GroupModel.getUserGroups(req.session.userId);
            res.json({ success: true, data: groups.map(group => ({
                id: group.group_id,
                group_id: group.group_id,
                name: group.group_name,
                group_name: group.group_name,
                group_code: group.group_code,
                member_count: group.member_count,
                role: group.role
            })) });
        } catch (error) {
            console.error('Get user groups error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async getGroupDetails(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session.userId;
            if (!await GroupModel.isMember(id, userId)) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            const group = await GroupModel.getGroupById(id);
            if (!group) return res.status(404).json({ success: false, message: 'GROUP_NOT_FOUND' });
            const members = await GroupModel.getGroupMembers(id);
            const settings = await GroupModel.getSettings(id);

            res.json({ success: true, data: {
                group_id: group.group_id,
                name: group.group_name,
                group_name: group.group_name,
                join_code: group.group_code,
                group_code: group.group_code,
                member_count: members.length,
                members,
                allow_direct_join: settings ? Number(settings.allow_direct_join) === 1 : true,
                meal_cutoff_time: settings ? settings.meal_cutoff_time : '10:00:00'
            } });
        } catch (error) {
            console.error('Get group details error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async createGroup(req, res) {
        try {
            const name = String(req.body.name || req.body.group_name || '').trim();
            if (name.length < 2 || name.length > 100) {
                return res.status(400).json({ success: false, message: 'Group name must be between 2 and 100 characters' });
            }

            let groupId;
            let code;
            for (let attempt = 0; attempt < 5; attempt++) {
                code = generateGroupCode();
                try {
                    groupId = await GroupModel.createGroup(name, code, req.session.userId);
                    break;
                } catch (error) {
                    if (!String(error.code).includes('DUP')) throw error;
                }
            }
            if (!groupId) return res.status(500).json({ success: false, message: 'Could not generate a unique group code' });

            await ActivityLogModel.create(groupId, req.session.userId, 'CREATE_GROUP', `Created group ${name}`);
            res.status(201).json({ success: true, data: {
                group_id: groupId, group_code: code, group_name: name, name
            } });
        } catch (error) {
            console.error('Create group error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async joinGroup(req, res) {
        try {
            const code = String(req.body.code || req.body.group_code || '').trim().toUpperCase();
            if (!/^[A-Z0-9]{6,10}$/.test(code)) {
                return res.status(400).json({ success: false, message: 'INVALID_GROUP_CODE' });
            }

            const group = await GroupModel.getGroupByCode(code);
            if (!group) return res.status(404).json({ success: false, message: 'GROUP_NOT_FOUND' });
            const userId = req.session.userId;
            if (await GroupModel.isMember(group.group_id, userId)) {
                return res.status(409).json({ success: false, message: 'ALREADY_A_MEMBER' });
            }

            const settings = await GroupModel.getSettings(group.group_id);
            if (settings && !Boolean(settings.allow_direct_join)) {
                const requests = await GroupModel.getPendingJoinRequests(group.group_id);
                if (requests.some(request => Number(request.user_id) === Number(userId))) {
                    return res.status(409).json({ success: false, message: 'Join request already pending' });
                }
                await GroupModel.createJoinRequest(group.group_id, userId);
                return res.json({ success: true, pending: true, message: 'Join request sent to admin' });
            }

            await GroupModel.addMember(group.group_id, userId);
            await ActivityLogModel.create(group.group_id, userId, 'JOIN_GROUP', 'Joined the group using an invite code');
            res.json({ success: true, data: { group_id: group.group_id, group_name: group.group_name } });
        } catch (error) {
            console.error('Join group error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async getJoinRequests(req, res) {
        try {
            const { id } = req.params;
            const membership = await GroupModel.isMember(id, req.session.userId);
            if (!membership) return res.status(404).json({ success: false, message: 'GROUP_NOT_FOUND' });
            if (membership.role !== 'admin') return res.status(403).json({ success: false, message: 'NOT_ADMIN' });
            res.json({ success: true, data: await GroupModel.getPendingJoinRequests(id) });
        } catch (error) {
            console.error('Get join requests error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async updateJoinRequest(req, res) {
        try {
            const { id, reqId } = req.params;
            const membership = await GroupModel.isMember(id, req.session.userId);
            if (!membership || membership.role !== 'admin') return res.status(403).json({ success: false, message: 'NOT_ADMIN' });
            const status = String(req.body.status || '').toLowerCase();
            if (!['approved', 'rejected'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
            }
            const request = await GroupModel.getJoinRequestById(reqId);
            if (!request || Number(request.group_id) !== Number(id)) return res.status(404).json({ success: false, message: 'JOIN_REQUEST_NOT_FOUND' });
            if (request.status !== 'pending') return res.status(409).json({ success: false, message: 'Request already processed' });

            await GroupModel.updateJoinRequestStatus(reqId, status);
            if (status === 'approved') {
                if (!await GroupModel.isMember(id, request.user_id)) await GroupModel.addMember(id, request.user_id);
                await ActivityLogModel.create(id, request.user_id, 'JOIN_GROUP', 'Joined the group via admin approval');
            }
            res.json({ success: true, message: `Request ${status}` });
        } catch (error) {
            console.error('Update join request error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async getSettings(req, res) {
        try {
            const membership = await GroupModel.isMember(req.params.id, req.session.userId);
            if (!membership) return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            const settings = await GroupModel.getSettings(req.params.id);
            res.json({ success: true, data: settings ? {
                ...settings,
                allow_direct_join: Number(settings.allow_direct_join) === 1
            } : { meal_cutoff_time: '10:00:00', allow_direct_join: true } });
        } catch (error) {
            console.error('Get settings error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async updateSettings(req, res) {
        try {
            const { id } = req.params;
            const membership = await GroupModel.isMember(id, req.session.userId);
            if (!membership) return res.status(404).json({ success: false, message: 'GROUP_NOT_FOUND' });
            if (membership.role !== 'admin') return res.status(403).json({ success: false, message: 'NOT_ADMIN' });

            const current = await GroupModel.getSettings(id) || { meal_cutoff_time: '10:00:00', allow_direct_join: 1 };
            const cutoff = req.body.meal_cutoff_time === undefined
                ? current.meal_cutoff_time
                : String(req.body.meal_cutoff_time);
            if (!isValidTime(cutoff)) return res.status(400).json({ success: false, message: 'INVALID_TIME_FORMAT' });
            const allowDirectJoin = req.body.allow_direct_join === undefined
                ? Number(current.allow_direct_join) === 1
                : parseBoolean(req.body.allow_direct_join);
            await GroupModel.updateSettings(id, cutoff.length === 5 ? `${cutoff}:00` : cutoff, allowDirectJoin ? 1 : 0);
            res.json({ success: true, data: { meal_cutoff_time: cutoff, allow_direct_join: allowDirectJoin } });
        } catch (error) {
            console.error('Update settings error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async getMembers(req, res) {
        try {
            const groupId = req.params.id || req.query.group_id;
            if (!groupId) return res.status(400).json({ success: false, message: 'group_id is required' });
            if (!await GroupModel.isMember(groupId, req.session.userId)) return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            res.json({ success: true, data: await GroupModel.getGroupMembers(groupId) });
        } catch (error) {
            console.error('Get members error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async addMemberDirectly(req, res) {
        try {
            const { group_id, email } = req.body;
            const membership = await GroupModel.isMember(group_id, req.session.userId);
            if (!membership || membership.role !== 'admin') return res.status(403).json({ success: false, message: 'NOT_ADMIN' });
            const user = await UserModel.findByEmail(email);
            if (!user) return res.status(404).json({ success: false, message: 'User not found. They must register first.' });
            if (await GroupModel.isMember(group_id, user.user_id)) return res.status(409).json({ success: false, message: 'ALREADY_A_MEMBER' });
            const role = req.body.role === 'admin' ? 'admin' : 'member';
            await GroupModel.addMember(group_id, user.user_id, role);
            await ActivityLogModel.create(group_id, req.session.userId, 'ADD_MEMBER', `Added ${user.name} to the group`);
            res.json({ success: true, message: 'Member added successfully' });
        } catch (error) {
            console.error('Add member error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async removeMember(req, res) {
        try {
            const groupId = req.params.id || req.body.group_id;
            const targetUserId = req.params.userId || req.body.user_id;
            const membership = await GroupModel.isMember(groupId, req.session.userId);
            if (!membership || membership.role !== 'admin') return res.status(403).json({ success: false, message: 'NOT_ADMIN' });
            const target = await GroupModel.isMember(groupId, targetUserId);
            if (!target) return res.status(404).json({ success: false, message: 'MEMBER_NOT_FOUND' });
            if (Number(targetUserId) === Number(req.session.userId)) return res.status(400).json({ success: false, message: 'Cannot remove yourself' });
            if (target.role === 'admin') {
                const members = await GroupModel.getGroupMembers(groupId);
                if (members.filter(member => member.role === 'admin').length <= 1) return res.status(409).json({ success: false, message: 'Cannot remove the only admin' });
            }
            await GroupModel.removeMember(groupId, targetUserId);
            await ActivityLogModel.create(groupId, req.session.userId, 'REMOVE_MEMBER', 'Removed a member from the group');
            res.json({ success: true, message: 'Member removed successfully' });
        } catch (error) {
            console.error('Remove member error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async leaveGroup(req, res) {
        try {
            const groupId = req.params.id;
            const result = await GroupModel.leaveGroup(groupId, req.session.userId);
            await ActivityLogModel.create(groupId, req.session.userId, 'LEAVE_GROUP', 'Left the group');
            res.json({ success: true, message: 'Left group successfully.', transferred_to: result.transferredTo || null });
        } catch (error) {
            if (error.code === 'CANNOT_LEAVE_LAST_MEMBER') return res.status(409).json({ success: false, message: error.code });
            if (error.code === 'NOT_A_MEMBER') return res.status(403).json({ success: false, message: error.code });
            console.error('Leave group error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async deleteGroup(req, res) {
        try {
            const groupId = req.params.id;
            const membership = await GroupModel.isMember(groupId, req.session.userId);
            if (!membership) return res.status(404).json({ success: false, message: 'GROUP_NOT_FOUND' });
            if (membership.role !== 'admin') return res.status(403).json({ success: false, message: 'NOT_ADMIN' });
            const members = await GroupModel.getGroupMembers(groupId);
            if (members.length !== 1) return res.status(409).json({ success: false, message: 'GROUP_NOT_EMPTY' });
            await GroupModel.deleteGroup(groupId);
            res.json({ success: true, message: 'Group deleted successfully.' });
        } catch (error) {
            console.error('Delete group error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async getLogs(req, res) {
        try {
            const groupId = req.query.group_id || req.params.id;
            if (!groupId) return res.status(400).json({ success: false, message: 'group_id is required' });
            if (!await GroupModel.isMember(groupId, req.session.userId)) return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            res.json({ success: true, data: await ActivityLogModel.getByGroupId(groupId, 50) });
        } catch (error) {
            console.error('Get logs error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = groupController;
