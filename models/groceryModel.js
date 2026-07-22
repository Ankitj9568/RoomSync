const db = require('../config/db');

const GroceryModel = {
    async getGroceriesByGroup(groupId) {
        const [rows] = await db.execute(`
            SELECT g.grocery_id, g.item_name, g.quantity, g.amount, g.purchased_by, 
                   g.purchase_date, u.name as purchaser_name 
            FROM groceries g
            JOIN users u ON g.purchased_by = u.user_id
            WHERE g.group_id = ?
            ORDER BY g.purchase_date DESC
        `, [groupId]);
        return rows;
    },

    async getGroceryById(groceryId) {
        const [rows] = await db.execute('SELECT * FROM groceries WHERE grocery_id = ?', [groceryId]);
        return rows[0];
    },

    async addGrocery(groupId, itemName, quantity, amount, purchasedBy, purchaseDate) {
        const [result] = await db.execute(
            'INSERT INTO groceries (group_id, item_name, quantity, amount, purchased_by, purchase_date) VALUES (?, ?, ?, ?, ?, ?)',
            [groupId, itemName, quantity, amount, purchasedBy, purchaseDate]
        );
        return result.insertId;
    },

    async updateGrocery(groceryId, itemName, quantity, amount) {
        await db.execute(
            'UPDATE groceries SET item_name = ?, quantity = ?, amount = ? WHERE grocery_id = ?',
            [itemName, quantity, amount, groceryId]
        );
    },

    async deleteGrocery(groceryId) {
        await db.execute('DELETE FROM groceries WHERE grocery_id = ?', [groceryId]);
    }
};

module.exports = GroceryModel;
