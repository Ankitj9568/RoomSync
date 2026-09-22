const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');
const { normalizeEmail, isValidEmail } = require('../utils/validation');

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
            if (!user) {
                return res.status(401).json({ success: false, message: 'INVALID_CREDENTIALS' });
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'INVALID_CREDENTIALS' });
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

    async logout(req, res) {
        req.session = null;
        res.json({ success: true, message: 'Logged out successfully.' });
    }
};

module.exports = authController;
