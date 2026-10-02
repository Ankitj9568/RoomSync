/*
 * One-time data migration from the existing MySQL deployment to PostgreSQL.
 * Run only after `npx prisma migrate deploy` has created the PostgreSQL schema:
 *   MYSQL_DATABASE_URL="mysql://..." DATABASE_URL="postgresql://..." npm run db:migrate:mysql-to-postgres
 */
const mysql = require('mysql2/promise');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function dateOnly(value) {
    if (!value) return value;
    return new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
}

function timestamp(value) {
    return value ? new Date(value) : new Date();
}

function bool(value) {
    return value === true || value === 1 || String(value).toLowerCase() === 'true';
}

async function rows(connection, table) {
    const [result] = await connection.query(`SELECT * FROM \`${table}\``);
    return result;
}

async function assertTargetIsEmpty() {
    const [users, groups] = await Promise.all([
        prisma.user.count(),
        prisma.group.count()
    ]);
    if (users > 0 || groups > 0) {
        throw new Error('Target PostgreSQL database is not empty. Aborting to prevent duplicate data.');
    }
}

async function migrate() {
    const sourceUrl = process.env.MYSQL_DATABASE_URL;
    if (!sourceUrl) throw new Error('MYSQL_DATABASE_URL is required for the source MySQL database.');
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for the target PostgreSQL database.');

    const source = await mysql.createConnection(sourceUrl);
    try {
        await assertTargetIsEmpty();
        const data = {};
        for (const table of ['users', 'groups', 'group_members', 'group_settings', 'groceries', 'grocery_contributors', 'shopping_list', 'meals', 'daily_menus', 'expenses', 'expense_payers', 'expense_members', 'payments', 'adjustments', 'join_requests', 'activity_logs']) {
            data[table] = await rows(source, table);
        }

        await prisma.$transaction(async tx => {
            await tx.user.createMany({ data: data.users.map(row => ({
                userId: row.user_id, name: row.name, email: row.email, passwordHash: row.password_hash || null,
                upiId: row.upi_id || null, phone: row.phone || null, avatarUrl: row.avatar_url || null,
                emailVerified: row.email_verified === undefined ? false : bool(row.email_verified), createdAt: timestamp(row.created_at)
            })) });
            await tx.group.createMany({ data: data.groups.map(row => ({ groupId: row.group_id, groupName: row.group_name, groupCode: row.group_code, createdById: row.created_by, createdAt: timestamp(row.created_at) })) });
            await tx.groupMember.createMany({ data: data.group_members.map(row => ({ groupMemberId: row.group_member_id, groupId: row.group_id, userId: row.user_id, role: row.role || 'member', monthlyBudget: row.monthly_budget || 0, joinedAt: timestamp(row.joined_at) })) });
            await tx.groupSettings.createMany({ data: data.group_settings.map(row => ({ groupId: row.group_id, mealCutoffTime: row.meal_cutoff_time || '10:00:00', allowDirectJoin: row.allow_direct_join === undefined ? true : bool(row.allow_direct_join) })) });
            await tx.grocery.createMany({ data: data.groceries.map(row => ({ groceryId: row.grocery_id, groupId: row.group_id, itemName: row.item_name, quantity: row.quantity || null, amount: row.amount, purchasedById: row.purchased_by, purchaseDate: dateOnly(row.purchase_date), createdAt: timestamp(row.created_at) })) });
            await tx.groceryContributor.createMany({ data: data.grocery_contributors.map(row => ({ contributorId: row.contributor_id, groceryId: row.grocery_id, userId: row.user_id, amountPaid: row.amount_paid })) });
            await tx.shoppingList.createMany({ data: data.shopping_list.map(row => ({ itemId: row.item_id, groupId: row.group_id, itemName: row.item_name, assignedToId: row.assigned_to || null, status: row.status || 'pending', createdAt: timestamp(row.created_at) })) });
            await tx.meal.createMany({ data: data.meals.map(row => ({ mealId: row.meal_id, groupId: row.group_id, userId: row.user_id, mealDate: dateOnly(row.meal_date), mealType: row.meal_type, isAttending: bool(row.is_attending), dietPreference: row.diet_preference || 'veg', guestCount: Number(row.guest_count || 0) })) });
            await tx.dailyMenu.createMany({ data: data.daily_menus.map(row => ({ menuId: row.menu_id, groupId: row.group_id, menuDate: dateOnly(row.menu_date), mealType: row.meal_type, vegItem: row.veg_item, nonvegItem: row.nonveg_item || null })) });
            await tx.expense.createMany({ data: data.expenses.map(row => ({ expenseId: row.expense_id, groupId: row.group_id, title: row.title, description: row.description || null, amount: row.amount, category: row.category || 'other', expenseType: row.expense_type || 'ad_hoc', splitType: row.split_type || 'equal', expenseDate: dateOnly(row.expense_date), createdAt: timestamp(row.created_at) })) });
            await tx.expensePayer.createMany({ data: data.expense_payers.map(row => ({ expensePayerId: row.expense_payer_id, expenseId: row.expense_id, userId: row.user_id, amountPaid: row.amount_paid })) });
            await tx.expenseMember.createMany({ data: data.expense_members.map(row => ({ expenseMemberId: row.expense_member_id, expenseId: row.expense_id, userId: row.user_id, shareAmount: row.share_amount })) });
            await tx.payment.createMany({ data: data.payments.map(row => ({ paymentId: row.payment_id, groupId: row.group_id, paidById: row.paid_by, paidToId: row.paid_to, amount: row.amount, paymentMode: row.payment_mode, note: row.note || null, paymentDate: dateOnly(row.payment_date), status: row.status || 'pending', createdAt: timestamp(row.created_at) })) });
            await tx.adjustment.createMany({ data: data.adjustments.map(row => ({ adjustmentId: row.adjustment_id, groupId: row.group_id, fromUserId: row.from_user, toUserId: row.to_user, amount: row.amount, reason: row.reason, createdById: row.created_by, createdAt: timestamp(row.created_at) })) });
            await tx.joinRequest.createMany({ data: data.join_requests.map(row => ({ requestId: row.request_id, groupId: row.group_id, userId: row.user_id, status: row.status || 'pending', createdAt: timestamp(row.created_at) })) });
            await tx.activityLog.createMany({ data: data.activity_logs.map(row => ({ logId: row.log_id, groupId: row.group_id, userId: row.user_id || null, action: row.action, description: row.description, createdAt: timestamp(row.created_at) })) });
        });

        for (const [table, column] of [['users', 'user_id'], ['groups', 'group_id'], ['group_members', 'group_member_id'], ['groceries', 'grocery_id'], ['grocery_contributors', 'contributor_id'], ['shopping_list', 'item_id'], ['meals', 'meal_id'], ['daily_menus', 'menu_id'], ['expenses', 'expense_id'], ['expense_payers', 'expense_payer_id'], ['expense_members', 'expense_member_id'], ['payments', 'payment_id'], ['adjustments', 'adjustment_id'], ['join_requests', 'request_id'], ['activity_logs', 'log_id']]) {
            await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'), COALESCE(MAX("${column}"), 1), MAX("${column}") IS NOT NULL) FROM "${table}"`);
        }
        console.log('MySQL data migrated to PostgreSQL successfully.');
    } finally {
        await source.end();
        await prisma.$disconnect();
    }
}

migrate().catch(error => {
    console.error('MySQL-to-PostgreSQL migration failed:', error.message);
    prisma.$disconnect().finally(() => process.exit(1));
});
