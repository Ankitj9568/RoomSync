const db = require('../config/db');

const GroceryModel = {
    async getGroceriesByGroup(groupId) {
        // Fetch groceries
        const rows = await db.all(`
            SELECT g.grocery_id, g.item_name, g.quantity, g.amount, g.purchased_by, 
                   g.purchase_date, u.name as purchaser_name 
            FROM groceries g
            JOIN users u ON g.purchased_by = u.user_id
            WHERE g.group_id = ?
            ORDER BY g.purchase_date DESC
        `, [groupId]);

        if (rows.length === 0) return [];

        // Fetch contributors for these groceries
        const groceryIds = rows.map(r => r.grocery_id);
        const placeholders = groceryIds.map(() => '?').join(',');
        const contributors = await db.all(`
            SELECT gc.grocery_id, gc.user_id, gc.amount_paid, u.name 
            FROM grocery_contributors gc
            JOIN users u ON gc.user_id = u.user_id
            WHERE gc.grocery_id IN (${placeholders})
        `, groceryIds);

        // Map contributors to groceries
        const contributorsByGrocery = {};
        contributors.forEach(c => {
            if (!contributorsByGrocery[c.grocery_id]) {
                contributorsByGrocery[c.grocery_id] = [];
            }
            contributorsByGrocery[c.grocery_id].push({
                user_id: c.user_id,
                name: c.name,
                amount_paid: c.amount_paid
            });
        });

        rows.forEach(r => {
            r.contributors = contributorsByGrocery[r.grocery_id] || [];
        });

        return rows;
    },

    async getGroceryById(groceryId) {
        const rows = await db.all('SELECT * FROM groceries WHERE grocery_id = ?', [groceryId]);
        return rows[0];
    },

    async addGrocery(groupId, itemName, quantity, amount, purchasedBy, purchaseDate, contributors) {
        try {
            await db.run('BEGIN TRANSACTION');

            const result = await db.run(
                'INSERT INTO groceries (group_id, item_name, quantity, amount, purchased_by, purchase_date) VALUES (?, ?, ?, ?, ?, ?)',
                [groupId, itemName, quantity, amount, purchasedBy, purchaseDate]
            );
            const groceryId = result.lastID;

            if (contributors && contributors.length > 0) {
                for (const c of contributors) {
                    await db.run(
                        'INSERT INTO grocery_contributors (grocery_id, user_id, amount_paid) VALUES (?, ?, ?)',
                        [groceryId, c.user_id, c.amount_paid]
                    );
                }
            } else {
                // If no contributors array, purchaser paid everything
                await db.run(
                    'INSERT INTO grocery_contributors (grocery_id, user_id, amount_paid) VALUES (?, ?, ?)',
                    [groceryId, purchasedBy, amount]
                );
            }

            await db.run('COMMIT');
            return groceryId;
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    },

    async updateGrocery(groceryId, itemName, quantity, amount) {
        await db.run(
            'UPDATE groceries SET item_name = ?, quantity = ?, amount = ? WHERE grocery_id = ?',
            [itemName, quantity, amount, groceryId]
        );
    },

    async deleteGrocery(groceryId) {
        await db.run('DELETE FROM groceries WHERE grocery_id = ?', [groceryId]);
    }
};

module.exports = GroceryModel;
