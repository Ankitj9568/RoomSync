const request = require('supertest');

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
    getGroupById: jest.fn(async () => ({ group_id: 1, group_type: 'friends' })),
    isMember: jest.fn(async () => null)
}));

jest.mock('../../backend/models/taskModel', () => ({
    getTasksByGroup: jest.fn(async () => []),
    getTaskById: jest.fn(async () => null),
    getTaskCounts: jest.fn(async () => ({ pending: 0, done: 0 })),
    createTask: jest.fn(async data => ({ task_id: 7, group_id: data.groupId, ...data })),
    updateTask: jest.fn(async () => ({})),
    updateStatus: jest.fn(async (id, status) => ({ task_id: id, status })),
    deleteTask: jest.fn(async () => {})
}));

jest.mock('../../backend/models/activityLogModel', () => ({
    create: jest.fn(async () => 1)
}));

const app = require('../../backend/server');
const GroupModel = require('../../backend/models/groupModel');
const TaskModel = require('../../backend/models/taskModel');

describe('task board authorization', () => {
    let agent;
    let userId;

    beforeAll(async () => {
        agent = request.agent(app);
        const email = `tasks${Date.now()}@test.com`;
        const res = await agent.post('/api/auth/register').send({ name: 'Task User', email, password: 'password123' });
        userId = res.body.data.user_id;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('managers can assign tasks', async () => {
        GroupModel.isMember.mockResolvedValue({ role: 'owner' });
        const res = await agent.post('/api/tasks').send({ group_id: 1, title: 'Cook dinner', category: 'cooking', schedule: 'daily' });
        expect(res.statusCode).toEqual(201);
        expect(TaskModel.createTask).toHaveBeenCalled();
    });

    test('members cannot assign tasks in a PG', async () => {
        GroupModel.isMember.mockResolvedValue({ role: 'member' });
        GroupModel.getGroupById.mockResolvedValue({ group_id: 1, group_type: 'pg' });
        const res = await agent.post('/api/tasks').send({ group_id: 1, title: 'Cook dinner' });
        expect(res.statusCode).toEqual(403);
        GroupModel.getGroupById.mockResolvedValue({ group_id: 1, group_type: 'friends' });
    });

    test('members can raise tasks in flat and friends groups, never in a PG', async () => {
        GroupModel.isMember.mockResolvedValue({ role: 'member' });
        GroupModel.getGroupById.mockResolvedValue({ group_id: 1, group_type: 'flat' });
        const flat = await agent.post('/api/tasks').send({ group_id: 1, title: 'Buy rice', category: 'grocery' });
        expect(flat.statusCode).toEqual(201);

        GroupModel.getGroupById.mockResolvedValue({ group_id: 1, group_type: 'pg' });
        const pg = await agent.post('/api/tasks').send({ group_id: 1, title: 'Buy rice', category: 'grocery' });
        expect(pg.statusCode).toEqual(403);
        GroupModel.getGroupById.mockResolvedValue({ group_id: 1, group_type: 'friends' });
    });

    test('watchman rounds are owner-only in every setup', async () => {
        GroupModel.isMember.mockResolvedValue({ role: 'admin' });
        const admin = await agent.post('/api/tasks').send({ group_id: 1, title: 'Night round', category: 'security' });
        expect(admin.statusCode).toEqual(403);

        GroupModel.isMember.mockResolvedValue({ role: 'owner' });
        const owner = await agent.post('/api/tasks').send({ group_id: 1, title: 'Night round', category: 'security' });
        expect(owner.statusCode).toEqual(201);
    });

    test('invalid categories are rejected', async () => {
        GroupModel.isMember.mockResolvedValue({ role: 'admin' });
        const res = await agent.post('/api/tasks').send({ group_id: 1, title: 'Fly away', category: 'pilot' });
        expect(res.statusCode).toEqual(400);
    });

    test('staff can complete their own tasks', async () => {
        GroupModel.isMember.mockResolvedValue({ role: 'staff' });
        TaskModel.getTaskById.mockResolvedValue({ task_id: 3, group_id: 1, assigned_to: userId, status: 'pending' });
        const res = await agent.patch('/api/tasks/3/status').send({ status: 'done' });
        expect(res.statusCode).toEqual(200);
        expect(TaskModel.updateStatus).toHaveBeenCalledWith(3, 'done');
    });

    test('staff cannot complete tasks assigned to others', async () => {
        GroupModel.isMember.mockResolvedValue({ role: 'staff' });
        TaskModel.getTaskById.mockResolvedValue({ task_id: 4, group_id: 1, assigned_to: 999, status: 'pending' });
        const res = await agent.patch('/api/tasks/4/status').send({ status: 'done' });
        expect(res.statusCode).toEqual(403);
    });

    test('members cannot flip tasks assigned to someone else', async () => {
        GroupModel.isMember.mockResolvedValue({ role: 'member' });
        TaskModel.getTaskById.mockResolvedValue({ task_id: 5, group_id: 1, assigned_to: 999, status: 'pending' });
        const res = await agent.patch('/api/tasks/5/status').send({ status: 'done' });
        expect(res.statusCode).toEqual(403);
    });
});
