const db = require('../config/db');

const MealModel = {
    async getMealsByGroupAndDate(groupId, date) {
        const rows = await db.all(`
            SELECT m.meal_id, m.user_id, u.name, m.meal_type, m.is_attending, m.diet_preference, m.guest_count 
            FROM meals m
            JOIN users u ON m.user_id = u.user_id
            WHERE m.group_id = ? AND m.meal_date = ?
        `, [groupId, date]);
        return rows;
    },

    async getUserMeal(groupId, userId, date, mealType) {
        const rows = await db.all(`
            SELECT * FROM meals 
            WHERE group_id = ? AND user_id = ? AND meal_date = ? AND meal_type = ?
        `, [groupId, userId, date, mealType]);
        return rows[0];
    },

    async upsertMeal(groupId, userId, date, mealType, isAttending, dietPreference = 'veg', guestCount = 0) {
        // NOTE: We use check-then-insert/update instead of ON CONFLICT...DO UPDATE SET
        // because that syntax is SQLite-specific. MySQL requires ON DUPLICATE KEY UPDATE,
        // and the db proxy doesn't support multi-dialect upserts natively.
        const existing = await db.get(
            'SELECT meal_id FROM meals WHERE user_id = ? AND meal_date = ? AND meal_type = ?',
            [userId, date, mealType]
        );
        if (existing) {
            await db.run(
                'UPDATE meals SET is_attending = ?, diet_preference = ?, guest_count = ? WHERE meal_id = ?',
                [isAttending, dietPreference, guestCount, existing.meal_id]
            );
        } else {
            await db.run(
                'INSERT INTO meals (group_id, user_id, meal_date, meal_type, is_attending, diet_preference, guest_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [groupId, userId, date, mealType, isAttending, dietPreference, guestCount]
            );
        }
    }
};

module.exports = MealModel;
