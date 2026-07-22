const GroupModel = require('../models/groupModel');

function generateGroupCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const groupController = {
    async createGroup(req, res) {
        try {
            const { group_name } = req.body;
            const userId = req.session.userId;
            
            if (!group_name || group_name.length < 2 || group_name.length > 100) {
                return res.status(400).json({ success: false, message: 'Invalid group name' });
            }

            const group_code = generateGroupCode();
            const groupId = await GroupModel.createGroup(group_name, group_code, userId);

            res.status(201).json({
                success: true,
                data: { group_id: groupId, group_name, group_code }
            });
        } catch (error) {
            console.error('Create group error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async getUserGroups(req, res) {
        try {
            const userId = req.session.userId;
            const groups = await GroupModel.getUserGroups(userId);
            res.json({ success: true, data: groups });
        } catch (error) {
            console.error('Get user groups error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async getGroupDetails(req, res) {
        try {
            const groupId = req.params.id;
            const userId = req.session.userId;
            
            const memberInfo = await GroupModel.isMember(groupId, userId);
            if (!memberInfo) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            const group = await GroupModel.getGroupById(groupId);
            if (!group) {
                return res.status(404).json({ success: false, message: 'GROUP_NOT_FOUND' });
            }

            const members = await GroupModel.getGroupMembers(groupId);
            group.member_count = members.length;
            group.members = members;

            res.json({ success: true, data: group });
        } catch (error) {
            console.error('Get group details error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async joinGroup(req, res) {
        try {
            const { group_code } = req.body;
            const userId = req.session.userId;
            
            if (!group_code) {
                return res.status(400).json({ success: false, message: 'Group code required' });
            }

            const group = await GroupModel.getGroupByCode(group_code.toUpperCase());
            if (!group) {
                return res.status(404).json({ success: false, message: 'GROUP_NOT_FOUND' });
            }

            const memberInfo = await GroupModel.isMember(group.group_id, userId);
            if (memberInfo) {
                return res.status(409).json({ success: false, message: 'ALREADY_A_MEMBER' });
            }

            await GroupModel.addMember(group.group_id, userId, 'member');

            res.json({
                success: true,
                data: { group_id: group.group_id, group_name: group.group_name }
            });
        } catch (error) {
            console.error('Join group error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async deleteGroup(req, res) {
        try {
            const groupId = req.params.id;
            const userId = req.session.userId;
            
            const memberInfo = await GroupModel.isMember(groupId, userId);
            if (!memberInfo) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            if (memberInfo.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'NOT_ADMIN' });
            }

            const members = await GroupModel.getGroupMembers(groupId);
            if (members.length > 1) {
                return res.status(400).json({ success: false, message: 'GROUP_NOT_EMPTY' });
            }

            await GroupModel.deleteGroup(groupId);
            res.json({ success: true, message: 'Group deleted successfully.' });
        } catch (error) {
            console.error('Delete group error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async getMembers(req, res) {
        try {
            const groupId = req.params.id;
            const userId = req.session.userId;
            
            const memberInfo = await GroupModel.isMember(groupId, userId);
            if (!memberInfo) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            const members = await GroupModel.getGroupMembers(groupId);
            res.json({ success: true, data: members });
        } catch (error) {
            console.error('Get members error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async removeMember(req, res) {
        try {
            const groupId = req.params.id;
            const targetUserId = req.params.userId;
            const userId = req.session.userId;
            
            const adminInfo = await GroupModel.isMember(groupId, userId);
            if (!adminInfo || adminInfo.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'NOT_ADMIN' });
            }

            if (userId == targetUserId) {
                return res.status(400).json({ success: false, message: 'Use leave group endpoint' });
            }

            const members = await GroupModel.getGroupMembers(groupId);
            if (members.length === 1) {
                return res.status(400).json({ success: false, message: 'CANNOT_REMOVE_LAST_MEMBER' });
            }

            const targetMemberInfo = await GroupModel.isMember(groupId, targetUserId);
            if (!targetMemberInfo) {
                return res.status(404).json({ success: false, message: 'MEMBER_NOT_FOUND' });
            }

            await GroupModel.removeMember(groupId, targetUserId);
            res.json({ success: true, message: 'Member removed successfully.' });
        } catch (error) {
            console.error('Remove member error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async leaveGroup(req, res) {
        try {
            const groupId = req.params.id;
            const userId = req.session.userId;
            
            const memberInfo = await GroupModel.isMember(groupId, userId);
            if (!memberInfo) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            const members = await GroupModel.getGroupMembers(groupId);
            if (members.length === 1) {
                return res.status(409).json({ success: false, message: 'CANNOT_LEAVE_LAST_MEMBER' });
            }

            await GroupModel.removeMember(groupId, userId);

            // Re-assign admin if the leaving member was the only admin
            const remainingAdmins = members.filter(m => m.role === 'admin' && m.user_id !== userId);
            if (memberInfo.role === 'admin' && remainingAdmins.length === 0) {
                await GroupModel.assignNewAdmin(groupId);
            }

            res.json({ success: true, message: 'Left group successfully.' });
        } catch (error) {
            console.error('Leave group error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async getSettings(req, res) {
        try {
            const groupId = req.params.id;
            const userId = req.session.userId;
            
            const memberInfo = await GroupModel.isMember(groupId, userId);
            if (!memberInfo) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            const settings = await GroupModel.getSettings(groupId);
            if (!settings) {
                return res.status(404).json({ success: false, message: 'GROUP_NOT_FOUND' });
            }

            res.json({ success: true, data: settings });
        } catch (error) {
            console.error('Get settings error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async updateSettings(req, res) {
        try {
            const groupId = req.params.id;
            const userId = req.session.userId;
            const { meal_cutoff_time } = req.body;
            
            const memberInfo = await GroupModel.isMember(groupId, userId);
            if (!memberInfo || memberInfo.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'NOT_ADMIN' });
            }

            if (!meal_cutoff_time || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(meal_cutoff_time)) {
                return res.status(400).json({ success: false, message: 'INVALID_TIME_FORMAT' });
            }

            await GroupModel.updateSettings(groupId, meal_cutoff_time);
            res.json({ success: true, data: { meal_cutoff_time } });
        } catch (error) {
            console.error('Update settings error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async updateBudget(req, res) {
        try {
            const groupId = req.params.id;
            const userId = req.session.userId;
            const { monthly_budget } = req.body;
            
            const memberInfo = await GroupModel.isMember(groupId, userId);
            if (!memberInfo) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            if (monthly_budget === undefined || isNaN(monthly_budget) || monthly_budget < 0) {
                return res.status(400).json({ success: false, message: 'INVALID_BUDGET' });
            }

            await GroupModel.updateBudget(groupId, userId, monthly_budget);
            res.json({ success: true, data: { monthly_budget } });
        } catch (error) {
            console.error('Update budget error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = groupController;
