const GroceryModel = require('../models/groceryModel');
const ActivityLogModel = require('../models/activityLogModel');
const GroupModel = require('../models/groupModel');

const groceryController = {
    async getGroceries(req, res) {
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

            const groceries = await GroceryModel.getGroceriesByGroup(group_id);
            res.json({ success: true, data: groceries });
        } catch (error) {
            console.error('Get groceries error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async addGrocery(req, res) {
        try {
            const { group_id, item_name, quantity, amount, purchase_date, contributors } = req.body;
            const userId = req.session.userId;

            if (!group_id || !item_name || !amount || !purchase_date) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
            if (item_name.length > 100) {
                return res.status(400).json({ success: false, message: 'Item name is too long' });
            }
            if (isNaN(amount) || Number(amount) <= 0) {
                return res.status(400).json({ success: false, message: 'Valid amount greater than zero is required' });
            }

            const isMember = await GroupModel.isMember(group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            // contributors should be an array of {user_id, amount_paid}
            let parsedContributors = [];
            if (contributors && Array.isArray(contributors)) {
                parsedContributors = contributors;
                const totalPaid = parsedContributors.reduce((sum, c) => sum + Number(c.amount_paid), 0);
                if (Math.abs(totalPaid - amount) > 0.01) {
                    return res.status(400).json({ success: false, message: 'Sum of contributors must equal total amount' });
                }
            }

            const groceryId = await GroceryModel.addGrocery(group_id, item_name, quantity, amount, userId, purchase_date, parsedContributors);

            // Log activity
            try {
                await ActivityLogModel.create(
                    group_id,
                    userId,
                    'ADDED_GROCERY',
                    `${req.session.userName || 'Someone'} logged grocery "${item_name}" (₹ ${amount})`
                );
            } catch (logErr) {
                console.error("Failed to log activity:", logErr);
            }

            res.status(201).json({
                success: true,
                data: { grocery_id: groceryId, item_name, quantity, amount, purchased_by: userId, purchase_date }
            });
        } catch (error) {
            console.error('Add grocery error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async updateGrocery(req, res) {
        try {
            const groceryId = req.params.id;
            const { item_name, quantity, amount } = req.body;
            const userId = req.session.userId;

            if (item_name && item_name.length > 100) {
                return res.status(400).json({ success: false, message: 'Item name is too long' });
            }
            const grocery = await GroceryModel.getGroceryById(groceryId);
            if (!grocery) {
                return res.status(404).json({ success: false, message: 'Grocery not found' });
            }
            if (isNaN(amount) || Number(amount) <= 0) {
                return res.status(400).json({ success: false, message: 'Valid amount greater than zero is required' });
            }

            if (Number(grocery.purchased_by) !== Number(userId)) {
                return res.status(403).json({ success: false, message: 'Only purchaser can edit' });
            }

            // Check if same day (using IST)
            const ISTString = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
            const todayIST = new Date(ISTString).toLocaleDateString('en-CA');
            const purchaseDate = new Date(grocery.purchase_date).toISOString().split('T')[0];
            if (todayIST !== purchaseDate) {
                return res.status(403).json({ success: false, message: 'Cannot edit past records' });
            }

            await GroceryModel.updateGrocery(groceryId, item_name, quantity, amount);
            res.json({ success: true, message: 'Grocery updated' });
        } catch (error) {
            console.error('Update grocery error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async deleteGrocery(req, res) {
        try {
            const groceryId = req.params.id;
            const userId = req.session.userId;

            const grocery = await GroceryModel.getGroceryById(groceryId);
            if (!grocery) {
                return res.status(404).json({ success: false, message: 'Grocery not found' });
            }

            if (Number(grocery.purchased_by) !== Number(userId)) {
                return res.status(403).json({ success: false, message: 'Only purchaser can delete' });
            }

            // Check if same day (using IST)
            const ISTString2 = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
            const todayIST2 = new Date(ISTString2).toLocaleDateString('en-CA');
            const purchaseDate2 = new Date(grocery.purchase_date).toISOString().split('T')[0];
            if (todayIST2 !== purchaseDate2) {
                return res.status(403).json({ success: false, message: 'Cannot delete past records' });
            }

            await GroceryModel.deleteGrocery(groceryId);
            res.json({ success: true, message: 'Grocery deleted' });
        } catch (error) {
            console.error('Delete grocery error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = groceryController;
