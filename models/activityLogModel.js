const prisma = require('../config/prisma');
const { timestamp } = require('../utils/prismaFormat');

class ActivityLogModel {
    static async create(groupId, userId, action, description) {
        const log = await prisma.activityLog.create({ data: { groupId: Number(groupId), userId: userId ? Number(userId) : null, action, description } });
        return log.logId;
    }

    static async getByGroupId(groupId, limit = 20) {
        const logs = await prisma.activityLog.findMany({ where: { groupId: Number(groupId) }, include: { user: true }, orderBy: { createdAt: 'desc' }, take: Number(limit) });
        return logs.map(log => ({ log_id: log.logId, group_id: log.groupId, user_id: log.userId, action: log.action, description: log.description, created_at: timestamp(log.createdAt), user_name: log.user ? log.user.name : null }));
    }
}

module.exports = ActivityLogModel;
