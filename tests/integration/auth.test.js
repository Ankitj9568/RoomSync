const request = require('supertest');
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
