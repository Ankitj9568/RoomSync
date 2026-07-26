const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');

const userController = {
    async getProfile(req, res) {
        try {
            const userId = req.session.userId;
            const user = await UserModel.findById(userId);
            
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            
            res.json({ success: true, data: user });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async updateProfile(req, res) {
        try {
            const userId = req.session.userId;
            const { name, phone, upi_id } = req.body;
            
            if (!name) {
                return res.status(400).json({ success: false, message: 'Name is required' });
            }
            
            if (phone && String(phone).length !== 10) {
                return res.status(400).json({ success: false, message: 'INVALID_PHONE_FORMAT' });
            }
            
            if (upi_id && (!upi_id.includes('@') || upi_id.length < 5)) {
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

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ success: false, message: 'Both current and new password are required' });
            }
            if (newPassword.length < 6 || newPassword.length > 72) {
                return res.status(400).json({ success: false, message: 'Password must be between 6 and 72 characters' });
            }

            // Must fetch full user record (with password_hash) using findByEmail-style query
            const fullUser = await UserModel.findByIdWithHash(userId);
            if (!fullUser) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const isMatch = await bcrypt.compare(currentPassword, fullUser.password_hash);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Current password is incorrect' });
            }

            const newHash = await bcrypt.hash(newPassword, 10);
            await UserModel.updatePassword(userId, newHash);

            res.json({ success: true, message: 'Password changed successfully' });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = userController;
