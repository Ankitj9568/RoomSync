const request = require('supertest');
const { captchaSolution } = require('../helpers/captcha');

jest.mock('../../backend/models/userModel', () => {
    const users = new Map();
    let nextId = 1;
    return {
        findByEmail: async email => users.get(String(email).toLowerCase()),
        create: async ({ name, email, password_hash, account_type }) => {
            const user = { user_id: nextId++, name, email, password_hash, phone: null, upi_id: null, account_type: account_type || 'roommate' };
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
    getGroupById: jest.fn(async () => ({ group_id: 1, group_type: 'pg' })),
    getGroupByCode: jest.fn(async () => null),
    getGroupMembers: jest.fn(async () => []),
    getSettings: jest.fn(async () => ({ meal_cutoff_time: '10:00:00', allow_direct_join: true, rent_amount: 0, billing_day: 1 })),
    isMember: jest.fn(async () => null),
    createGroup: jest.fn(async () => 1),
    addMember: jest.fn(async () => {}),
    updateMemberRole: jest.fn(async () => {}),
    updateRoomLabel: jest.fn(async () => {}),
    updateSettings: jest.fn(async () => {}),
    getPendingJoinRequests: jest.fn(async () => []),
    createJoinRequest: jest.fn(async () => 1)
}));

jest.mock('../../backend/models/activityLogModel', () => ({
    create: jest.fn(async () => 1),
    getByGroupId: jest.fn(async () => [])
}));

const app = require('../../backend/server');
const GroupModel = require('../../backend/models/groupModel');

describe('group types and PG billing', () => {
    let agent;

    beforeAll(async () => {
        agent = request.agent(app);
        await agent.post('/api/auth/register').send({ name: 'Type User', email: `types${Date.now()}@test.com`, password: 'password123', ...await captchaSolution(agent) });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('creating a PG makes the creator its owner', async () => {
        const res = await agent.post('/api/groups/create').send({ name: 'Sharma PG', group_type: 'pg', rent_amount: 6500, billing_day: 5 });
        expect(res.statusCode).toEqual(201);
        expect(res.body.data.group_type).toBe('pg');
        expect(GroupModel.createGroup).toHaveBeenCalledWith(
            'Sharma PG', expect.any(String), expect.any(Number),
            { groupType: 'pg', creatorRole: 'owner', rentAmount: 6500, billingDay: 5 }
        );
    });

    test('invalid group types and billing are rejected', async () => {
        const badType = await agent.post('/api/groups/create').send({ name: 'X', group_type: 'villa' });
        expect(badType.statusCode).toEqual(400);
        const badDay = await agent.post('/api/groups/create').send({ name: 'Y', group_type: 'pg', billing_day: 31 });
        expect(badDay.statusCode).toEqual(400);
    });

    test('only the owner can change PG billing', async () => {
        GroupModel.isMember.mockResolvedValue({ role: 'admin' });
        const admin = await agent.patch('/api/groups/1/settings').send({ rent_amount: 7000 });
        expect(admin.statusCode).toEqual(403);

        GroupModel.isMember.mockResolvedValue({ role: 'owner' });
        const owner = await agent.patch('/api/groups/1/settings').send({ rent_amount: 7000, billing_day: 5 });
        expect(owner.statusCode).toEqual(200);
        expect(GroupModel.updateSettings).toHaveBeenCalledWith('1', expect.objectContaining({ rentAmount: 7000, billingDay: 5 }));
    });

    test('billing is rejected for friends groups', async () => {
        GroupModel.isMember.mockResolvedValue({ role: 'owner' });
        GroupModel.getGroupById.mockResolvedValue({ group_id: 1, group_type: 'friends' });
        const res = await agent.patch('/api/groups/1/settings').send({ rent_amount: 100 });
        expect(res.statusCode).toEqual(400);
        GroupModel.getGroupById.mockResolvedValue({ group_id: 1, group_type: 'pg' });
    });

    test('managers can allot rooms, members cannot', async () => {
        GroupModel.isMember.mockResolvedValueOnce({ role: 'owner' }).mockResolvedValueOnce({ role: 'member' });
        GroupModel.getGroupMembers.mockResolvedValue([]);
        const allowed = await agent.patch('/api/groups/1/members/9').send({ room_label: 'Room 101' });
        expect(allowed.statusCode).toEqual(200);
        expect(GroupModel.updateRoomLabel).toHaveBeenCalledWith('1', '9', 'Room 101');

        GroupModel.isMember.mockResolvedValue({ role: 'member' });
        const denied = await agent.patch('/api/groups/1/members/9').send({ room_label: 'Room 102' });
        expect(denied.statusCode).toEqual(403);
    });

    test('signup stores the account type and routes onboarding', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Owner Sign', email: `ownersign${Date.now()}@test.com`, password: 'password123', account_type: 'owner', ...await captchaSolution(request(app))
        });
        expect(res.statusCode).toEqual(201);
        expect(res.body.data.account_type).toBe('owner');
        expect(res.body.data.onboarding).toBe('/pages/groups.html?type=pg');

        const bad = await request(app).post('/api/auth/register').send({
            name: 'Bad Type', email: `badtype${Date.now()}@test.com`, password: 'password123', account_type: 'guest', ...await captchaSolution(request(app))
        });
        expect(bad.statusCode).toEqual(400);
    });
});
