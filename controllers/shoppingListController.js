const ShoppingListModel = require('../models/shoppingListModel');
const GroupModel = require('../models/groupModel');

const shoppingListController = {
    async getList(req, res) {
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

            const list = await ShoppingListModel.getListByGroup(group_id);
            res.json({ success: true, data: list });
        } catch (error) {
            console.error('Get shopping list error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async addItem(req, res) {
        try {
            const { group_id, item_name, assigned_to } = req.body;
            const userId = req.session.userId;

            if (!group_id || !item_name) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }

            const isMember = await GroupModel.isMember(group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            const itemId = await ShoppingListModel.addItem(group_id, item_name, assigned_to);
            res.status(201).json({
                success: true,
                data: { item_id: itemId, item_name, assigned_to, status: 'pending' }
            });
        } catch (error) {
            console.error('Add shopping item error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async updateItem(req, res) {
        try {
            const itemId = req.params.id;
            const { item_name, assigned_to, status } = req.body;
            const userId = req.session.userId;

            const item = await ShoppingListModel.getItemById(itemId);
            if (!item) {
                return res.status(404).json({ success: false, message: 'Item not found' });
            }

            const isMember = await GroupModel.isMember(item.group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            if (item.status === 'purchased' && status !== 'pending') {
                return res.status(400).json({ success: false, message: 'Item already purchased' });
            }

            await ShoppingListModel.updateItem(itemId, item_name, assigned_to, status);
            res.json({ success: true, message: 'Item updated' });
        } catch (error) {
            console.error('Update shopping item error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async deleteItem(req, res) {
        try {
            const itemId = req.params.id;
            const userId = req.session.userId;

            const item = await ShoppingListModel.getItemById(itemId);
            if (!item) {
                return res.status(404).json({ success: false, message: 'Item not found' });
            }

            const isMember = await GroupModel.isMember(item.group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            await ShoppingListModel.deleteItem(itemId);
            res.json({ success: true, message: 'Item deleted' });
        } catch (error) {
            console.error('Delete shopping item error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = shoppingListController;
