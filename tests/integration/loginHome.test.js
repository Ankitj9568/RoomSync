const request = require('supertest');

// The login page asks the role first, but the landing is decided from the
// verified account — never from what the form claimed.
jest.mock('../../backend/models/userModel', () => {
    const users = new Map();
    let nextId = 1;
    return {
        findByEmail: async email => users.get(String(email).toLowerCase()),
        create: async ({ name, email, password_hash, account_type }) => {
            const user = { user_id: nextId++, name, email, password_hash, account_type: account_type || 'roommate' };
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
    getUserGroups: jest.fn(async () => []),
    isMember: jest.fn(async () => null)
}));

const app = require('../../backend/server');
const GroupModel = require('../../backend/models/groupModel');

describe('role-checked login landing', () => {
    test('roommates land on the dashboard even when staff was selected', async () => {
        GroupModel.getUserGroups.mockResolvedValue([]);
        const email = `landing${Date.now()}@test.com`;
        await request(app).post('/api/auth/register').send({ name: 'Landing', email, password: 'password123' });
        const res = await request(app).post('/api/auth/login').send({ email, password: 'password123', as: 'staff' });
        expect(res.statusCode).toEqual(200);
        expect(res.body.data.home).toBe('/pages/dashboard.html');
    });

    test('staff-only accounts land on tasks', async () => {
        GroupModel.getUserGroups.mockResolvedValue([{ group_id: 1, role: 'staff' }]);
        const email = `stafflanding${Date.now()}@test.com`;
        await request(app).post('/api/auth/register').send({ name: 'Staff Landing', email, password: 'password123', account_type: 'staff' });
        const res = await request(app).post('/api/auth/login').send({ email, password: 'password123', as: 'staff' });
        expect(res.statusCode).toEqual(200);
        expect(res.body.data.home).toBe('/pages/tasks.html');
    });
});
