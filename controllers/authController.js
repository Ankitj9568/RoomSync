const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');

const authController = {
    async register(req, res) {
        try {
            const { name, email, password } = req.body;
            
            if (!name || !email || !password) {
                return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
            }
            
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'WEAK_PASSWORD' });
            }

            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({ success: false, message: 'EMAIL_ALREADY_EXISTS' });
            }

            const password_hash = await bcrypt.hash(password, 10);
            const userId = await UserModel.create({ name, email, password_hash });

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
            const { email, password } = req.body;
            
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
        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Could not log out' });
            }
            res.clearCookie('connect.sid');
            res.json({ success: true, message: 'Logged out successfully.' });
        });
    }
};

module.exports = authController;
