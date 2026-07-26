const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// --- Rate Limiter (brute-force protection for login/register) ---
// Simple in-memory rate limiter: max 15 attempts per IP per 15 minutes.
// In production with multiple instances, consider a Redis-backed solution.
const rateLimitMap = new Map();
function authRateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 15;

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, firstAttempt: now });
        return next();
    }

    const entry = rateLimitMap.get(ip);
    if (now - entry.firstAttempt > windowMs) {
        // Reset window
        rateLimitMap.set(ip, { count: 1, firstAttempt: now });
        return next();
    }

    entry.count++;
    if (entry.count > maxAttempts) {
        return res.status(429).json({
            success: false,
            message: 'Too many attempts. Please try again in 15 minutes.'
        });
    }
    next();
}

router.post('/register', authRateLimit, authController.register);
router.post('/login', authRateLimit, authController.login);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
