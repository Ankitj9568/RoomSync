const { newChallenge, verifyChallenge } = require('../../backend/utils/captcha');

describe('captcha human check', () => {
    test('issues solvable challenges', () => {
        const { token, question } = newChallenge();
        expect(typeof token).toBe('string');
        const match = question.match(/What is (\d+) ([+\-×]) (\d+)\?/);
        expect(match).not.toBeNull();
        const [, left, op, right] = match;
        const answer = op === '+' ? Number(left) + Number(right)
            : op === '-' ? Number(left) - Number(right)
            : Number(left) * Number(right);
        expect(verifyChallenge(token, String(answer))).toBe(true);
        // Single-use: the same token cannot verify twice.
        expect(verifyChallenge(token, String(answer))).toBe(false);
    });

    test('rejects wrong answers, blanks, and tampered tokens', () => {
        const { token, question } = newChallenge();
        const match = question.match(/What is (\d+) ([+\-×]) (\d+)\?/);
        const [, left, op, right] = match;
        const correct = op === '+' ? Number(left) + Number(right)
            : op === '-' ? Number(left) - Number(right)
            : Number(left) * Number(right);
        expect(verifyChallenge(token, String(correct + 1))).toBe(false);
        expect(verifyChallenge(token, '')).toBe(false);
        expect(verifyChallenge(token, null)).toBe(false);
        expect(verifyChallenge(token.slice(0, -2) + 'xx', String(correct))).toBe(false);
        expect(verifyChallenge('garbage', '5')).toBe(false);
    });
});
