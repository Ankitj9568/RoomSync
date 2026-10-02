const prisma = require('../config/prisma');
const { timestamp } = require('../utils/prismaFormat');

function itemRow(item) {
    return item && {
        item_id: item.itemId,
        group_id: item.groupId,
        item_name: item.itemName,
        assigned_to: item.assignedToId,
        status: item.status,
        created_at: timestamp(item.createdAt)
    };
}

const ShoppingListModel = {
    async getListByGroup(groupId) {
        const items = await prisma.shoppingList.findMany({
            where: { groupId: Number(groupId) },
            include: { assignedTo: true },
            orderBy: { createdAt: 'desc' }
        });
        return items.map(item => ({ ...itemRow(item), assigned_name: item.assignedTo ? item.assignedTo.name : null }));
    },

    async getItemById(itemId) {
        return itemRow(await prisma.shoppingList.findUnique({ where: { itemId: Number(itemId) } }));
    },

    async addItem(groupId, itemName, assignedTo) {
        const item = await prisma.shoppingList.create({ data: { groupId: Number(groupId), itemName, assignedToId: assignedTo ? Number(assignedTo) : null } });
        return item.itemId;
    },

    async updateItem(itemId, itemName, assignedTo, status) {
        await prisma.shoppingList.update({ where: { itemId: Number(itemId) }, data: { itemName, assignedToId: assignedTo ? Number(assignedTo) : null, status } });
    },

    async deleteItem(itemId) {
        await prisma.shoppingList.delete({ where: { itemId: Number(itemId) } });
    }
};

module.exports = ShoppingListModel;
