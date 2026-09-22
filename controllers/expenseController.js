const ExpenseModel = require('../models/expenseModel');
const GroupModel = require('../models/groupModel');
const ActivityLogModel = require('../models/activityLogModel');
const { isValidDate, isFutureDate, toCents, centsToAmount } = require('../utils/validation');

const CATEGORIES = ['grocery', 'utility', 'rent', 'loan', 'other'];
const EXPENSE_TYPES = ['recurring', 'ad_hoc', 'transfer'];

async function memberIds(groupId) {
    const members = await GroupModel.getGroupMembers(groupId);
    return new Set(members.map(member => Number(member.user_id)));
}

function ensureUniqueMembers(items, idField) {
    const seen = new Set();
    for (const item of items) {
        const id = Number(item[idField]);
        if (!Number.isInteger(id) || seen.has(id)) throw new Error('Duplicate or invalid expense member');
        seen.add(id);
    }
}

async function calculateSplits(groupId, splitType, amount, splits) {
    const members = await GroupModel.getGroupMembers(groupId);
    if (members.length === 0) throw new Error('Group has no members');
    const allowed = new Set(members.map(member => Number(member.user_id)));
    let selected = members;

    if (splitType === 'custom') {
        if (!Array.isArray(splits) || splits.length === 0) throw new Error('At least one custom split is required');
        ensureUniqueMembers(splits, 'user_id');
        if (splits.some(split => !allowed.has(Number(split.user_id)))) throw new Error('EXPENSE_MEMBER_NOT_MEMBER');
        const total = splits.reduce((sum, split) => sum + toCents(split.share_amount), 0);
        if (splits.some(split => !Number.isFinite(toCents(split.share_amount)) || toCents(split.share_amount) < 0) || total !== toCents(amount)) {
            throw new Error('Custom splits must equal total amount');
        }
        return splits.map(split => ({ user_id: Number(split.user_id), share_amount: Number(split.share_amount) }));
    }

    if (Array.isArray(splits) && splits.length > 0) {
        ensureUniqueMembers(splits, 'user_id');
        if (splits.some(split => !allowed.has(Number(split.user_id)))) throw new Error('EXPENSE_MEMBER_NOT_MEMBER');
        selected = splits.map(split => members.find(member => Number(member.user_id) === Number(split.user_id)));
    }

    const totalCents = toCents(amount);
    const baseCents = Math.floor(totalCents / selected.length);
    let remainder = totalCents - (baseCents * selected.length);
    return selected.map(member => ({
        user_id: Number(member.user_id),
        share_amount: Number(centsToAmount(baseCents + (remainder-- > 0 ? 1 : 0)))
    }));
}

async function calculatePayers(groupId, userId, amount, payers, paidBy) {
    const allowed = await memberIds(groupId);
    const source = Array.isArray(payers) && payers.length > 0
        ? payers
        : [{ user_id: paidBy || userId, amount_paid: amount }];
    ensureUniqueMembers(source, 'user_id');
    if (source.some(payer => !allowed.has(Number(payer.user_id)))) throw new Error('EXPENSE_PAYER_NOT_MEMBER');
    const total = source.reduce((sum, payer) => sum + toCents(payer.amount_paid), 0);
    if (source.some(payer => !Number.isFinite(toCents(payer.amount_paid)) || toCents(payer.amount_paid) <= 0) || total !== toCents(amount)) {
        throw new Error('Sum of payers must equal total amount');
    }
    return source.map(payer => ({ user_id: Number(payer.user_id), amount_paid: Number(payer.amount_paid) }));
}

async function validateExpenseInput(groupId, userId, input, existing = null) {
    existing = existing || {};
    const title = String(input.title === undefined ? existing.title : input.title).trim();
    const description = input.description === undefined ? (existing.description || null) : String(input.description).trim();
    const amount = input.amount === undefined ? Number(existing.amount) : Number(input.amount);
    const category = input.category === undefined ? (existing.category || 'other') : input.category;
    const expenseType = input.expense_type === undefined ? (existing.expense_type || 'ad_hoc') : input.expense_type;
    const splitType = input.split_type === undefined ? (existing.split_type || 'equal') : input.split_type;
    const expenseDate = input.expense_date === undefined ? String(existing.expense_date).slice(0, 10) : input.expense_date;

    if (!title || title.length > 100 || description && description.length > 500) throw new Error('Invalid title or description');
    if (!Number.isFinite(amount) || toCents(amount) <= 0) throw new Error('Valid amount greater than zero is required');
    if (!CATEGORIES.includes(category) || !EXPENSE_TYPES.includes(expenseType)) throw new Error('Invalid expense category or type');
    if (!['equal', 'custom'].includes(splitType)) throw new Error('Invalid split_type');
    if (!isValidDate(expenseDate) || isFutureDate(expenseDate)) throw new Error('Invalid or future expense date');
    if (!await GroupModel.isMember(groupId, userId)) throw new Error('NOT_A_MEMBER');

    const splits = await calculateSplits(groupId, splitType, amount, input.splits);
    const payers = await calculatePayers(groupId, userId, amount, input.payers, input.paid_by);
    return { title, description, amount, category, expenseType, splitType, expenseDate, splits, payers };
}

function handleValidationError(res, error) {
    if (['NOT_A_MEMBER'].includes(error.message)) return res.status(403).json({ success: false, message: error.message });
    return res.status(400).json({ success: false, message: error.message });
}

const expenseController = {
    async getExpenses(req, res) {
        try {
            const { group_id } = req.query;
            if (!group_id) return res.status(400).json({ success: false, message: 'group_id is required' });
            if (!await GroupModel.isMember(group_id, req.session.userId)) return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            res.json({ success: true, data: await ExpenseModel.getExpensesByGroup(group_id) });
        } catch (error) {
            console.error('Get expenses error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async getExpense(req, res) {
        try {
            const expense = await ExpenseModel.getExpenseById(req.params.id);
            if (!expense) return res.status(404).json({ success: false, message: 'EXPENSE_NOT_FOUND' });
            if (!await GroupModel.isMember(expense.group_id, req.session.userId)) return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            const full = (await ExpenseModel.getExpensesByGroup(expense.group_id)).find(item => Number(item.expense_id) === Number(req.params.id));
            res.json({ success: true, data: full });
        } catch (error) {
            console.error('Get expense error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async addExpense(req, res) {
        try {
            if (!req.body.group_id || !req.body.title || req.body.amount === undefined || !req.body.split_type || !req.body.expense_date) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
            const data = await validateExpenseInput(req.body.group_id, req.session.userId, req.body);
            const expenseId = await ExpenseModel.addExpense(req.body.group_id, data.title, data.description, data.amount, data.category, data.expenseType, data.splitType, data.expenseDate, data.splits, data.payers);
            await ActivityLogModel.create(req.body.group_id, req.session.userId, 'ADDED_EXPENSE', `${req.session.userName || 'Someone'} added "${data.title}" (₹ ${data.amount})`);
            res.status(201).json({ success: true, data: { expense_id: expenseId } });
        } catch (error) {
            if (error.message !== 'Server error') return handleValidationError(res, error);
            console.error('Add expense error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async updateExpense(req, res) {
        try {
            const expense = await ExpenseModel.getExpenseById(req.params.id);
            if (!expense) return res.status(404).json({ success: false, message: 'EXPENSE_NOT_FOUND' });
            const membership = await GroupModel.isMember(expense.group_id, req.session.userId);
            if (!membership) return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            const full = (await ExpenseModel.getExpensesByGroup(expense.group_id)).find(item => Number(item.expense_id) === Number(req.params.id));
            const canEdit = membership.role === 'admin' || full.payers.some(payer => Number(payer.user_id) === Number(req.session.userId));
            if (!canEdit) return res.status(403).json({ success: false, message: 'NOT_EXPENSE_CREATOR' });
            const data = await validateExpenseInput(expense.group_id, req.session.userId, req.body, expense);
            await ExpenseModel.updateExpense(req.params.id, data.title, data.description, data.amount, data.category, data.expenseType, data.splitType, data.expenseDate, data.splits, data.payers);
            res.json({ success: true, message: 'Expense updated' });
        } catch (error) {
            if (error.message !== 'Server error') return handleValidationError(res, error);
            console.error('Update expense error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async deleteExpense(req, res) {
        try {
            const expense = await ExpenseModel.getExpenseById(req.params.id);
            if (!expense) return res.status(404).json({ success: false, message: 'EXPENSE_NOT_FOUND' });
            const membership = await GroupModel.isMember(expense.group_id, req.session.userId);
            if (!membership) return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            const full = (await ExpenseModel.getExpensesByGroup(expense.group_id)).find(item => Number(item.expense_id) === Number(req.params.id));
            if (membership.role !== 'admin' && !full.payers.some(payer => Number(payer.user_id) === Number(req.session.userId))) return res.status(403).json({ success: false, message: 'NOT_EXPENSE_CREATOR' });
            await ExpenseModel.deleteExpense(req.params.id);
            await ActivityLogModel.create(expense.group_id, req.session.userId, 'DELETED_EXPENSE', `Deleted expense "${expense.title}"`);
            res.json({ success: true, message: 'Expense deleted' });
        } catch (error) {
            console.error('Delete expense error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = expenseController;
