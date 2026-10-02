const prisma = require('../config/prisma');
const { dateOnly } = require('../utils/prismaFormat');

function menuRow(menu) {
    return menu && { menu_id: menu.menuId, group_id: menu.groupId, menu_date: dateOnly(menu.menuDate), meal_type: menu.mealType, veg_item: menu.vegItem, nonveg_item: menu.nonvegItem };
}

const MenuModel = {
    async getMenuByGroupAndDate(groupId, date) {
        const menus = await prisma.dailyMenu.findMany({
            where: { groupId: Number(groupId), menuDate: new Date(`${date}T00:00:00.000Z`) },
            orderBy: { mealType: 'asc' }
        });
        return menus.sort((a, b) => (a.mealType === 'lunch' ? 0 : 1) - (b.mealType === 'lunch' ? 0 : 1)).map(menuRow);
    },

    async upsertMenu(groupId, date, mealType, vegItem, nonvegItem) {
        await prisma.dailyMenu.upsert({
            where: { groupId_menuDate_mealType: { groupId: Number(groupId), menuDate: new Date(`${date}T00:00:00.000Z`), mealType } },
            create: { groupId: Number(groupId), menuDate: new Date(`${date}T00:00:00.000Z`), mealType, vegItem, nonvegItem: nonvegItem || null },
            update: { vegItem, nonvegItem: nonvegItem || null }
        });
    }
};

module.exports = MenuModel;
