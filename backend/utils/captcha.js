// utils/captcha.js - Zero-dependency human check for login and register.
//
// The server issues a small arithmetic question with an HMAC-signed token
// (stateless, so it works across Vercel serverless invocations). Answers
// expire after 5 minutes. Single-use is enforced best-effort with an
// in-memory nonce set: it stops casual replay on one instance without
// requiring shared storage.

const crypto = require('crypto');

const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const MAX_NONCES = 5000;

const usedNonces = new Map(); // nonce -> expiresAt

function secret() {
    return process.env.SESSION_SECRET || 'development-only-secret';
}

function base64urlEncode(buffer) {
    return Buffer.from(buffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(text) {
    const padded = String(text).replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(padded, 'base64');
}

function randomInt(min, max) {
    return min + crypto.randomInt(max - min + 1);
}

function newChallenge() {
    const ops = ['+', '-', '×'];
    const op = ops[crypto.randomInt(ops.length)];
    let a = randomInt(2, 12);
    let b = randomInt(2, 12);
    if (op === '-' && b > a) [a, b] = [b, a];
    const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
    const nonce = crypto.randomBytes(8).toString('hex');
    const payload = { a, op, b, answer, nonce, exp: Date.now() + CAPTCHA_TTL_MS };
    const encoded = base64urlEncode(JSON.stringify(payload));
    const sig = crypto.createHmac('sha256', secret()).update(encoded).digest();
    return {
        token: `${encoded}.${base64urlEncode(sig)}`,
        question: `What is ${a} ${op} ${b}?`
    };
}

function pruneNonces(now = Date.now()) {
    if (usedNonces.size < MAX_NONCES) {
        for (const [nonce, expiresAt] of usedNonces) {
            if (expiresAt <= now) usedNonces.delete(nonce);
        }
        return;
    }
    usedNonces.clear();
}

function verifyChallenge(token, answer) {
    try {
        if (!token || answer === undefined || answer === null || String(answer).trim() === '') return false;
        const [encoded, sig] = String(token).split('.');
        if (!encoded || !sig) return false;
        const expected = crypto.createHmac('sha256', secret()).update(encoded).digest();
        const provided = base64urlDecode(sig);
        if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return false;
        const payload = JSON.parse(base64urlDecode(encoded).toString('utf8'));
        pruneNonces();
        if (!payload || Number(payload.answer) !== Number(String(answer).trim())) return false;
        if (!payload.exp || payload.exp <= Date.now()) return false;
        if (!payload.nonce || usedNonces.has(payload.nonce)) return false;
        usedNonces.set(payload.nonce, payload.exp);
        return true;
    } catch {
        return false;
    }
}

module.exports = { CAPTCHA_TTL_MS, newChallenge, verifyChallenge };
