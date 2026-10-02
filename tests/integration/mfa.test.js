const request = require('supertest');
const { generateToken } = require('../../backend/utils/totp');

jest.mock('../../backend/models/userModel', () => {
    const users = new Map();
    let nextId = 1;
    const byId = id => [...users.values()].find(user => user.user_id === Number(id));
    return {
        findByEmail: async email => {
            const user = users.get(String(email).toLowerCase());
            return user ? { ...user, password_hash: user.password_hash } : undefined;
        },
        create: async ({ name, email, password_hash, account_type }) => {
            const user = {
                user_id: nextId++, name, email, password_hash,
                phone: null, upi_id: null, account_type: account_type || 'roommate', totpSecret: null, mfaEnabled: false
            };
            users.set(email.toLowerCase(), user);
            return user.user_id;
        },
        findById: async userId => byId(userId),
        findByIdWithHash: async userId => byId(userId),
        update: async () => {},
        updatePassword: async () => {},
        getMfa: async userId => {
            const user = byId(userId);
            return user ? { totpSecret: user.totpSecret, mfaEnabled: user.mfaEnabled } : null;
        },
        setTotpSecret: async (userId, secret) => {
            const user = byId(userId);
            if (user) user.totpSecret = secret;
        },
        setMfaEnabled: async (userId, enabled) => {
            const user = byId(userId);
            if (user) {
                user.mfaEnabled = Boolean(enabled);
                if (!enabled) user.totpSecret = null;
            }
        },
        __getUser: byId,
        findOrCreateOAuthUser: async () => null
    };
});

jest.mock('../../backend/models/groupModel', () => ({
    getUserGroups: jest.fn(async () => []),
    isMember: jest.fn(async () => null)
}));

const app = require('../../backend/server');
const GroupModel = require('../../backend/models/groupModel');
const UserModel = require('../../backend/models/userModel');

describe('owner multi-factor authentication', () => {
    const email = `owner${Date.now()}@test.com`;
    const password = 'password123';

    beforeAll(async () => {
        await request(app).post('/api/auth/register').send({ name: 'PG Owner', email, password });
    });

    test('non-owners log in without MFA', async () => {
        GroupModel.getUserGroups.mockResolvedValue([]);
        const res = await request(app).post('/api/auth/login').send({ email, password });
        expect(res.statusCode).toEqual(200);
        expect(res.body.mfaRequired).toBeFalsy();
        expect(res.body.mfaSetupRequired).toBeFalsy();
    });

    test('owner accounts need MFA even before owning a group', async () => {
        GroupModel.getUserGroups.mockResolvedValue([]);
        const ownerEmail = `acctowner${Date.now()}@test.com`;
        await request(app).post('/api/auth/register').send({ name: 'Acct Owner', email: ownerEmail, password, account_type: 'owner' });
        const res = await request(app).post('/api/auth/login').send({ email: ownerEmail, password });
        expect(res.statusCode).toEqual(200);
        expect(res.body.mfaSetupRequired).toBe(true);
    });

    test('owners must enroll before entering', async () => {
        GroupModel.getUserGroups.mockResolvedValue([{ group_id: 1, role: 'owner' }]);
        const agent = request.agent(app);
        const login = await agent.post('/api/auth/login').send({ email, password });
        expect(login.statusCode).toEqual(200);
        expect(login.body.mfaSetupRequired).toBe(true);

        // The restricted session cannot reach the app yet.
        const blocked = await agent.get('/api/groups');
        expect(blocked.statusCode).toEqual(401);
        expect(blocked.body.message).toBe('MFA_REQUIRED');

        // Enroll with a real TOTP code.
        const setup = await agent.post('/api/auth/mfa/setup').send({});
        expect(setup.statusCode).toEqual(200);
        const token = generateToken(setup.body.data.secret);
        const confirm = await agent.post('/api/auth/mfa/confirm').send({ token });
        expect(confirm.statusCode).toEqual(200);

        // Full access after enrollment.
        const allowed = await agent.get('/api/auth/mfa/status');
        expect(allowed.statusCode).toEqual(200);
        expect(allowed.body.data).toEqual({ required: true, enabled: true });
    });

    test('owners with MFA enabled face a challenge at login', async () => {
        GroupModel.getUserGroups.mockResolvedValue([{ group_id: 1, role: 'owner' }]);
        const agent = request.agent(app);
        const login = await agent.post('/api/auth/login').send({ email, password });
        expect(login.body.mfaRequired).toBe(true);

        const wrong = await agent.post('/api/auth/mfa/challenge').send({ token: '000000' });
        expect(wrong.statusCode).toEqual(401);

        // A correct TOTP code completes the login.
        const user = await UserModel.findByEmail(email);
        const { __getUser } = jest.requireMock('../../backend/models/userModel');
        const secret = __getUser(user.user_id).totpSecret;
        const right = await agent.post('/api/auth/mfa/challenge').send({ token: generateToken(secret) });
        expect(right.statusCode).toEqual(200);

        const me = await agent.get('/api/auth/mfa/status');
        expect(me.statusCode).toEqual(200);
        expect(me.body.data).toEqual({ required: true, enabled: true });
    });
});
