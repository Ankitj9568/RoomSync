const db = require('../config/db');

const ExpenseModel = {
    async getExpensesByGroup(groupId) {
        const rows = await db.all(`
            SELECT e.expense_id, e.title, e.description, e.amount, e.category, e.expense_type, e.split_type, 
                   e.expense_date
            FROM expenses e
            WHERE e.group_id = ?
            ORDER BY e.expense_date DESC
        `, [groupId]);

        for (let expense of rows) {
            const members = await db.all(`
                SELECT em.user_id, em.share_amount, u.name 
                FROM expense_members em
                JOIN users u ON em.user_id = u.user_id
                WHERE em.expense_id = ?
            `, [expense.expense_id]);
            expense.splits = members;

            const payers = await db.all(`
                SELECT ep.user_id, ep.amount_paid, u.name 
                FROM expense_payers ep
                JOIN users u ON ep.user_id = u.user_id
                WHERE ep.expense_id = ?
            `, [expense.expense_id]);
            expense.payers = payers;
        }

        return rows;
    },

    async getExpenseById(expenseId) {
        const rows = await db.all('SELECT * FROM expenses WHERE expense_id = ?', [expenseId]);
        return rows[0];
    },

    async addExpense(groupId, title, description, amount, category, expenseType, splitType, expenseDate, splits, payers) {
        try {
            await db.run('BEGIN TRANSACTION');

            const result = await db.run(
                'INSERT INTO expenses (group_id, title, description, amount, category, expense_type, split_type, expense_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [groupId, title, description, amount, category, expenseType, splitType, expenseDate]
            );
            const expenseId = result.lastID;

            for (const split of splits) {
                await db.run(
                    'INSERT INTO expense_members (expense_id, user_id, share_amount) VALUES (?, ?, ?)',
                    [expenseId, split.user_id, split.share_amount]
                );
            }

            for (const payer of payers) {
                await db.run(
                    'INSERT INTO expense_payers (expense_id, user_id, amount_paid) VALUES (?, ?, ?)',
                    [expenseId, payer.user_id, payer.amount_paid]
                );
            }

            await db.run('COMMIT');
            return expenseId;
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    },

    async updateExpense(expenseId, title, description, amount, category, expenseType, splitType, expenseDate, splits, payers) {
        try {
            await db.run('BEGIN TRANSACTION');

            await db.run(
                'UPDATE expenses SET title=?, description=?, amount=?, category=?, expense_type=?, split_type=?, expense_date=? WHERE expense_id=?',
                [title, description, amount, category, expenseType, splitType, expenseDate, expenseId]
            );

            await db.run('DELETE FROM expense_members WHERE expense_id = ?', [expenseId]);
            await db.run('DELETE FROM expense_payers WHERE expense_id = ?', [expenseId]);

            for (const split of splits) {
                await db.run(
                    'INSERT INTO expense_members (expense_id, user_id, share_amount) VALUES (?, ?, ?)',
                    [expenseId, split.user_id, split.share_amount]
                );
            }
            
            for (const payer of payers) {
                await db.run(
                    'INSERT INTO expense_payers (expense_id, user_id, amount_paid) VALUES (?, ?, ?)',
                    [expenseId, payer.user_id, payer.amount_paid]
                );
            }

            await db.run('COMMIT');
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    },

    async deleteExpense(expenseId) {
        await db.run('DELETE FROM expenses WHERE expense_id = ?', [expenseId]);
    }
};

module.exports = ExpenseModel;
