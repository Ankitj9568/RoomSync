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
            
            if (phone && phone.length !== 10) {
                return res.status(400).json({ success: false, message: 'INVALID_PHONE_FORMAT' });
            }
            
            if (upi_id && (!upi_id.includes('@') || upi_id.length < 5)) {
                return res.status(400).json({ success: false, message: 'INVALID_UPI_FORMAT' });
            }

            await UserModel.update(userId, { name, phone, upi_id });
            const updatedUser = await UserModel.findById(userId);

            res.json({ success: true, data: updatedUser });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = userController;
