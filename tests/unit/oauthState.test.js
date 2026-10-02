const { parseOAuthState } = require('../../backend/middleware/googleOAuth');

describe('google oauth state', () => {
    const csrf = 'a'.repeat(48);

    test('carries a valid role selection', () => {
        expect(parseOAuthState(`${csrf}.staff`)).toEqual({ csrf, accountType: 'staff' });
        expect(parseOAuthState(`${csrf}.owner`)).toEqual({ csrf, accountType: 'owner' });
        expect(parseOAuthState(`${csrf}.roommate`)).toEqual({ csrf, accountType: 'roommate' });
    });

    test('unknown roles fall back to roommate', () => {
        expect(parseOAuthState(`${csrf}.guest`)).toEqual({ csrf, accountType: 'roommate' });
        expect(parseOAuthState(csrf)).toEqual({ csrf, accountType: 'roommate' });
    });

    test('rejects malformed or missing state', () => {
        expect(parseOAuthState('short.staff')).toBeNull();
        expect(parseOAuthState('')).toBeNull();
        expect(parseOAuthState(null)).toBeNull();
        expect(parseOAuthState(undefined)).toBeNull();
    });
});
