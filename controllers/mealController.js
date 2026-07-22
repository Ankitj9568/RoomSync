const MealModel = require('../models/mealModel');
const GroupModel = require('../models/groupModel');

const mealController = {
    async getMeals(req, res) {
        try {
            const { group_id, date } = req.query;
            const userId = req.session.userId;
            
            if (!group_id || !date) {
                return res.status(400).json({ success: false, message: 'group_id and date are required' });
            }

            const isMember = await GroupModel.isMember(group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            const meals = await MealModel.getMealsByGroupAndDate(group_id, date);
            res.json({ success: true, data: meals });
        } catch (error) {
            console.error('Get meals error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async toggleMeal(req, res) {
        try {
            const { group_id, meal_date, meal_type, is_attending, diet_preference, guest_count } = req.body;
            const userId = req.session.userId;

            if (!group_id || !meal_date || !meal_type || is_attending === undefined) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }

            if (!['lunch', 'dinner'].includes(meal_type)) {
                return res.status(400).json({ success: false, message: 'Invalid meal type' });
            }

            const isMember = await GroupModel.isMember(group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            // Check cutoff time
            const settings = await GroupModel.getSettings(group_id);
            const cutoffTime = settings ? settings.meal_cutoff_time : '10:00:00';
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            
            if (meal_date === todayStr) {
                const currentHour = now.getHours();
                const currentMin = now.getMinutes();
                const [cutoffHour, cutoffMin] = cutoffTime.split(':').map(Number);

                if (currentHour > cutoffHour || (currentHour === cutoffHour && currentMin >= cutoffMin)) {
                    return res.status(403).json({ success: false, message: 'Past cutoff time' });
                }
            } else if (meal_date < todayStr) {
                return res.status(403).json({ success: false, message: 'Cannot edit past meals' });
            }

            await MealModel.upsertMeal(group_id, userId, meal_date, meal_type, is_attending, diet_preference, guest_count);
            res.json({ success: true, message: 'Meal preference updated' });
        } catch (error) {
            console.error('Toggle meal error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },
    async getMenu(req, res) {
        try {
            const { group_id, date } = req.query;
            const userId = req.session.userId;
            
            if (!group_id || !date) {
                return res.status(400).json({ success: false, message: 'group_id and date are required' });
            }

            const isMember = await GroupModel.isMember(group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            const MenuModel = require('../models/menuModel');
            const menu = await MenuModel.getMenuByGroupAndDate(group_id, date);
            res.json({ success: true, data: menu });
        } catch (error) {
            console.error('Get menu error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async saveMenu(req, res) {
        try {
            const { group_id, date, type, veg_item, nonveg_item } = req.body;
            const userId = req.session.userId;

            if (!group_id || !date || !type || !veg_item) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }

            const isMember = await GroupModel.isMember(group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            const MenuModel = require('../models/menuModel');
            await MenuModel.upsertMenu(group_id, date, type, veg_item, nonveg_item);
            res.json({ success: true, message: 'Menu updated successfully' });
        } catch (error) {
            console.error('Save menu error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = mealController;
