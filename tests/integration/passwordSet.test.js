const request = require('supertest');
const { captchaSolution } = require('../helpers/captcha');

// Google-only accounts (no password hash) can set their first password with
// just the session; password accounts still need the current one.
jest.mock('../../backend/models/userModel', () => {
    const users = new Map();
    let nextId = 1;
    return {
        findByEmail: async email => users.get(String(email).toLowerCase()),
        create: async ({ name, email, password_hash }) => {
            const user = { user_id: nextId++, name, email, password_hash: password_hash || null };
            users.set(email.toLowerCase(), user);
            return user.user_id;
        },
        findById: async userId => [...users.values()].find(user => user.user_id === Number(userId)),
        findByIdWithHash: async userId => [...users.values()].find(user => user.user_id === Number(userId)),
        update: async () => {},
        updatePassword: async (userId, passwordHash) => {
            const user = [...users.values()].find(item => item.user_id === Number(userId));
            if (user) user.password_hash = passwordHash;
        },
        __setHash: (userId, hash) => {
            const user = [...users.values()].find(item => item.user_id === Number(userId));
            if (user) user.password_hash = hash;
        },
        findOrCreateOAuthUser: async () => null
    };
});

jest.mock('../../backend/models/groupModel', () => ({
    getUserGroups: async () => []
}));

const app = require('../../backend/server');
const UserModel = require('../../backend/models/userModel');

describe('password set and change', () => {
    test('password-less accounts set a first password without the current one', async () => {
        const agent = request.agent(app);
        const email = `oauthonly${Date.now()}@test.com`;
        const reg = await agent.post('/api/auth/register').send({ name: 'OAuth Only', email, password: 'password123', ...await captchaSolution(agent) });
        // Simulate a Google-only account: wipe the hash post-registration.
        UserModel.__setHash(reg.body.data.user_id, null);
        const res = await agent.put('/api/users/me/password').send({ newPassword: 'firstpass456' });
        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toBe('Password set successfully');
    });

    test('password accounts still need the current one', async () => {
        const agent = request.agent(app);
        const email = `haspw${Date.now()}@test.com`;
        await agent.post('/api/auth/register').send({ name: 'Has Pw', email, password: 'password123', ...await captchaSolution(agent) });
        const missing = await agent.put('/api/users/me/password').send({ newPassword: 'newpass456' });
        expect(missing.statusCode).toEqual(400);
        const changed = await agent.put('/api/users/me/password').send({ currentPassword: 'password123', newPassword: 'newpass456' });
        expect(changed.statusCode).toEqual(200);
    });
});
