const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const UserModel = require('../models/userModel');

let configured = false;

function configureGoogleOAuth() {
    if (configured || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return configured;

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails && profile.emails[0] && profile.emails[0].value;
            if (!email) return done(new Error('Google did not provide an email address.'));
            const user = await UserModel.findOrCreateOAuthUser({
                provider: 'google',
                providerAccountId: profile.id,
                email,
                name: profile.displayName,
                avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null
            });
            done(null, user);
        } catch (error) {
            done(error);
        }
    }));
    configured = true;
    return true;
}

module.exports = { passport, configureGoogleOAuth };
