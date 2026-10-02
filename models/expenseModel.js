const prisma = require('../config/prisma');
const { number, dateOnly, timestamp } = require('../utils/prismaFormat');

function expenseRow(expense) {
    return expense && {
        expense_id: expense.expenseId,
        group_id: expense.groupId,
        title: expense.title,
        description: expense.description,
        amount: number(expense.amount),
        category: expense.category,
        expense_type: expense.expenseType,
        split_type: expense.splitType,
        expense_date: dateOnly(expense.expenseDate),
        created_at: timestamp(expense.createdAt)
    };
}

function withChildren(expense) {
    return {
        ...expenseRow(expense),
        splits: (expense.members || []).map(member => ({ user_id: member.userId, share_amount: number(member.shareAmount), name: member.user.name })),
        payers: (expense.payers || []).map(payer => ({ user_id: payer.userId, amount_paid: number(payer.amountPaid), name: payer.user.name }))
    };
}

const includeChildren = {
    members: { include: { user: true } },
    payers: { include: { user: true } }
};

const ExpenseModel = {
    async getExpensesByGroup(groupId) {
        const expenses = await prisma.expense.findMany({ where: { groupId: Number(groupId) }, include: includeChildren, orderBy: { expenseDate: 'desc' } });
        return expenses.map(withChildren);
    },

    async getExpenseById(expenseId) {
        return expenseRow(await prisma.expense.findUnique({ where: { expenseId: Number(expenseId) } }));
    },

    async addExpense(groupId, title, description, amount, category, expenseType, splitType, expenseDate, splits, payers) {
        const expense = await prisma.$transaction(async tx => tx.expense.create({
            data: {
                groupId: Number(groupId), title, description: description || null, amount,
                category, expenseType, splitType, expenseDate: new Date(`${expenseDate}T00:00:00.000Z`),
                members: { create: splits.map(split => ({ userId: Number(split.user_id), shareAmount: split.share_amount })) },
                payers: { create: payers.map(payer => ({ userId: Number(payer.user_id), amountPaid: payer.amount_paid })) }
            }
        }));
        return expense.expenseId;
    },

    async updateExpense(expenseId, title, description, amount, category, expenseType, splitType, expenseDate, splits, payers) {
        await prisma.$transaction(async tx => {
            await tx.expense.update({
                where: { expenseId: Number(expenseId) },
                data: { title, description: description || null, amount, category, expenseType, splitType, expenseDate: new Date(`${expenseDate}T00:00:00.000Z`) }
            });
            await tx.expenseMember.deleteMany({ where: { expenseId: Number(expenseId) } });
            await tx.expensePayer.deleteMany({ where: { expenseId: Number(expenseId) } });
            await tx.expenseMember.createMany({ data: splits.map(split => ({ expenseId: Number(expenseId), userId: Number(split.user_id), shareAmount: split.share_amount })) });
            await tx.expensePayer.createMany({ data: payers.map(payer => ({ expenseId: Number(expenseId), userId: Number(payer.user_id), amountPaid: payer.amount_paid })) });
        });
    },

    async deleteExpense(expenseId) {
        await prisma.expense.delete({ where: { expenseId: Number(expenseId) } });
    }
};

module.exports = ExpenseModel;
