const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');

const userController = {
    async getProfile(req, res) {
        try {
            const userId = req.session.userId;
            const fullUser = await UserModel.findByIdWithHash(userId);
            
            if (!fullUser) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const { password_hash, ...safeUser } = fullUser;
            void password_hash;
            res.json({ success: true, data: { ...safeUser, has_password: Boolean(fullUser.password_hash) } });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async updateProfile(req, res) {
        try {
            const userId = req.session.userId;
            const { name, phone, upi_id } = req.body;
            
            if (!name || String(name).trim().length < 2 || String(name).trim().length > 100) {
                return res.status(400).json({ success: false, message: 'Name is required' });
            }
            
            if (phone && !/^\d{10}$/.test(String(phone))) {
                return res.status(400).json({ success: false, message: 'INVALID_PHONE_FORMAT' });
            }
            
            if (upi_id && !/^[^\s@]+@[^\s@]+$/.test(String(upi_id))) {
                return res.status(400).json({ success: false, message: 'INVALID_UPI_FORMAT' });
            }

            await UserModel.update(userId, { name, phone, upi_id });
            // Sync session so navbar reflects updated name without re-login
            req.session.userName = name;
            const updatedUser = await UserModel.findById(userId);

            res.json({ success: true, data: updatedUser });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async changePassword(req, res) {
        try {
            const userId = req.session.userId;
            const { currentPassword, newPassword } = req.body;

            if (!newPassword) {
                return res.status(400).json({ success: false, message: 'New password is required' });
            }
            if (newPassword.length < 6 || newPassword.length > 72) {
                return res.status(400).json({ success: false, message: 'Password must be between 6 and 72 characters' });
            }

            // Must fetch full user record (with password_hash) using findByEmail-style query
            const fullUser = await UserModel.findByIdWithHash(userId);
            if (!fullUser) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Google-only accounts have no password yet: setting the first
            // one needs no current password, only the session itself.
            if (fullUser.password_hash) {
                if (!currentPassword) {
                    return res.status(400).json({ success: false, message: 'Both current and new password are required' });
                }
                const isMatch = await bcrypt.compare(currentPassword, fullUser.password_hash);
                if (!isMatch) {
                    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
                }
            }

            const newHash = await bcrypt.hash(newPassword, 10);
            const hadPassword = Boolean(fullUser.password_hash);
            await UserModel.updatePassword(userId, newHash);

            res.json({ success: true, message: hadPassword ? 'Password changed successfully' : 'Password set successfully' });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = userController;
