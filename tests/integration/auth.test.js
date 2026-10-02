const request = require('supertest');
// Auth contract tests use an in-memory repository so they do not require a
// developer PostgreSQL instance. Prisma-backed database coverage belongs in
// the deployment/integration suite with TEST_DATABASE_URL configured.
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
        updatePassword: async (userId, passwordHash) => {
            const user = [...users.values()].find(item => item.user_id === Number(userId));
            if (user) user.password_hash = passwordHash;
        },
        findOrCreateOAuthUser: async () => null
    };
});

const app = require('../../server'); 

describe('Auth API (Black-box)', () => {
    
    const uniqueEmail = `test${Date.now()}@test.com`;
    
    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test User',
                email: uniqueEmail,
                password: 'password123'
            });
        
        expect(res.statusCode).toEqual(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('user_id');
    });

    it('should not register user with missing fields', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: uniqueEmail
            });
        
        expect(res.statusCode).toEqual(400);
        expect(res.body.success).toBe(false);
    });

    it('should login an existing user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: uniqueEmail,
                password: 'password123'
            });
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('user_id');
    });

    it('should reject invalid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: uniqueEmail,
                password: 'wrongpassword'
            });
        
        expect(res.statusCode).toEqual(401);
        expect(res.body.success).toBe(false);
    });
});
