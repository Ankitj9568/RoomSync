const MealModel = require('../models/mealModel');
const GroupModel = require('../models/groupModel');
const { isValidDate, isValidTime, todayInTimeZone } = require('../utils/validation');

const mealController = {
    async getMeals(req, res) {
        try {
            const { group_id } = req.query;
            const date = req.query.date || req.query.meal_date;
            const userId = req.session.userId;
            
            if (!group_id || !date || !isValidDate(date)) {
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

            if (!group_id || !meal_date || !isValidDate(meal_date) || !meal_type || is_attending === undefined) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }

            if (!['lunch', 'dinner'].includes(meal_type)) {
                return res.status(400).json({ success: false, message: 'Invalid meal type' });
            }

            const isMember = await GroupModel.isMember(group_id, userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }

            // Check cutoff time — use IST (Asia/Kolkata) since users are in India
            const settings = await GroupModel.getSettings(group_id);
            const cutoffTime = settings ? settings.meal_cutoff_time : '10:00:00';
            if (!isValidTime(cutoffTime)) return res.status(500).json({ success: false, message: 'Invalid group cutoff configuration' });
            const now = new Date();

            // Get current time in IST regardless of server timezone
            const ISTString = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
            const ISTDate = new Date(ISTString);
            const todayIST = todayInTimeZone('Asia/Kolkata');
            
            if (meal_date === todayIST) {
                const currentHour = ISTDate.getHours();
                const currentMin = ISTDate.getMinutes();
                const [cutoffHour, cutoffMin] = cutoffTime.split(':').map(Number);

                if (currentHour > cutoffHour || (currentHour === cutoffHour && currentMin >= cutoffMin)) {
                    return res.status(403).json({ success: false, message: 'Past cutoff time' });
                }
            } else if (meal_date < todayIST) {
                return res.status(403).json({ success: false, message: 'Cannot edit past meals' });
            }

            const guestCount = Number.isInteger(Number(guest_count)) && Number(guest_count) >= 0 ? Number(guest_count) : 0;
            const diet = ['veg', 'non-veg', 'egg'].includes(diet_preference) ? diet_preference : 'veg';
            const attending = is_attending === true || is_attending === 1 || String(is_attending).toLowerCase() === 'true' || String(is_attending) === '1';
            await MealModel.upsertMeal(group_id, userId, meal_date, meal_type, attending ? 1 : 0, diet, guestCount);
            res.json({ success: true, message: 'Meal preference updated' });
        } catch (error) {
            console.error('Toggle meal error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async updateMeal(req, res) {
        try {
            const meal = await MealModel.getMealById(req.params.id);
            if (!meal) return res.status(404).json({ success: false, message: 'MEAL_NOT_FOUND' });
            if (Number(meal.user_id) !== Number(req.session.userId)) return res.status(403).json({ success: false, message: 'Only the meal owner can edit this record' });
            req.body.group_id = meal.group_id;
            req.body.meal_date = meal.meal_date;
            req.body.meal_type = meal.meal_type;
            if (req.body.is_attending === undefined) return res.status(400).json({ success: false, message: 'is_attending is required' });
            return mealController.toggleMeal(req, res);
        } catch (error) {
            console.error('Update meal error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },
    async getMenu(req, res) {
        try {
            const { group_id } = req.query;
            const date = req.query.date || req.query.menu_date;
            const userId = req.session.userId;
            
            if (!group_id || !date || !isValidDate(date)) {
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

            if (!group_id || !date || !isValidDate(date) || !type || !['lunch', 'dinner'].includes(type) || !veg_item) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
            if (veg_item.length > 200 || (nonveg_item && nonveg_item.length > 200)) {
                return res.status(400).json({ success: false, message: 'Menu item names are too long' });
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
