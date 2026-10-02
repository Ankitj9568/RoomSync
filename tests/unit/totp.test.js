const { base32Encode, generateToken, verifyToken } = require('../../backend/utils/totp');

describe('totp', () => {
    // RFC 6238 Appendix B vector: secret "12345678901234567890" (ASCII),
    // SHA-1, T0 = 0, 30s step. T = 59s -> counter 1 -> 94287082 -> 287082.
    const rfcSecret = base32Encode(Buffer.from('12345678901234567890', 'ascii'));

    test('matches the RFC 6238 test vector', () => {
        expect(generateToken(rfcSecret, 59 * 1000)).toBe('287082');
    });

    test('verifies the current code and rejects wrong codes', () => {
        const secret = 'JBSWY3DPEHPK3PXP';
        expect(verifyToken(generateToken(secret), secret)).toBe(true);
        expect(verifyToken('000000', secret)).toBe(false);
        expect(verifyToken('abcdef', secret)).toBe(false);
        expect(verifyToken('', secret)).toBe(false);
    });

    test('tolerates one step of clock drift', () => {
        const secret = 'JBSWY3DPEHPK3PXP';
        const adjacent = generateToken(secret, Date.now() + 30 * 1000);
        expect(verifyToken(adjacent, secret)).toBe(true);
    });
});
