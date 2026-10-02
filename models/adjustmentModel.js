const prisma = require('../config/prisma');
const { number, timestamp } = require('../utils/prismaFormat');

const AdjustmentModel = {
    async getAdjustmentsByGroup(groupId) {
        const adjustments = await prisma.adjustment.findMany({
            where: { groupId: Number(groupId) },
            include: { fromUser: true, toUser: true, createdBy: true },
            orderBy: { createdAt: 'desc' }
        });
        return adjustments.map(adjustment => ({
            adjustment_id: adjustment.adjustmentId,
            amount: number(adjustment.amount),
            reason: adjustment.reason,
            created_at: timestamp(adjustment.createdAt),
            from_user: adjustment.fromUserId,
            from_user_name: adjustment.fromUser.name,
            to_user: adjustment.toUserId,
            to_user_name: adjustment.toUser.name,
            created_by: adjustment.createdById,
            created_by_name: adjustment.createdBy.name
        }));
    },

    async getAdjustmentById(adjustmentId) {
        const adjustment = await prisma.adjustment.findUnique({ where: { adjustmentId: Number(adjustmentId) } });
        return adjustment && { ...adjustment, adjustment_id: adjustment.adjustmentId, group_id: adjustment.groupId, from_user: adjustment.fromUserId, to_user: adjustment.toUserId, created_by: adjustment.createdById, amount: number(adjustment.amount) };
    },

    async addAdjustment(groupId, fromUser, toUser, amount, reason, createdBy) {
        const adjustment = await prisma.adjustment.create({ data: { groupId: Number(groupId), fromUserId: Number(fromUser), toUserId: Number(toUser), amount, reason, createdById: Number(createdBy) } });
        return adjustment.adjustmentId;
    },

    async deleteAdjustment(adjustmentId) {
        await prisma.adjustment.delete({ where: { adjustmentId: Number(adjustmentId) } });
    }
};

module.exports = AdjustmentModel;
