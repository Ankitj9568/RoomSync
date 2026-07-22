const db = require('../config/db');

const PaymentModel = {
    async getPaymentsByGroup(groupId) {
        const rows = await db.all(`
            SELECT p.payment_id, p.amount, p.payment_mode, p.note, p.payment_date,
                   p.paid_by, u1.name as paid_by_name,
                   p.paid_to, u2.name as paid_to_name
            FROM payments p
            JOIN users u1 ON p.paid_by = u1.user_id
            JOIN users u2 ON p.paid_to = u2.user_id
            WHERE p.group_id = ?
            ORDER BY p.payment_date DESC
        `, [groupId]);
        return rows;
    },

    async getPaymentById(paymentId) {
        const rows = await db.all('SELECT * FROM payments WHERE payment_id = ?', [paymentId]);
        return rows[0];
    },

    async addPayment(groupId, paidBy, paidTo, amount, paymentMode, note, paymentDate) {
        const result = await db.run(
            'INSERT INTO payments (group_id, paid_by, paid_to, amount, payment_mode, note, payment_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [groupId, paidBy, paidTo, amount, paymentMode, note || null, paymentDate]
        );
        return result.lastID;
    },

    async deletePayment(paymentId) {
        await db.run('DELETE FROM payments WHERE payment_id = ?', [paymentId]);
    }
};

module.exports = PaymentModel;
