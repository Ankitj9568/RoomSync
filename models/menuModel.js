const db = require('../config/db');

const MenuModel = {
    async getMenuByGroupAndDate(groupId, date) {
        const rows = await db.all(`
            SELECT * FROM daily_menus 
            WHERE group_id = ? AND menu_date = ?
        `, [groupId, date]);
        return rows;
    },

    async upsertMenu(groupId, date, mealType, vegItem, nonvegItem) {
        // NOTE: ON CONFLICT...DO UPDATE SET is SQLite-only. Use portable pattern.
        const existing = await db.get(
            'SELECT menu_id FROM daily_menus WHERE group_id = ? AND menu_date = ? AND meal_type = ?',
            [groupId, date, mealType]
        );
        if (existing) {
            await db.run(
                'UPDATE daily_menus SET veg_item = ?, nonveg_item = ? WHERE menu_id = ?',
                [vegItem, nonvegItem, existing.menu_id]
            );
        } else {
            await db.run(
                'INSERT INTO daily_menus (group_id, menu_date, meal_type, veg_item, nonveg_item) VALUES (?, ?, ?, ?, ?)',
                [groupId, date, mealType, vegItem, nonvegItem]
            );
        }
    }
};

module.exports = MenuModel;
