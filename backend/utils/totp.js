// utils/totp.js - Minimal TOTP (RFC 6238, SHA-1) for owner two-factor auth.
//
// Zero-dependency on purpose: the only consumer is owner MFA, and a short
// auditable implementation beats an ESM-only package that Jest cannot parse.
// Secrets are base32 (authenticator-app compatible), codes are 6 digits with
// a 30-second step, and verification tolerates one step of clock drift.

const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buffer) {
    let bits = 0;
    let value = 0;
    let output = '';
    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    while (output.length % 8 !== 0) output += '=';
    return output;
}

function base32Decode(input) {
    const clean = String(input).replace(/=+$/, '').toUpperCase();
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (const char of clean) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index === -1) throw new Error('Invalid base32 secret');
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
}

function generateSecret(bytes = 20) {
    return base32Encode(crypto.randomBytes(bytes));
}

function generateToken(secret, atMs = Date.now()) {
    const counter = Math.floor(Number(atMs) / 1000 / STEP_SECONDS);
    const message = Buffer.alloc(8);
    message.writeBigUInt64BE(BigInt(counter));
    const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(message).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = (
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)
    ) % (10 ** DIGITS);
    return String(code).padStart(DIGITS, '0');
}

function timingSafeEqual(a, b) {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
}

// Accepts codes from the previous, current, and next 30-second step.
function verifyToken(token, secret, windowSteps = 1) {
    const clean = String(token || '').replace(/\s/g, '');
    if (!/^\d{6,8}$/.test(clean)) return false;
    const now = Date.now();
    for (let drift = -windowSteps; drift <= windowSteps; drift++) {
        if (timingSafeEqual(clean, generateToken(secret, now + drift * STEP_SECONDS * 1000))) return true;
    }
    return false;
}

function provisioningUri(account, issuer, secret) {
    const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
    return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

module.exports = {
    STEP_SECONDS,
    DIGITS,
    base32Encode,
    base32Decode,
    generateSecret,
    generateToken,
    verifyToken,
    provisioningUri
};
