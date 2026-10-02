const prisma = require('../config/prisma');
const { number, dateOnly, timestamp } = require('../utils/prismaFormat');

const PaymentModel = {
    async getPaymentsByGroup(groupId) {
        const payments = await prisma.payment.findMany({
            where: { groupId: Number(groupId) },
            include: { paidBy: true, paidTo: true },
            orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }]
        });
        return payments.map(payment => ({
            payment_id: payment.paymentId,
            amount: number(payment.amount),
            payment_mode: payment.paymentMode,
            note: payment.note,
            payment_date: dateOnly(payment.paymentDate),
            status: payment.status,
            created_at: timestamp(payment.createdAt),
            paid_by: payment.paidById,
            paid_by_name: payment.paidBy.name,
            paid_to: payment.paidToId,
            paid_to_name: payment.paidTo.name
        }));
    },

    async getPaymentById(paymentId) {
        const payment = await prisma.payment.findUnique({ where: { paymentId: Number(paymentId) } });
        return payment && { ...payment, payment_id: payment.paymentId, paid_by: payment.paidById, paid_to: payment.paidToId, amount: number(payment.amount), payment_date: dateOnly(payment.paymentDate) };
    },

    async addPayment(groupId, paidBy, paidTo, amount, paymentMode, note, paymentDate) {
        const payment = await prisma.payment.create({ data: { groupId: Number(groupId), paidById: Number(paidBy), paidToId: Number(paidTo), amount, paymentMode, note: note || null, paymentDate: new Date(`${paymentDate}T00:00:00.000Z`), status: 'pending' } });
        return payment.paymentId;
    },

    async updatePaymentStatus(paymentId, status) {
        await prisma.payment.update({ where: { paymentId: Number(paymentId) }, data: { status } });
    },

    async deletePayment(paymentId) {
        await prisma.payment.delete({ where: { paymentId: Number(paymentId) } });
    }
};

module.exports = PaymentModel;
