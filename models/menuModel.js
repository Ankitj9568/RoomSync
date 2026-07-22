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
        await db.run(`
            INSERT INTO daily_menus (group_id, menu_date, meal_type, veg_item, nonveg_item)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(group_id, menu_date, meal_type) DO UPDATE SET
                veg_item = excluded.veg_item,
                nonveg_item = excluded.nonveg_item
        `, [groupId, date, mealType, vegItem, nonvegItem]);
    }
};

module.exports = MenuModel;
