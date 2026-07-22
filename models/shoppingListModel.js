const db = require('../config/db');

const ShoppingListModel = {
    async getListByGroup(groupId) {
        const [rows] = await db.execute(`
            SELECT s.item_id, s.item_name, s.assigned_to, s.status, u.name as assigned_name
            FROM shopping_list s
            LEFT JOIN users u ON s.assigned_to = u.user_id
            WHERE s.group_id = ?
            ORDER BY s.created_at DESC
        `, [groupId]);
        return rows;
    },

    async getItemById(itemId) {
        const [rows] = await db.execute('SELECT * FROM shopping_list WHERE item_id = ?', [itemId]);
        return rows[0];
    },

    async addItem(groupId, itemName, assignedTo) {
        const [result] = await db.execute(
            'INSERT INTO shopping_list (group_id, item_name, assigned_to) VALUES (?, ?, ?)',
            [groupId, itemName, assignedTo || null]
        );
        return result.insertId;
    },

    async updateItem(itemId, itemName, assignedTo, status) {
        await db.execute(
            'UPDATE shopping_list SET item_name = ?, assigned_to = ?, status = ? WHERE item_id = ?',
            [itemName, assignedTo || null, status, itemId]
        );
    },

    async deleteItem(itemId) {
        await db.execute('DELETE FROM shopping_list WHERE item_id = ?', [itemId]);
    }
};

module.exports = ShoppingListModel;
