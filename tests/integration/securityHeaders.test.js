const request = require('supertest');
const app = require('../../backend/server');

describe('security headers', () => {
    it('sets baseline headers on static pages', async () => {
        const res = await request(app).get('/pages/login.html');
        expect(res.statusCode).toEqual(200);
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-frame-options']).toBe('DENY');
        expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        expect(res.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    });
});
