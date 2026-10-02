const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const UserModel = require('../models/userModel');
const { normalizeAccountType, isValidAccountType } = require('../utils/roles');

let configured = false;

// OAuth state carries the CSRF token plus the role selected on the login or
// register form ("<csrf>.<role>"), so a Google sign-up honors the same
// roommate/owner/staff choice as the password form.
function parseOAuthState(state) {
    const [csrf, role] = String(state || '').split('.');
    if (!csrf || !/^[0-9a-f]{48}$/.test(csrf)) return null;
    const accountType = isValidAccountType(role) ? normalizeAccountType(role) : 'roommate';
    return { csrf, accountType };
}

function configureGoogleOAuth() {
    if (configured || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return configured;

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
        passReqToCallback: true
    }, async (req, accessToken, refreshToken, profile, done) => {
        try {
            const parsed = parseOAuthState(req.query && req.query.state);
            if (!parsed || !req.session || req.session.oauthState !== parsed.csrf) {
                return done(new Error('Invalid OAuth state.'));
            }
            const email = profile.emails && profile.emails[0] && profile.emails[0].value;
            if (!email) return done(new Error('Google did not provide an email address.'));
            const user = await UserModel.findOrCreateOAuthUser({
                provider: 'google',
                providerAccountId: profile.id,
                email,
                name: profile.displayName,
                avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                accountType: parsed.accountType
            });
            done(null, user);
        } catch (error) {
            done(error);
        }
    }));
    configured = true;
    return true;
}

module.exports = { passport, configureGoogleOAuth, parseOAuthState };
