const bcrypt = require('bcryptjs');
const { generateSecret, verifyToken, provisioningUri } = require('../utils/totp');
const { verifyChallenge, newChallenge } = require('../utils/captcha');
const UserModel = require('../models/userModel');
const GroupModel = require('../models/groupModel');
const { normalizeEmail, isValidEmail } = require('../utils/validation');
const { normalizeAccountType, isValidAccountType } = require('../utils/roles');

async function isOwnerAnywhere(userId) {
    const groups = await GroupModel.getUserGroups(userId);
    return groups.some(group => group.role === 'owner');
}

// Where the account belongs after login, from verified data — never from
// what the user selected on the form. Staff-only accounts open today's
// tasks; owners and roommates open the (role-adaptive) dashboard.
async function homeFor(user) {
    if (!user) return '/pages/dashboard.html';
    if (normalizeAccountType(user.account_type) === 'staff') return '/pages/tasks.html';
    const groups = await GroupModel.getUserGroups(user.user_id);
    if (groups.length > 0 && groups.every(group => group.role === 'staff')) return '/pages/tasks.html';
    return '/pages/dashboard.html';
}

// MFA is mandatory for PG/flat owners: by signup intent or by holding an
// owner role in any group.
async function mfaRequiredFor(user) {
    if (!user) return false;
    if (normalizeAccountType(user.account_type) === 'owner') return true;
    return isOwnerAnywhere(user.user_id);
}

const authController = {
    // Human check shown before password login/register. Stateless and
    // rate-limited; the answer expires with the token.
    async captchaChallenge(req, res) {
        try {
            res.json({ success: true, data: newChallenge() });
        } catch (error) {
            console.error('Captcha error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async register(req, res) {
        try {
            const name = String(req.body.name || '').trim();
            const email = normalizeEmail(req.body.email);
            const { password } = req.body;
            if (!verifyChallenge(req.body.captchaToken, req.body.captchaAnswer)) {
                return res.status(400).json({ success: false, message: 'INVALID_CAPTCHA' });
            }
            const accountType = normalizeAccountType(req.body.account_type || 'roommate');
            if (!isValidAccountType(accountType)) {
                return res.status(400).json({ success: false, message: 'Invalid account type' });
            }
            
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
                userId = await UserModel.create({ name, email, password_hash, account_type: accountType });
            } catch (error) {
                if (String(error.code).includes('DUP')) {
                    return res.status(409).json({ success: false, message: 'EMAIL_ALREADY_EXISTS' });
                }
                throw error;
            }

            // Create session so user is logged in immediately. Owners still
            // pass MFA on their next login; route them to start onboarding.
            req.session.userId = userId;
            req.session.userName = name;

            const onboarding = accountType === 'owner' ? '/pages/groups.html?type=pg'
                : accountType === 'staff' ? '/pages/join.html'
                : '/pages/dashboard.html';
            res.status(201).json({
                success: true,
                data: { user_id: userId, name, email, account_type: accountType, onboarding }
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

            if (!verifyChallenge(req.body.captchaToken, req.body.captchaAnswer)) {
                return res.status(400).json({ success: false, message: 'INVALID_CAPTCHA' });
            }
            
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
            if (await mfaRequiredFor(user)) {
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
                    email: user.email,
                    home: await homeFor(user)
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async oauthCallback(req, res) {
        if (!req.user) return res.redirect('/pages/login.html?oauth=failed');
        // Google sign-ins follow the same role rules: owners pass the
        // authenticator step, staff land on tasks, others on the dashboard.
        const oauthUser = { user_id: req.user.userId, account_type: req.user.accountType || 'roommate' };
        if (await mfaRequiredFor(oauthUser)) {
            req.session.userId = req.user.userId;
            req.session.userName = req.user.name;
            req.session.mfaPending = true;
            return res.redirect('/pages/login.html?oauth=mfa-required');
        }
        req.session.userId = req.user.userId;
        req.session.userName = req.user.name;
        res.redirect(await homeFor(oauthUser));
    },

    // Whether the current user must use MFA (owner account, or owner of at
    // least one group) and whether it is already enabled.
    async mfaStatus(req, res) {
        try {
            const user = await UserModel.findById(req.session.userId);
            const required = await mfaRequiredFor(user);
            const mfa = await UserModel.getMfa(req.session.userId);
            res.json({ success: true, data: { required, enabled: Boolean(mfa && mfa.mfaEnabled) } });
        } catch (error) {
            console.error('MFA status error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    // Begin TOTP enrollment. PG/flat owners only; returns the secret and an
    // otpauth:// URL for QR provisioning in any authenticator app.
    async mfaSetup(req, res) {
        try {
            const user = await UserModel.findById(req.session.userId);
            if (!await mfaRequiredFor(user)) {
                return res.status(403).json({ success: false, message: 'MFA is required for PG/flat owners only' });
            }
            const mfa = await UserModel.getMfa(req.session.userId);
            const secret = (mfa && mfa.totpSecret) || generateSecret();
            await UserModel.setTotpSecret(req.session.userId, secret);
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
            const challengedUser = await UserModel.findById(req.session.userId);
            res.json({ success: true, message: 'Verified', data: { home: await homeFor(challengedUser) } });
        } catch (error) {
            console.error('MFA challenge error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    // Owners cannot disable MFA while they still own a group or hold an
    // owner account.
    async mfaDisable(req, res) {        try {
            const { password } = req.body;
            const user = await UserModel.findByIdWithHash(req.session.userId);
            if (!user || !user.password_hash || !password || !await bcrypt.compare(password, user.password_hash)) {
                return res.status(401).json({ success: false, message: 'INVALID_CREDENTIALS' });
            }
            if (await mfaRequiredFor(user)) {
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
