const request = require('supertest');

// Logout must fully terminate the session: the response clears the session
// cookie, and the old cookie no longer authenticates afterwards.
jest.mock('../../models/userModel', () => {
    const users = new Map();
    let nextId = 1;
    return {
        findByEmail: async email => users.get(String(email).toLowerCase()),
        create: async ({ name, email, password_hash }) => {
            const user = { user_id: nextId++, name, email, password_hash, phone: null, upi_id: null };
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

const app = require('../../server');

jest.mock('../../models/groupModel', () => ({
    getUserGroups: async () => []
}));

describe('logout terminates the session', () => {
    const email = `logout${Date.now()}@test.com`;

    test('logout clears the session cookie and the session stops working', async () => {
        const agent = request.agent(app);
        await agent.post('/api/auth/register').send({ name: 'Logout User', email, password: 'password123' });

        const authed = await agent.get('/api/users/me');
        expect(authed.statusCode).toEqual(200);

        const logoutRes = await agent.post('/api/auth/logout');
        expect(logoutRes.statusCode).toEqual(200);
        const setCookie = (logoutRes.headers['set-cookie'] || []).join(';');
        expect(setCookie).toMatch(/roomsync\.session=/);
        // Clearing is expressed as an empty value expiring in the past.
        expect(setCookie).toMatch(/1970/);

        const after = await agent.get('/api/users/me');
        expect(after.statusCode).toEqual(401);
    });

    test('api responses are never cacheable', async () => {
        const res = await request(app).get('/api/auth/google');
        expect(res.headers['cache-control']).toBe('no-store');
    });
});
