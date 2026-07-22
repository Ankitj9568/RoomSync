const ExpenseModel = require('../models/expenseModel');
const GroceryModel = require('../models/groceryModel');
const GroupModel = require('../models/groupModel');
const MealModel = require('../models/mealModel');
const settlementCalculator = require('../utils/settlementCalculator');

const dashboardController = {
    async getOverview(req, res) {
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

            // 1. Total Group Spend (Expenses + Groceries) for the current month
            const expenses = await ExpenseModel.getExpensesByGroup(group_id);
            const groceries = await GroceryModel.getGroceriesByGroup(group_id);
            
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            let totalSpend = 0;
            expenses.forEach(e => {
                const d = new Date(e.expense_date);
                if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && e.expense_type !== 'transfer') {
                    totalSpend += parseFloat(e.amount);
                }
            });
            groceries.forEach(g => {
                const d = new Date(g.purchase_date);
                if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    totalSpend += parseFloat(g.amount);
                }
            });

            // 2. My Balance (Settlements)
            const settlementData = await settlementCalculator.calculateBalances(group_id);
            const myBalance = settlementData.balances[userId] || 0; // positive = owed, negative = owes

            // 3. Next Meal
            const today = new Date().toISOString().split('T')[0];
            const menu = await MealModel.getMenuByDate(group_id, today);
            
            let nextMeal = null;
            if (menu && menu.length > 0) {
                // Determine if lunch is over (e.g. past 2 PM)
                const hour = new Date().getHours();
                const upcoming = menu.find(m => {
                    if (m.meal_type === 'lunch' && hour < 14) return true;
                    if (m.meal_type === 'dinner' && hour < 22) return true;
                    return false;
                });
                if (upcoming) {
                    nextMeal = upcoming;
                } else {
                    nextMeal = menu[menu.length - 1]; // just show last meal of day
                }
            }

            res.json({
                success: true,
                data: {
                    totalSpend,
                    myBalance,
                    nextMeal
                }
            });
        } catch (error) {
            console.error('Get dashboard overview error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async getAnalytics(req, res) {
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
            const groceries = await GroceryModel.getGroceriesByGroup(group_id);

            // Category breakdown (All time or current month, let's do all time for simplicity)
            const categoryTotals = {};
            expenses.forEach(e => {
                if (e.expense_type !== 'transfer') {
                    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + parseFloat(e.amount);
                }
            });
            groceries.forEach(g => {
                categoryTotals['grocery'] = (categoryTotals['grocery'] || 0) + parseFloat(g.amount);
            });

            // Trend over last 7 days
            const trend = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                
                let dayTotal = 0;
                expenses.forEach(e => {
                    if (e.expense_date.startsWith(dateStr) && e.expense_type !== 'transfer') dayTotal += parseFloat(e.amount);
                });
                groceries.forEach(g => {
                    if (g.purchase_date.startsWith(dateStr)) dayTotal += parseFloat(g.amount);
                });
                
                trend.push({
                    date: d.toLocaleDateString('en-US', { weekday: 'short' }),
                    amount: dayTotal
                });
            }

            res.json({
                success: true,
                data: {
                    categories: categoryTotals,
                    trend
                }
            });
        } catch (error) {
            console.error('Get analytics error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = dashboardController;
