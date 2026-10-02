const prisma = require('../config/prisma');
const { number, timestamp } = require('../utils/prismaFormat');
const { canManage } = require('../utils/roles');

function groupRow(group) {
    return group && {
        group_id: group.groupId,
        group_name: group.groupName,
        group_code: group.groupCode,
        created_by: group.createdById,
        created_at: timestamp(group.createdAt)
    };
}

const GroupModel = {
    async createGroup(groupName, groupCode, userId) {
        return prisma.$transaction(async tx => {
            const group = await tx.group.create({
                data: {
                    groupName,
                    groupCode,
                    createdById: Number(userId),
                    members: { create: { userId: Number(userId), role: 'admin' } },
                    settings: { create: {} }
                }
            });
            return group.groupId;
        });
    },

    async getUserGroups(userId) {
        const memberships = await prisma.groupMember.findMany({
            where: { userId: Number(userId) },
            include: { group: { include: { _count: { select: { members: true } } } } }
        });
        return memberships.map(membership => ({
            group_id: membership.group.groupId,
            group_name: membership.group.groupName,
            group_code: membership.group.groupCode,
            role: membership.role,
            member_count: membership.group._count.members
        }));
    },

    async getGroupById(groupId) {
        return groupRow(await prisma.group.findUnique({ where: { groupId: Number(groupId) } }));
    },

    async getGroupByCode(groupCode) {
        const group = await prisma.group.findFirst({
            where: { groupCode: { equals: groupCode, mode: 'insensitive' } }
        });
        return group && { group_id: group.groupId, group_name: group.groupName, group_code: group.groupCode };
    },

    async getGroupMembers(groupId) {
        const members = await prisma.groupMember.findMany({
            where: { groupId: Number(groupId) },
            include: { user: true },
            orderBy: { joinedAt: 'asc' }
        });
        return members.map(member => ({
            user_id: member.user.userId,
            name: member.user.name,
            email: member.user.email,
            phone: member.user.phone,
            upi_id: member.user.upiId,
            role: member.role,
            joined_at: timestamp(member.joinedAt)
        }));
    },

    async isMember(groupId, userId) {
        const member = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId: Number(groupId), userId: Number(userId) } }
        });
        return member ? { role: member.role } : undefined;
    },

    async addMember(groupId, userId, role = 'member') {
        await prisma.groupMember.create({ data: { groupId: Number(groupId), userId: Number(userId), role } });
    },

    async removeMember(groupId, userId) {
        await prisma.groupMember.delete({
            where: { groupId_userId: { groupId: Number(groupId), userId: Number(userId) } }
        });
    },

    async leaveGroup(groupId, userId) {
        return prisma.$transaction(async tx => {
            const members = await tx.groupMember.findMany({
                where: { groupId: Number(groupId) },
                orderBy: [{ joinedAt: 'asc' }, { groupMemberId: 'asc' }]
            });
            const member = members.find(item => item.userId === Number(userId));
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
            if (canManage(member.role) && !members.some(item => item.userId !== Number(userId) && canManage(item.role))) {
                const replacement = members.find(item => item.userId !== Number(userId));
                await tx.groupMember.update({
                    where: { groupId_userId: { groupId: Number(groupId), userId: replacement.userId } },
                    data: { role: 'admin' }
                });
                transferredTo = replacement.userId;
            }
            await tx.groupMember.delete({
                where: { groupId_userId: { groupId: Number(groupId), userId: Number(userId) } }
            });
            return { transferredTo };
        });
    },

    async updateMemberRole(groupId, userId, role) {
        await prisma.groupMember.update({
            where: { groupId_userId: { groupId: Number(groupId), userId: Number(userId) } },
            data: { role }
        });
    },

    async getOldestMember(groupId, excludeUserId = null) {
        const member = await prisma.groupMember.findFirst({
            where: { groupId: Number(groupId), ...(excludeUserId === null ? {} : { userId: { not: Number(excludeUserId) } }) },
            orderBy: [{ joinedAt: 'asc' }, { groupMemberId: 'asc' }]
        });
        return member && { user_id: member.userId };
    },

    async deleteGroup(groupId) {
        await prisma.group.delete({ where: { groupId: Number(groupId) } });
    },

    async getSettings(groupId) {
        const settings = await prisma.groupSettings.findUnique({ where: { groupId: Number(groupId) } });
        return settings && {
            group_id: settings.groupId,
            meal_cutoff_time: settings.mealCutoffTime,
            allow_direct_join: settings.allowDirectJoin
        };
    },

    async updateSettings(groupId, mealCutoffTime, allowDirectJoin) {
        await prisma.groupSettings.upsert({
            where: { groupId: Number(groupId) },
            create: { groupId: Number(groupId), mealCutoffTime, allowDirectJoin: Boolean(allowDirectJoin) },
            update: { mealCutoffTime, allowDirectJoin: Boolean(allowDirectJoin) }
        });
    },

    async createJoinRequest(groupId, userId) {
        const request = await prisma.joinRequest.create({ data: { groupId: Number(groupId), userId: Number(userId), status: 'pending' } });
        return request.requestId;
    },

    async getPendingJoinRequests(groupId) {
        const requests = await prisma.joinRequest.findMany({
            where: { groupId: Number(groupId), status: 'pending' },
            include: { user: true },
            orderBy: { createdAt: 'desc' }
        });
        return requests.map(request => ({
            request_id: request.requestId,
            group_id: request.groupId,
            user_id: request.userId,
            status: request.status,
            created_at: timestamp(request.createdAt),
            user_name: request.user.name,
            user_email: request.user.email
        }));
    },

    async getJoinRequestById(requestId) {
        const request = await prisma.joinRequest.findUnique({ where: { requestId: Number(requestId) } });
        return request && {
            request_id: request.requestId,
            group_id: request.groupId,
            user_id: request.userId,
            status: request.status,
            created_at: timestamp(request.createdAt)
        };
    },

    async updateJoinRequestStatus(requestId, status) {
        await prisma.joinRequest.update({ where: { requestId: Number(requestId) }, data: { status } });
    },

    async assignNewAdmin(groupId) {
        const member = await prisma.groupMember.findFirst({ where: { groupId: Number(groupId) }, orderBy: { joinedAt: 'asc' } });
        if (member) await this.updateMemberRole(groupId, member.userId, 'admin');
    },

    async updateBudget(groupId, userId, budget) {
        await prisma.groupMember.update({
            where: { groupId_userId: { groupId: Number(groupId), userId: Number(userId) } },
            data: { monthlyBudget: budget }
        });
    }
};

module.exports = GroupModel;
