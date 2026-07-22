const PaymentModel = require('../models/paymentModel');
const GroupModel = require('../models/groupModel');

const paymentController = {
    async getPayments(req, res) {
        try {
            const { group_id } = req.query;
            const userId = req.session.userId;

            if (!group_id) {
                return res.status(400).json({ success: false, message: 'group_id is required' });
            }

            const isMember = await GroupModel.isMember(group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            const payments = await PaymentModel.getPaymentsByGroup(group_id);
            res.json({ success: true, data: payments });
        } catch (error) {
            console.error('Get payments error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async addPayment(req, res) {
        try {
            const { group_id, paid_to, amount, payment_mode, note, payment_date } = req.body;
            const paidBy = req.session.userId;

            if (!group_id || !paid_to || !amount || !payment_mode || !payment_date) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
            if (paidBy === Number(paid_to)) {
                return res.status(400).json({ success: false, message: 'Cannot pay yourself' });
            }

            const isMember = await GroupModel.isMember(group_id, paidBy);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            const paymentId = await PaymentModel.addPayment(group_id, paidBy, paid_to, amount, payment_mode, note, payment_date);
            res.status(201).json({ success: true, data: { payment_id: paymentId } });
        } catch (error) {
            console.error('Add payment error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async deletePayment(req, res) {
        try {
            const paymentId = req.params.id;
            const userId = req.session.userId;

            const payment = await PaymentModel.getPaymentById(paymentId);
            if (!payment) {
                return res.status(404).json({ success: false, message: 'Payment not found' });
            }

            if (payment.paid_by !== userId) {
                return res.status(403).json({ success: false, message: 'Only payer can delete' });
            }

            await PaymentModel.deletePayment(paymentId);
            res.json({ success: true, message: 'Payment deleted' });
        } catch (error) {
            console.error('Delete payment error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = paymentController;
