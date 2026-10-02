// middleware/securityHeaders.js - Minimal response headers without new deps.
//
// These headers are safe for the whole app: no page embeds RoomSync in an
// iframe, and the Google OAuth flow uses top-level redirects (sameSite: lax
// cookies), not popups or embedded frames.

module.exports = function securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
};
