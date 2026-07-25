const GroupModel = require('../models/groupModel');
const ActivityLogModel = require('../models/activityLogModel');

// Helper to generate a random group code
function generateGroupCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const groupController = {
    async getUserGroups(req, res) {
        try {
            const userId = req.session.userId;
            const groups = await GroupModel.getUserGroups(userId);
            // We map group_id to id so it matches what navbar.js expects
            const mappedGroups = groups.map(g => ({
                id: g.group_id,
                name: g.group_name,
                role: g.role
            }));
            res.json({ success: true, data: mappedGroups });
        } catch (error) {
            console.error('Get user groups error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async getGroupDetails(req, res) {
        try {
            const groupId = req.params.id;
            const userId = req.session.userId;

            const isMember = await GroupModel.isMember(groupId, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            const group = await GroupModel.getGroupById(groupId);
            if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

            const members = await GroupModel.getGroupMembers(groupId);
            const settings = await GroupModel.getSettings(groupId);
            
            res.json({ 
                success: true, 
                data: {
                    group_id: group.group_id,
                    name: group.group_name,
                    join_code: group.group_code,
                    members: members,
                    allow_direct_join: settings ? settings.allow_direct_join : 1
                }
            });
        } catch (error) {
            console.error('Get group details error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

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
            
            const settings = await GroupModel.getSettings(group.group_id);
            const allowDirectJoin = settings ? settings.allow_direct_join : 1;
            
            if (allowDirectJoin) {
                await GroupModel.addMember(group.group_id, userId);
                await ActivityLogModel.create(group.group_id, userId, 'join_group', 'Joined the group using invite code');
                res.json({ success: true, message: 'Successfully joined group', data: { group_id: group.group_id } });
            } else {
                // Check if already a pending request
                const existingRequests = await GroupModel.getPendingJoinRequests(group.group_id);
                if (existingRequests.find(r => r.user_id === userId)) {
                    return res.status(400).json({ success: false, message: 'Join request already pending' });
                }
                await GroupModel.createJoinRequest(group.group_id, userId);
                res.json({ success: true, message: 'Join request sent to admin', pending: true });
            }
        } catch (error) {
            console.error('Join group error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },
    
    async getJoinRequests(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session.userId;
            
            const roleInfo = await GroupModel.isMember(id, userId);
            if (!roleInfo || roleInfo.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Admin access required' });
            }
            
            const requests = await GroupModel.getPendingJoinRequests(id);
            res.json({ success: true, data: requests });
        } catch (error) {
            console.error('Get join requests error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },
    
    async updateJoinRequest(req, res) {
        try {
            const { id, reqId } = req.params;
            const { status } = req.body; // 'approved' or 'rejected'
            const userId = req.session.userId;
            
            const roleInfo = await GroupModel.isMember(id, userId);
            if (!roleInfo || roleInfo.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Admin access required' });
            }
            
            const request = await GroupModel.getJoinRequestById(reqId);
            if (!request || request.group_id != id) {
                return res.status(404).json({ success: false, message: 'Join request not found' });
            }
            
            if (request.status !== 'pending') {
                return res.status(400).json({ success: false, message: 'Request already processed' });
            }
            
            await GroupModel.updateJoinRequestStatus(reqId, status);
            
            if (status === 'approved') {
                await GroupModel.addMember(id, request.user_id);
                await ActivityLogModel.create(id, request.user_id, 'join_group', 'Joined the group via admin approval');
            }
            
            res.json({ success: true, message: `Request ${status}` });
        } catch (error) {
            console.error('Update join request error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },
    
    async updateSettings(req, res) {
        try {
            const { id } = req.params;
            const { allow_direct_join, meal_cutoff_time } = req.body;
            const userId = req.session.userId;
            
            const roleInfo = await GroupModel.isMember(id, userId);
            if (!roleInfo || roleInfo.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Admin access required' });
            }
            
            const currentSettings = await GroupModel.getSettings(id) || { meal_cutoff_time: '10:00', allow_direct_join: 1 };
            
            const newAllowDirectJoin = allow_direct_join !== undefined ? (allow_direct_join ? 1 : 0) : currentSettings.allow_direct_join;
            const newMealCutoffTime = meal_cutoff_time !== undefined ? meal_cutoff_time : currentSettings.meal_cutoff_time;
            
            await GroupModel.updateSettings(id, newMealCutoffTime, newAllowDirectJoin);
            
            res.json({ success: true, message: 'Settings updated' });
        } catch (error) {
            console.error('Update settings error:', error);
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
