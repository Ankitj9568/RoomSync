const db = require('../config/db');

const UserModel = {
    async findByEmail(email) {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },

    async findById(userId) {
        const [rows] = await db.execute('SELECT user_id, name, email, phone, upi_id FROM users WHERE user_id = ?', [userId]);
        return rows[0];
    },

    async create(userData) {
        const { name, email, password_hash } = userData;
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, password_hash]
        );
        return result.insertId;
    },

    async update(userId, userData) {
        const { name, phone, upi_id } = userData;
        await db.execute(
            'UPDATE users SET name = ?, phone = ?, upi_id = ? WHERE user_id = ?',
            [name, phone, upi_id, userId]
        );
    }
};

module.exports = UserModel;
