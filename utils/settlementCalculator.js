const ExpenseModel = require('../models/expenseModel');
const GroceryModel = require('../models/groceryModel');
const PaymentModel = require('../models/paymentModel');
const GroupModel = require('../models/groupModel');

const settlementCalculator = {
    async calculateBalances(groupId) {
        // Fetch all data
        const expenses = await ExpenseModel.getExpensesByGroup(groupId);
        const groceries = await GroceryModel.getGroceriesByGroup(groupId);
        const payments = await PaymentModel.getPaymentsByGroup(groupId);
        const members = await GroupModel.getGroupMembers(groupId);

        // Initialize balances for each user: user_id -> balance
        // Positive balance = they are owed money
        // Negative balance = they owe money
        const balances = {};
        members.forEach(m => {
            balances[m.user_id] = 0;
        });

        // 1. Process Expenses
        expenses.forEach(exp => {
            // Add what people paid
            exp.payers.forEach(payer => {
                if (balances[payer.user_id] !== undefined) {
                    balances[payer.user_id] += parseFloat(payer.amount_paid);
                }
            });

            // Subtract what people owe (their share)
            exp.splits.forEach(split => {
                if (balances[split.user_id] !== undefined) {
                    balances[split.user_id] -= parseFloat(split.share_amount);
                }
            });
        });

        // 2. Process Groceries
        groceries.forEach(groc => {
            const totalAmount = parseFloat(groc.amount);
            
            // Add what people paid
            if (groc.contributors && groc.contributors.length > 0) {
                groc.contributors.forEach(c => {
                    if (balances[c.user_id] !== undefined) {
                        balances[c.user_id] += parseFloat(c.amount_paid);
                    }
                });
            } else {
                if (balances[groc.purchased_by] !== undefined) {
                    balances[groc.purchased_by] += totalAmount;
                }
            }

            // Subtract everyone's equal share (assuming groceries are shared equally among all members)
            const splitAmount = totalAmount / members.length;
            members.forEach(m => {
                balances[m.user_id] -= splitAmount;
            });
        });

        // 3. Process Payments (Settlements)
        // If A paid B 100
        // A's balance increases by 100 (they paid out, so they are owed 100 less)
        // B's balance decreases by 100 (they received 100, so they owe 100 more)
        payments.forEach(pay => {
            const amount = parseFloat(pay.amount);
            if (balances[pay.paid_by] !== undefined) {
                balances[pay.paid_by] += amount;
            }
            if (balances[pay.paid_to] !== undefined) {
                balances[pay.paid_to] -= amount;
            }
        });

        // Round to 2 decimal places to avoid floating point issues
        Object.keys(balances).forEach(uid => {
            balances[uid] = Math.round(balances[uid] * 100) / 100;
        });

        // Calculate total gross debt for percentage tracking
        let totalDebt = 0;
        Object.values(balances).forEach(bal => {
            if (bal > 0) totalDebt += bal; // Only count positive balances (or negative, same sum)
        });

        let totalSettled = 0;
        payments.forEach(pay => {
            totalSettled += parseFloat(pay.amount);
        });

        // Calculate "Who owes whom" using greedy algorithm
        const debts = []; // Array of { from: userId, to: userId, amount: amount }
        
        const debtors = [];
        const creditors = [];

        Object.keys(balances).forEach(uid => {
            const numUid = parseInt(uid, 10);
            if (balances[uid] < -0.01) debtors.push({ user_id: numUid, amount: -balances[uid] });
            else if (balances[uid] > 0.01) creditors.push({ user_id: numUid, amount: balances[uid] });
        });

        // Sort both descending
        debtors.sort((a, b) => b.amount - a.amount);
        creditors.sort((a, b) => b.amount - a.amount);

        let i = 0; // index for debtors
        let j = 0; // index for creditors

        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];

            const settleAmount = Math.min(debtor.amount, creditor.amount);

            debts.push({
                from: debtor.user_id,
                to: creditor.user_id,
                amount: Math.round(settleAmount * 100) / 100
            });

            debtor.amount -= settleAmount;
            creditor.amount -= settleAmount;

            if (debtor.amount < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }

        return {
            balances,
            debts,
            totalDebt,
            totalSettled
        };
    }
};

module.exports = settlementCalculator;
