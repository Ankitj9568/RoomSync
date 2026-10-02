// config/session.js - Signed cookie-session configuration.
//
// Sessions last 30 days from login (absolute lifetime, refreshed whenever the
// session is rewritten such as at login or OAuth callback). The cookie holds
// only the user id and display name; every request still re-checks group
// membership in the database, so role changes take effect immediately even
// while the session cookie itself remains valid.

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function sessionOptions() {
    return {
        name: 'roomsync.session',
        keys: [process.env.SESSION_SECRET || 'development-only-secret'],
        maxAge: SESSION_MAX_AGE_MS,
        cookie: {
            httpOnly: true,
            // Lax permits the top-level GET callback from Google OAuth while
            // still blocking cookies on cross-site subrequests.
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        }
    };
}

module.exports = { SESSION_MAX_AGE_MS, sessionOptions };
