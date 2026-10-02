const bcrypt = require('bcryptjs');
const { generateSecret, verifyToken, provisioningUri } = require('../utils/totp');
const UserModel = require('../models/userModel');
const GroupModel = require('../models/groupModel');
const { normalizeEmail, isValidEmail } = require('../utils/validation');

async function isOwnerAnywhere(userId) {
    const groups = await GroupModel.getUserGroups(userId);
    return groups.some(group => group.role === 'owner');
}

const authController = {
    async register(req, res) {
        try {
            const name = String(req.body.name || '').trim();
            const email = normalizeEmail(req.body.email);
            const { password } = req.body;
            
            if (!name || !email || !password) {
                return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
            }

            if (name.length < 2 || name.length > 100) {
                return res.status(400).json({ success: false, message: 'Name must be between 2 and 100 characters' });
            }

            if (!isValidEmail(email)) {
                return res.status(400).json({ success: false, message: 'INVALID_EMAIL_FORMAT' });
            }
            
            if (password.length < 6 || password.length > 72) {
                return res.status(400).json({ success: false, message: 'Password must be between 6 and 72 characters' });
            }

            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({ success: false, message: 'EMAIL_ALREADY_EXISTS' });
            }

            const password_hash = await bcrypt.hash(password, 10);
            let userId;
            try {
                userId = await UserModel.create({ name, email, password_hash });
            } catch (error) {
                if (String(error.code).includes('DUP')) {
                    return res.status(409).json({ success: false, message: 'EMAIL_ALREADY_EXISTS' });
                }
                throw error;
            }

            // Create session so user is logged in immediately
            req.session.userId = userId;
            req.session.userName = name;

            res.status(201).json({
                success: true,
                data: { user_id: userId, name, email }
            });
        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async login(req, res) {
        try {
            const email = normalizeEmail(req.body.email);
            const { password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Email and password are required' });
            }

            const user = await UserModel.findByEmail(email);
            if (!user || !user.password_hash) {
                return res.status(401).json({ success: false, message: 'INVALID_CREDENTIALS' });
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'INVALID_CREDENTIALS' });
            }

            // PG/flat owners must pass a second factor. They receive a
            // restricted session that can only complete MFA enrollment or a
            // challenge until the check passes.
            if (await isOwnerAnywhere(user.user_id)) {
                const mfa = await UserModel.getMfa(user.user_id);
                req.session.userId = user.user_id;
                req.session.userName = user.name;
                req.session.mfaPending = true;
                if (mfa && mfa.mfaEnabled) {
                    return res.json({ success: true, mfaRequired: true, data: { user_id: user.user_id } });
                }
                return res.json({ success: true, mfaSetupRequired: true, data: { user_id: user.user_id } });
            }

            // Create session
            req.session.userId = user.user_id;
            req.session.userName = user.name;

            res.json({
                success: true,
                data: {
                    user_id: user.user_id,
                    name: user.name,
                    email: user.email
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async oauthCallback(req, res) {
        if (!req.user) return res.redirect('/pages/login.html?oauth=failed');
        req.session.userId = req.user.userId;
        req.session.userName = req.user.name;
        res.redirect('/pages/dashboard.html');
    },

    // Whether the current user must use MFA (owner of at least one group)
    // and whether it is already enabled.
    async mfaStatus(req, res) {
        try {
            const owner = await isOwnerAnywhere(req.session.userId);
            const mfa = await UserModel.getMfa(req.session.userId);
            res.json({ success: true, data: { required: owner, enabled: Boolean(mfa && mfa.mfaEnabled) } });
        } catch (error) {
            console.error('MFA status error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    // Begin TOTP enrollment. Owners only; returns the secret and an
    // otpauth:// URL for QR provisioning in any authenticator app.
    async mfaSetup(req, res) {
        try {
            if (!await isOwnerAnywhere(req.session.userId)) {
                return res.status(403).json({ success: false, message: 'MFA is required for PG/flat owners only' });
            }
            const mfa = await UserModel.getMfa(req.session.userId);
            const secret = (mfa && mfa.totpSecret) || generateSecret();
            await UserModel.setTotpSecret(req.session.userId, secret);
            const user = await UserModel.findById(req.session.userId);
            const otpauthUrl = provisioningUri(user ? user.email : 'roomsync', 'RoomSync', secret);
            res.json({ success: true, data: { secret, otpauth_url: otpauthUrl } });
        } catch (error) {
            console.error('MFA setup error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    // Confirm enrollment with a code from the authenticator app.
    async mfaConfirm(req, res) {
        try {
            const token = String(req.body.token || '').replace(/\s/g, '');
            const mfa = await UserModel.getMfa(req.session.userId);
            if (!mfa || !mfa.totpSecret) {
                return res.status(400).json({ success: false, message: 'MFA_SETUP_REQUIRED' });
            }
            if (!verifyToken(token, mfa.totpSecret)) {
                return res.status(401).json({ success: false, message: 'INVALID_MFA_CODE' });
            }
            await UserModel.setMfaEnabled(req.session.userId, true);
            req.session.mfaPending = null;
            res.json({ success: true, message: 'MFA enabled' });
        } catch (error) {
            console.error('MFA confirm error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    // Second-factor challenge at login for owners with MFA enabled.
    async mfaChallenge(req, res) {
        try {
            const token = String(req.body.token || '').replace(/\s/g, '');
            const mfa = await UserModel.getMfa(req.session.userId);
            if (!mfa || !mfa.mfaEnabled) {
                return res.status(400).json({ success: false, message: 'MFA_NOT_ENABLED' });
            }
            if (!verifyToken(token, mfa.totpSecret)) {
                return res.status(401).json({ success: false, message: 'INVALID_MFA_CODE' });
            }
            req.session.mfaPending = null;
            res.json({ success: true, message: 'Verified' });
        } catch (error) {
            console.error('MFA challenge error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    // Owners cannot disable MFA while they still own a group.
    async mfaDisable(req, res) {
        try {
            const { password } = req.body;
            const user = await UserModel.findByIdWithHash(req.session.userId);
            if (!user || !user.password_hash || !password || !await bcrypt.compare(password, user.password_hash)) {
                return res.status(401).json({ success: false, message: 'INVALID_CREDENTIALS' });
            }
            if (await isOwnerAnywhere(req.session.userId)) {
                return res.status(403).json({ success: false, message: 'Owners must keep MFA enabled' });
            }
            await UserModel.setMfaEnabled(req.session.userId, false);
            res.json({ success: true, message: 'MFA disabled' });
        } catch (error) {
            console.error('MFA disable error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async logout(req, res) {
        req.session = null;
        res.json({ success: true, message: 'Logged out successfully.' });
    }
};

module.exports = authController;
