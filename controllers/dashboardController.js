const ExpenseModel = require('../models/expenseModel');
const GroceryModel = require('../models/groceryModel');
const GroupModel = require('../models/groupModel');
const MealModel = require('../models/mealModel');
const MenuModel = require('../models/menuModel');
const PaymentModel = require('../models/paymentModel');
const TaskModel = require('../models/taskModel');
const settlementCalculator = require('../utils/settlementCalculator');
const { todayInTimeZone } = require('../utils/validation');
const { canManage, canAccessPeerFinancials } = require('../utils/roles');

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
            if (!canAccessPeerFinancials(isMember.role)) {
                return res.status(403).json({ success: false, message: 'FINANCIALS_RESTRICTED' });
            }

            // 1. Total Group Spend (Expenses + Groceries) for the current month
            const expenses = await ExpenseModel.getExpensesByGroup(group_id);
            const groceries = await GroceryModel.getGroceriesByGroup(group_id);
            
            const currentMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date());
            
            let totalSpend = 0;
            expenses.forEach(e => {
                if (String(e.expense_date).slice(0, 7) === currentMonth && e.expense_type !== 'transfer') {
                    totalSpend += parseFloat(e.amount);
                }
            });
            groceries.forEach(g => {
                if (String(g.purchase_date).slice(0, 7) === currentMonth) {
                    totalSpend += parseFloat(g.amount);
                }
            });

            // 2. My Balance (Settlements)
            const settlementData = await settlementCalculator.calculateBalances(group_id);
            const myBalance = settlementData.balances[String(userId)] || 0; // use String key to match calculator

            // 3. Next Meal
            const today = todayInTimeZone('Asia/Kolkata');
            const menu = await MenuModel.getMenuByGroupAndDate(group_id, today);
            
            let nextMeal = null;
            if (menu && menu.length > 0) {
                // Determine if lunch/dinner is over using IST time (server runs UTC)
                const ISTHour = parseInt(new Date().toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false
                }));
                const upcoming = menu.find(m => {
                    if (m.meal_type === 'lunch' && ISTHour < 14) return true;
                    if (m.meal_type === 'dinner' && ISTHour < 22) return true;
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
            if (!canAccessPeerFinancials(isMember.role)) {
                return res.status(403).json({ success: false, message: 'FINANCIALS_RESTRICTED' });
            }

            const expenses = await ExpenseModel.getExpensesByGroup(group_id);
            const groceries = await GroceryModel.getGroceriesByGroup(group_id);

            const requestedMonth = req.query.month;
            if (requestedMonth !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)) {
                return res.status(400).json({ success: false, message: 'INVALID_MONTH_FORMAT' });
            }
            const month = requestedMonth || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date());

            // Category breakdown for the selected month.
            const categoryTotals = {};
            expenses.forEach(e => {
                if (e.expense_type !== 'transfer' && String(e.expense_date).slice(0, 7) === month) {
                    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + parseFloat(e.amount);
                }
            });
            groceries.forEach(g => {
                if (String(g.purchase_date).slice(0, 7) === month) {
                    categoryTotals['grocery'] = (categoryTotals['grocery'] || 0) + parseFloat(g.amount);
                }
            });

            // Trend over last 7 days (using IST dates to match stored data)
            const trend = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                // Use IST date string (YYYY-MM-DD) for comparison with stored dates
                const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                
                let dayTotal = 0;
                expenses.forEach(e => {
                    if (e.expense_date && e.expense_type !== 'transfer') {
                        const dStr = new Date(e.expense_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                        if (dStr === dateStr) dayTotal += parseFloat(e.amount);
                    }
                });
                groceries.forEach(g => {
                    if (g.purchase_date) {
                        const dStr = new Date(g.purchase_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                        if (dStr === dateStr) dayTotal += parseFloat(g.amount);
                    }
                });
                
                trend.push({
                    date: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' }),
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
    },

    // PG-owner home: strictly PG-level matters (occupancy, rent collection,
    // dues owed to the owner, assigned tasks). Roommate-to-roommate money
    // (expense splits, peer debts, adjustments) is never included here.
    async getOwnerOverview(req, res) {
        try {
            const { group_id } = req.query;
            const userId = req.session.userId;

            if (!group_id) {
                return res.status(400).json({ success: false, message: 'group_id is required' });
            }

            const membership = await GroupModel.isMember(group_id, userId);
            if (!membership) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }
            if (!canManage(membership.role)) {
                return res.status(403).json({ success: false, message: 'NOT_ADMIN' });
            }

            const [members, settlementData, payments, taskCounts] = await Promise.all([
                GroupModel.getGroupMembers(group_id),
                settlementCalculator.calculateBalances(group_id),
                PaymentModel.getPaymentsByGroup(group_id),
                TaskModel.getTaskCounts(group_id)
            ]);

            const byRole = {};
            members.forEach(member => {
                byRole[member.role] = (byRole[member.role] || 0) + 1;
            });

            // Only debts owed TO the owner — peer debts stay between roommates.
            const duesToOwner = settlementData.debts
                .filter(debt => Number(debt.to) === Number(userId))
                .map(debt => {
                    const from = members.find(m => Number(m.user_id) === Number(debt.from));
                    return { from_id: debt.from, from_name: from ? from.name : 'Unknown', amount: debt.amount };
                });

            const currentMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date());
            let rentCollected = 0;
            let rentPending = 0;
            payments.forEach(payment => {
                if (Number(payment.paid_to) !== Number(userId)) return;
                if (String(payment.payment_date).slice(0, 7) !== currentMonth) return;
                if (payment.status === 'approved') rentCollected += Number(payment.amount);
                else if (payment.status === 'pending') rentPending += Number(payment.amount);
            });

            const ownerPayments = payments
                .filter(payment => Number(payment.paid_to) === Number(userId) || Number(payment.paid_by) === Number(userId))
                .slice(0, 5);

            res.json({
                success: true,
                data: {
                    occupancy: { total: members.length, by_role: byRole },
                    members: members.map(member => ({ user_id: member.user_id, name: member.name, role: member.role })),
                    dues_to_owner: duesToOwner,
                    total_dues_to_owner: duesToOwner.reduce((sum, debt) => sum + Number(debt.amount), 0),
                    rent_collected_month: rentCollected,
                    rent_pending_month: rentPending,
                    tasks: taskCounts,
                    recent_payments: ownerPayments
                }
            });
        } catch (error) {
            console.error('Get owner overview error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = dashboardController;
