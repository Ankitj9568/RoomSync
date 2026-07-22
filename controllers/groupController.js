const GroupModel = require('../models/groupModel');
const ActivityLogModel = require('../models/activityLogModel');

// Helper to generate a random group code
function generateGroupCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const groupController = {
    async createGroup(req, res) {
        try {
            const { name } = req.body;
            const userId = req.session.userId;
            
            if (!name) {
                return res.status(400).json({ success: false, message: 'Group name is required' });
            }

            const code = generateGroupCode();
            const groupId = await GroupModel.createGroup(name, code, userId);

            await ActivityLogModel.create(groupId, userId, 'create_group', `Created group ${name}`);

            res.status(201).json({ success: true, data: { group_id: groupId, group_code: code, group_name: name } });
        } catch (error) {
            console.error('Create group error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async joinGroup(req, res) {
        try {
            const { code } = req.body;
            const userId = req.session.userId;

            if (!code) {
                return res.status(400).json({ success: false, message: 'Group code is required' });
            }

            const group = await GroupModel.getGroupByCode(code);
            if (!group) {
                return res.status(404).json({ success: false, message: 'Invalid group code' });
            }

            const isMember = await GroupModel.isMember(group.group_id, userId);
            if (isMember) {
                return res.status(400).json({ success: false, message: 'Already a member of this group' });
            }

            await GroupModel.addMember(group.group_id, userId);
            await ActivityLogModel.create(group.group_id, userId, 'join_group', 'Joined the group using invite code');

            res.json({ success: true, message: 'Successfully joined group' });
        } catch (error) {
            console.error('Join group error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async getMembers(req, res) {
        try {
            const { group_id } = req.query;
            const userId = req.session.userId;

            if (!group_id) {
                return res.status(400).json({ success: false, message: 'Group ID is required' });
            }

            const isMember = await GroupModel.isMember(group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            const members = await GroupModel.getGroupMembers(group_id);
            res.json({ success: true, data: members });
        } catch (error) {
            console.error('Get members error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async addMemberDirectly(req, res) {
        try {
            const { group_id, email, role } = req.body;
            const currentUserId = req.session.userId;

            const isMember = await GroupModel.isMember(group_id, currentUserId);
            if (!isMember || isMember.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Admin privileges required' });
            }

            const UserModel = require('../models/userModel');
            const userToAdd = await UserModel.findByEmail(email);

            if (!userToAdd) {
                return res.status(404).json({ success: false, message: 'User not found. They must register first.' });
            }

            const alreadyMember = await GroupModel.isMember(group_id, userToAdd.user_id);
            if (alreadyMember) {
                return res.status(400).json({ success: false, message: 'User is already a member' });
            }

            await GroupModel.addMember(group_id, userToAdd.user_id, role || 'member');
            await ActivityLogModel.create(group_id, currentUserId, 'add_member', `Added ${userToAdd.name} to the group`);

            res.json({ success: true, message: 'Member added successfully' });
        } catch (error) {
            console.error('Add member error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async removeMember(req, res) {
        try {
            const { group_id, user_id } = req.body;
            const currentUserId = req.session.userId;

            const isMember = await GroupModel.isMember(group_id, currentUserId);
            if (!isMember || isMember.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Admin privileges required' });
            }
            
            if (user_id == currentUserId) {
                return res.status(400).json({ success: false, message: 'Cannot remove yourself using this method' });
            }

            await GroupModel.removeMember(group_id, user_id);
            await ActivityLogModel.create(group_id, currentUserId, 'remove_member', `Removed a member from the group`);

            res.json({ success: true, message: 'Member removed successfully' });
        } catch (error) {
            console.error('Remove member error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async getLogs(req, res) {
        try {
            const { group_id } = req.query;
            const userId = req.session.userId;

            if (!group_id) {
                return res.status(400).json({ success: false, message: 'Group ID is required' });
            }

            const isMember = await GroupModel.isMember(group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            const logs = await ActivityLogModel.getByGroupId(group_id, 50);
            res.json({ success: true, data: logs });
        } catch (error) {
            console.error('Get logs error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = groupController;
