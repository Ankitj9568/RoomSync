const request = require('supertest');
const { captchaSolution } = require('../helpers/captcha');

jest.mock('../../backend/models/userModel', () => {
    const users = new Map();
    let nextId = 1;
    return {
        findByEmail: async email => users.get(String(email).toLowerCase()),
        create: async ({ name, email, password_hash }) => {
            const user = { user_id: nextId++, name, email, password_hash };
            users.set(email.toLowerCase(), user);
            return user.user_id;
        },
        findById: async userId => [...users.values()].find(user => user.user_id === Number(userId)),
        findByIdWithHash: async userId => [...users.values()].find(user => user.user_id === Number(userId)),
        update: async () => {},
        updatePassword: async () => {},
        findOrCreateOAuthUser: async () => null
    };
});

jest.mock('../../backend/models/groupModel', () => ({
    getUserGroups: async () => [],
    isMember: jest.fn(async () => null)
}));

jest.mock('../../backend/models/groceryModel', () => ({
    getGroceriesByGroup: jest.fn(async () => []),
    getGroceryById: jest.fn(async () => null),
    addGrocery: jest.fn(async () => 1),
    updateGrocery: jest.fn(async () => {}),
    deleteGrocery: jest.fn(async () => {})
}));

jest.mock('../../backend/models/activityLogModel', () => ({
    create: jest.fn(async () => 1)
}));

const app = require('../../backend/server');
const GroupModel = require('../../backend/models/groupModel');

describe('grocery membership guards', () => {
    let agent;

    beforeAll(async () => {
        agent = request.agent(app);
        await agent.post('/api/auth/register').send({ name: 'Grocery User', email: `grocery${Date.now()}@test.com`, password: 'password123', ...await captchaSolution(agent) });
    });

    test('removed members cannot edit or delete old groceries', async () => {
        GroupModel.isMember.mockResolvedValue(null);
        const grocery = { grocery_id: 3, group_id: 1, purchased_by: 999, item_name: 'Rice', purchase_date: '2026-10-02' };
        const GroceryModel = require('../../backend/models/groceryModel');
        GroceryModel.getGroceryById.mockResolvedValue(grocery);

        const updated = await agent.put('/api/groceries/3').send({ item_name: 'Rice' });
        expect(updated.statusCode).toEqual(403);
        expect(updated.body.message).toBe('NOT_A_MEMBER');

        const deleted = await agent.delete('/api/groceries/3');
        expect(deleted.statusCode).toEqual(403);
        expect(deleted.body.message).toBe('NOT_A_MEMBER');
    });

    test('non-purchasers still cannot touch others groceries', async () => {
        GroupModel.isMember.mockResolvedValue({ role: 'member' });
        const GroceryModel = require('../../backend/models/groceryModel');
        GroceryModel.getGroceryById.mockResolvedValue({ grocery_id: 4, group_id: 1, purchased_by: 999, item_name: 'Dal', purchase_date: '2026-10-02' });

        const res = await agent.put('/api/groceries/4').send({ item_name: 'Dal' });
        expect(res.statusCode).toEqual(403);
        expect(res.body.message).toBe('NOT_PURCHASER');
    });
});
