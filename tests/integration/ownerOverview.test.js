const request = require('supertest');
const { captchaSolution } = require('../helpers/captcha');

jest.mock('../../backend/models/userModel', () => {
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

jest.mock('../../backend/models/groupModel', () => ({
    getUserGroups: async () => [],
    isMember: jest.fn(async () => null),
    getGroupMembers: jest.fn(async () => []),
    getSettings: jest.fn(async () => null)
}));

jest.mock('../../backend/utils/settlementCalculator', () => ({
    calculateBalances: jest.fn(async () => ({ debts: [], balances: {} }))
}));

jest.mock('../../backend/models/paymentModel', () => ({
    getPaymentsByGroup: jest.fn(async () => [])
}));

jest.mock('../../backend/models/taskModel', () => ({
    getTaskCounts: jest.fn(async () => ({ pending: 0, done: 0 }))
}));

const app = require('../../backend/server');
const GroupModel = require('../../backend/models/groupModel');
const settlementCalculator = require('../../backend/utils/settlementCalculator');
const PaymentModel = require('../../backend/models/paymentModel');
const TaskModel = require('../../backend/models/taskModel');

describe('owner overview stays PG-scoped', () => {
    let agent;

    beforeAll(async () => {
        agent = request.agent(app);
        const email = `pgowner${Date.now()}@test.com`;
        await agent.post('/api/auth/register').send({ name: 'PG Owner', email, password: 'password123', ...await captchaSolution(agent) });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        GroupModel.getGroupMembers.mockResolvedValue([
            { user_id: 1, name: 'Owner', role: 'owner' },
            { user_id: 2, name: 'Roomie A', role: 'member' },
            { user_id: 3, name: 'Roomie B', role: 'member' }
        ]);
        // A peer debt between roommates must never leak into the owner view.
        settlementCalculator.calculateBalances.mockResolvedValue({
            debts: [
                { from: 2, to: 1, amount: 1500 },
                { from: 3, to: 2, amount: 400 }
            ],
            balances: {}
        });
        PaymentModel.getPaymentsByGroup.mockResolvedValue([
            { payment_id: 1, paid_by: 2, paid_to: 1, paid_by_name: 'Roomie A', paid_to_name: 'Owner', amount: 5000, status: 'approved', payment_date: new Date().toISOString().slice(0, 10) }
        ]);
        TaskModel.getTaskCounts.mockResolvedValue({ pending: 2, done: 5 });
    });

    test('non-managers cannot open the owner overview', async () => {
        GroupModel.isMember.mockResolvedValue({ role: 'member' });
        const res = await agent.get('/api/dashboard/owner?group_id=1');
        expect(res.statusCode).toEqual(403);
    });

    test('owners see PG matters without peer debts', async () => {
        GroupModel.isMember.mockResolvedValue({ role: 'owner' });
        const res = await agent.get('/api/dashboard/owner?group_id=1');
        expect(res.statusCode).toEqual(200);
        expect(res.body.data.occupancy).toEqual({ total: 3, by_role: { owner: 1, member: 2 } });
        expect(res.body.data.dues_to_owner).toEqual([{ from_id: 2, from_name: 'Roomie A', amount: 1500 }]);
        expect(res.body.data.total_dues_to_owner).toEqual(1500);
        expect(res.body.data.tasks).toEqual({ pending: 2, done: 5 });
        expect(res.body.data.recent_payments).toHaveLength(1);
    });

    test('owners are blocked from roommate-shared financials', async () => {
        GroupModel.isMember.mockResolvedValue({ role: 'owner' });
        const expenses = await agent.get('/api/expenses?group_id=1');
        expect(expenses.statusCode).toEqual(403);
        expect(expenses.body.message).toBe('FINANCIALS_RESTRICTED');
    });
});
