const prisma = require('../config/prisma');
const { number, dateOnly, timestamp } = require('../utils/prismaFormat');

function groceryRow(grocery) {
    return grocery && {
        grocery_id: grocery.groceryId,
        group_id: grocery.groupId,
        item_name: grocery.itemName,
        quantity: grocery.quantity,
        amount: number(grocery.amount),
        purchased_by: grocery.purchasedById,
        purchase_date: dateOnly(grocery.purchaseDate),
        created_at: timestamp(grocery.createdAt)
    };
}

const GroceryModel = {
    async getGroceriesByGroup(groupId) {
        const groceries = await prisma.grocery.findMany({
            where: { groupId: Number(groupId) },
            include: { purchasedBy: true, contributors: { include: { user: true } } },
            orderBy: { purchaseDate: 'desc' }
        });
        return groceries.map(grocery => ({
            ...groceryRow(grocery),
            purchaser_name: grocery.purchasedBy.name,
            contributors: grocery.contributors.map(contributor => ({
                user_id: contributor.userId,
                name: contributor.user.name,
                amount_paid: number(contributor.amountPaid)
            }))
        }));
    },

    async getGroceryById(groceryId) {
        return groceryRow(await prisma.grocery.findUnique({ where: { groceryId: Number(groceryId) } }));
    },

    async addGrocery(groupId, itemName, quantity, amount, purchasedBy, purchaseDate, contributors) {
        const grocery = await prisma.$transaction(async tx => {
            const created = await tx.grocery.create({
                data: {
                    groupId: Number(groupId), itemName, quantity: quantity || null,
                    amount, purchasedById: Number(purchasedBy), purchaseDate: new Date(`${purchaseDate}T00:00:00.000Z`),
                    contributors: { create: (contributors && contributors.length > 0 ? contributors : [{ user_id: purchasedBy, amount_paid: amount }]).map(contributor => ({ userId: Number(contributor.user_id), amountPaid: contributor.amount_paid })) }
                }
            });
            return created;
        });
        return grocery.groceryId;
    },

    async updateGrocery(groceryId, itemName, quantity, amount, contributors = []) {
        await prisma.$transaction(async tx => {
            await tx.grocery.update({ where: { groceryId: Number(groceryId) }, data: { itemName, quantity: quantity || null, amount } });
            await tx.groceryContributor.deleteMany({ where: { groceryId: Number(groceryId) } });
            if (contributors.length > 0) {
                await tx.groceryContributor.createMany({
                    data: contributors.map(contributor => ({ groceryId: Number(groceryId), userId: Number(contributor.user_id), amountPaid: contributor.amount_paid }))
                });
            }
        });
    },

    async deleteGrocery(groceryId) {
        await prisma.grocery.delete({ where: { groceryId: Number(groceryId) } });
    }
};

module.exports = GroceryModel;
