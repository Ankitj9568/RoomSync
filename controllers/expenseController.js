const ExpenseModel = require('../models/expenseModel');
const GroupModel = require('../models/groupModel');
const ActivityLogModel = require('../models/activityLogModel');

const expenseController = {
    async getExpenses(req, res) {
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

            const expenses = await ExpenseModel.getExpensesByGroup(group_id);
            res.json({ success: true, data: expenses });
        } catch (error) {
            console.error('Get expenses error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async addExpense(req, res) {
        try {
            const { group_id, title, description, amount, category, expense_type, split_type, expense_date, splits, payers } = req.body;
            const userId = req.session.userId;

            if (!group_id || !title || !amount || !split_type || !expense_date || !splits) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }

            const isMember = await GroupModel.isMember(group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            let computedSplits = [];
            if (split_type === 'equal') {
                const members = await GroupModel.getGroupMembers(group_id);
                const share = (amount / members.length).toFixed(2);
                computedSplits = members.map(m => ({ user_id: m.user_id, share_amount: share }));
            } else if (split_type === 'custom') {
                const total = splits.reduce((sum, s) => sum + Number(s.share_amount), 0);
                if (Math.abs(total - amount) > 0.01) {
                    return res.status(400).json({ success: false, message: 'Custom splits must equal total amount' });
                }
                computedSplits = splits;
            } else {
                return res.status(400).json({ success: false, message: 'Invalid split_type' });
            }

            let computedPayers = [];
            if (!payers || payers.length === 0) {
                computedPayers = [{ user_id: userId, amount_paid: amount }];
            } else {
                const totalPaid = payers.reduce((sum, p) => sum + Number(p.amount_paid), 0);
                if (Math.abs(totalPaid - amount) > 0.01) {
                    return res.status(400).json({ success: false, message: 'Sum of payers must equal total amount' });
                }
                computedPayers = payers;
            }

            const expenseId = await ExpenseModel.addExpense(
                group_id, title, description, amount, category, expense_type || 'ad_hoc', split_type, expense_date, computedSplits, computedPayers
            );

            // Log activity
            try {
                await ActivityLogModel.create(
                    group_id,
                    userId,
                    'EXPENSE_ADDED',
                    `${req.session.userName} added "${title}" (₹ ${amount})`
                );
            } catch (logErr) {
                console.error("Failed to log activity:", logErr);
            }

            res.status(201).json({ success: true, data: { expense_id: expenseId } });
        } catch (error) {
            console.error('Add expense error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async updateExpense(req, res) {
        try {
            const expenseId = req.params.id;
            const { title, description, amount, category, expense_type, split_type, expense_date, splits, payers } = req.body;
            const userId = req.session.userId;

            const expense = await ExpenseModel.getExpenseById(expenseId);
            if (!expense) {
                return res.status(404).json({ success: false, message: 'Expense not found' });
            }

            const isMember = await GroupModel.isMember(expense.group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'Only group members can edit' });
            }

            let computedSplits = [];
            if (split_type === 'equal') {
                const members = await GroupModel.getGroupMembers(expense.group_id);
                const share = (amount / members.length).toFixed(2);
                computedSplits = members.map(m => ({ user_id: m.user_id, share_amount: share }));
            } else if (split_type === 'custom') {
                const total = splits.reduce((sum, s) => sum + Number(s.share_amount), 0);
                if (Math.abs(total - amount) > 0.01) {
                    return res.status(400).json({ success: false, message: 'Custom splits must equal total amount' });
                }
                computedSplits = splits;
            }

            let computedPayers = [];
            if (!payers || payers.length === 0) {
                computedPayers = [{ user_id: userId, amount_paid: amount }];
            } else {
                const totalPaid = payers.reduce((sum, p) => sum + Number(p.amount_paid), 0);
                if (Math.abs(totalPaid - amount) > 0.01) {
                    return res.status(400).json({ success: false, message: 'Sum of payers must equal total amount' });
                }
                computedPayers = payers;
            }

            await ExpenseModel.updateExpense(
                expenseId, title, description, amount, category, expense_type || 'ad_hoc', split_type, expense_date, computedSplits, computedPayers
            );
            res.json({ success: true, message: 'Expense updated' });
        } catch (error) {
            console.error('Update expense error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async deleteExpense(req, res) {
        try {
            const expenseId = req.params.id;
            const userId = req.session.userId;

            const expense = await ExpenseModel.getExpenseById(expenseId);
            if (!expense) {
                return res.status(404).json({ success: false, message: 'Expense not found' });
            }

            const isMember = await GroupModel.isMember(expense.group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'Only group members can delete' });
            }

            await ExpenseModel.deleteExpense(expenseId);
            res.json({ success: true, message: 'Expense deleted' });
        } catch (error) {
            console.error('Delete expense error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = expenseController;
