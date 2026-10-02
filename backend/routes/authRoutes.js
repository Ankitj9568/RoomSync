const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { passport, configureGoogleOAuth } = require('../middleware/googleOAuth');

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
router.get('/captcha', authController.captchaChallenge);
router.post('/logout', authMiddleware, authController.logout);

// Owner multi-factor authentication (TOTP authenticator apps).
router.get('/mfa/status', authMiddleware, authController.mfaStatus);
router.post('/mfa/setup', authRateLimit, authMiddleware, authController.mfaSetup);
router.post('/mfa/confirm', authRateLimit, authMiddleware, authController.mfaConfirm);
router.post('/mfa/challenge', authRateLimit, authMiddleware, authController.mfaChallenge);
router.post('/mfa/disable', authRateLimit, authMiddleware, authController.mfaDisable);

router.get('/google', (req, res, next) => {
    if (!configureGoogleOAuth()) return res.status(503).json({ success: false, message: 'GOOGLE_OAUTH_NOT_CONFIGURED' });
    const csrf = crypto.randomBytes(24).toString('hex');
    req.session.oauthState = csrf;
    // Carry the role selected on the login/register form into the round
    // trip so Google sign-ups honor it; verified again on callback.
    const { normalizeAccountType, isValidAccountType } = require('../utils/roles');
    const role = String(req.query.as || 'roommate');
    const accountType = isValidAccountType(role) ? normalizeAccountType(role) : 'roommate';
    const state = `${csrf}.${accountType}`;
    passport.authenticate('google', { session: false, scope: ['profile', 'email'], state })(req, res, next);
});
router.get('/google/callback', (req, res, next) => {
    if (!configureGoogleOAuth()) return res.redirect('/pages/login.html?oauth=not-configured');
    const { parseOAuthState } = require('../middleware/googleOAuth');
    const parsed = parseOAuthState(req.query.state);
    if (!req.session || !parsed || req.session.oauthState !== parsed.csrf) {
        return res.redirect('/pages/login.html?oauth=invalid-state');
    }
    req.session.oauthState = null;
    passport.authenticate('google', { session: false, failureRedirect: '/pages/login.html?oauth=failed' })(req, res, next);
}, authController.oauthCallback);

module.exports = router;
