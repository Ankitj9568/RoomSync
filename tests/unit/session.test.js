const { SESSION_MAX_AGE_MS } = require('../../config/session');

describe('session lifetime', () => {
    test('sessions last 30 days', () => {
        expect(SESSION_MAX_AGE_MS).toBe(30 * 24 * 60 * 60 * 1000);
    });
});
