const GroceryModel = require('../models/groceryModel');
const ActivityLogModel = require('../models/activityLogModel');
const GroupModel = require('../models/groupModel');
const { isValidDate, isFutureDate, toCents } = require('../utils/validation');

async function validateContributors(groupId, contributors, amount) {
    if (contributors === undefined || contributors === null) return null;
    if (!Array.isArray(contributors) || contributors.length === 0) throw new Error('At least one contributor is required');
    const seen = new Set();
    let total = 0;
    for (const contributor of contributors) {
        const userId = Number(contributor.user_id);
        const paid = toCents(contributor.amount_paid);
        if (!Number.isInteger(userId) || paid <= 0 || seen.has(userId)) throw new Error('Invalid grocery contributor');
        if (!await GroupModel.isMember(groupId, userId)) throw new Error('GROCERY_CONTRIBUTOR_NOT_MEMBER');
        seen.add(userId);
        total += paid;
    }
    if (total !== toCents(amount)) throw new Error('Sum of contributors must equal total amount');
    return contributors.map(contributor => ({
        user_id: Number(contributor.user_id),
        amount_paid: Number(contributor.amount_paid)
    }));
}

function todayMatches(date) {
    return date === new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

const groceryController = {
    async getGroceries(req, res) {
        try {
            const { group_id } = req.query;
            if (!group_id) return res.status(400).json({ success: false, message: 'group_id is required' });
            if (!await GroupModel.isMember(group_id, req.session.userId)) return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            res.json({ success: true, data: await GroceryModel.getGroceriesByGroup(group_id) });
        } catch (error) {
            console.error('Get groceries error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async addGrocery(req, res) {
        try {
            const { group_id, item_name, quantity, amount, purchase_date } = req.body;
            const itemName = String(item_name || '').trim();
            if (!group_id || !itemName || amount === undefined || !purchase_date) return res.status(400).json({ success: false, message: 'Missing required fields' });
            if (itemName.length > 100 || (quantity && String(quantity).length > 100)) return res.status(400).json({ success: false, message: 'Item name or quantity is too long' });
            if (toCents(amount) <= 0 || !isValidDate(purchase_date) || isFutureDate(purchase_date)) return res.status(400).json({ success: false, message: 'Invalid amount or purchase date' });
            if (!await GroupModel.isMember(group_id, req.session.userId)) return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });

            const contributors = await validateContributors(group_id, req.body.contributors, amount);
            const groceryId = await GroceryModel.addGrocery(group_id, itemName, quantity || null, Number(amount), req.session.userId, purchase_date, contributors || []);
            await ActivityLogModel.create(group_id, req.session.userId, 'ADDED_GROCERY', `${req.session.userName || 'Someone'} logged grocery "${itemName}" (₹ ${amount})`);
            res.status(201).json({ success: true, data: { grocery_id: groceryId, item_name: itemName, quantity, amount: Number(amount), purchased_by: req.session.userId, purchase_date } });
        } catch (error) {
            if (error.message.includes('contributor') || error.message.includes('contributors')) return res.status(400).json({ success: false, message: error.message });
            console.error('Add grocery error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async updateGrocery(req, res) {
        try {
            const grocery = await GroceryModel.getGroceryById(req.params.id);
            if (!grocery) return res.status(404).json({ success: false, message: 'GROCERY_NOT_FOUND' });
            if (Number(grocery.purchased_by) !== Number(req.session.userId)) return res.status(403).json({ success: false, message: 'NOT_PURCHASER' });
            const purchaseDate = String(grocery.purchase_date).slice(0, 10);
            if (!todayMatches(purchaseDate)) return res.status(403).json({ success: false, message: 'CORRECTION_WINDOW_EXPIRED' });

            const itemName = String(req.body.item_name === undefined ? grocery.item_name : req.body.item_name).trim();
            const quantity = req.body.quantity === undefined ? grocery.quantity : req.body.quantity;
            const amount = req.body.amount === undefined ? grocery.amount : req.body.amount;
            if (!itemName || itemName.length > 100 || toCents(amount) <= 0) return res.status(400).json({ success: false, message: 'Invalid grocery data' });
            const contributors = await validateContributors(grocery.group_id, req.body.contributors, amount);
            await GroceryModel.updateGrocery(req.params.id, itemName, quantity, Number(amount), contributors || [{ user_id: grocery.purchased_by, amount_paid: Number(amount) }]);
            res.json({ success: true, message: 'Grocery updated' });
        } catch (error) {
            if (error.message.includes('contributor') || error.message.includes('contributors')) return res.status(400).json({ success: false, message: error.message });
            console.error('Update grocery error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async deleteGrocery(req, res) {
        try {
            const grocery = await GroceryModel.getGroceryById(req.params.id);
            if (!grocery) return res.status(404).json({ success: false, message: 'GROCERY_NOT_FOUND' });
            if (Number(grocery.purchased_by) !== Number(req.session.userId)) return res.status(403).json({ success: false, message: 'NOT_PURCHASER' });
            if (!todayMatches(String(grocery.purchase_date).slice(0, 10))) return res.status(403).json({ success: false, message: 'CORRECTION_WINDOW_EXPIRED' });
            await GroceryModel.deleteGrocery(req.params.id);
            res.json({ success: true, message: 'Grocery deleted' });
        } catch (error) {
            console.error('Delete grocery error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = groceryController;
