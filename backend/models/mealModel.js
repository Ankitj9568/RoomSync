const prisma = require('../config/prisma');
const { dateOnly } = require('../utils/prismaFormat');

function mealRow(meal) {
    return meal && {
        meal_id: meal.mealId,
        group_id: meal.groupId,
        user_id: meal.userId,
        meal_date: dateOnly(meal.mealDate),
        meal_type: meal.mealType,
        is_attending: meal.isAttending,
        diet_preference: meal.dietPreference,
        guest_count: meal.guestCount
    };
}

const MealModel = {
    async getMealsByGroupAndDate(groupId, date) {
        const meals = await prisma.meal.findMany({ where: { groupId: Number(groupId), mealDate: new Date(`${date}T00:00:00.000Z`) }, include: { user: true } });
        return meals.map(meal => ({ ...mealRow(meal), name: meal.user.name }));
    },

    async getUserMeal(groupId, userId, date, mealType) {
        return mealRow(await prisma.meal.findUnique({ where: { groupId_userId_mealDate_mealType: { groupId: Number(groupId), userId: Number(userId), mealDate: new Date(`${date}T00:00:00.000Z`), mealType } } }));
    },

    async getMealById(mealId) {
        return mealRow(await prisma.meal.findUnique({ where: { mealId: Number(mealId) } }));
    },

    async upsertMeal(groupId, userId, date, mealType, isAttending, dietPreference = 'veg', guestCount = 0) {
        await prisma.meal.upsert({
            where: { groupId_userId_mealDate_mealType: { groupId: Number(groupId), userId: Number(userId), mealDate: new Date(`${date}T00:00:00.000Z`), mealType } },
            create: { groupId: Number(groupId), userId: Number(userId), mealDate: new Date(`${date}T00:00:00.000Z`), mealType, isAttending: Boolean(isAttending), dietPreference, guestCount },
            update: { isAttending: Boolean(isAttending), dietPreference, guestCount }
        });
    }
};

module.exports = MealModel;
