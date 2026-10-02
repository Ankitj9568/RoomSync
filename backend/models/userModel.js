const prisma = require('../config/prisma');
const { normalizeEmail } = require('../utils/validation');

function publicUser(user) {
    if (!user) return user;
    return {
        user_id: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        upi_id: user.upiId,
        avatar_url: user.avatarUrl,
        email_verified: user.emailVerified,
        account_type: user.accountType || 'roommate'
    };
}

const UserModel = {
    async findByEmail(email) {
        const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
        return user ? { ...publicUser(user), password_hash: user.passwordHash } : undefined;
    },

    async findById(userId) {
        return publicUser(await prisma.user.findUnique({ where: { userId: Number(userId) } }));
    },

    async create(userData) {
        const user = await prisma.user.create({
            data: {
                name: userData.name,
                email: normalizeEmail(userData.email),
                passwordHash: userData.password_hash || null,
                emailVerified: Boolean(userData.email_verified),
                accountType: userData.account_type || 'roommate'
            }
        });
        return user.userId;
    },

    async update(userId, userData) {
        await prisma.user.update({
            where: { userId: Number(userId) },
            data: { name: userData.name, phone: userData.phone || null, upiId: userData.upi_id || null }
        });
    },

    async findByIdWithHash(userId) {
        const user = await prisma.user.findUnique({ where: { userId: Number(userId) } });
        return user ? { ...publicUser(user), password_hash: user.passwordHash } : undefined;
    },

    async updatePassword(userId, newHash) {
        await prisma.user.update({ where: { userId: Number(userId) }, data: { passwordHash: newHash } });
    },

    async getMfa(userId) {
        const user = await prisma.user.findUnique({ where: { userId: Number(userId) } });
        if (!user) return null;
        return { totpSecret: user.totpSecret, mfaEnabled: Boolean(user.mfaEnabled) };
    },

    async setTotpSecret(userId, secret) {
        await prisma.user.update({ where: { userId: Number(userId) }, data: { totpSecret: secret } });
    },

    async setMfaEnabled(userId, enabled) {
        const data = { mfaEnabled: Boolean(enabled) };
        if (!enabled) data.totpSecret = null;
        await prisma.user.update({ where: { userId: Number(userId) }, data });
    },

    async findOrCreateOAuthUser({ provider, providerAccountId, email, name, avatarUrl, accountType }) {
        const existingAccount = await prisma.oAuthAccount.findUnique({
            where: { provider_providerAccountId: { provider, providerAccountId } },
            include: { user: true }
        });
        if (existingAccount) return existingAccount.user;

        const normalizedEmail = normalizeEmail(email);
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        const user = existingUser
            ? await prisma.user.update({
                where: { userId: existingUser.userId },
                data: { avatarUrl: avatarUrl || existingUser.avatarUrl, emailVerified: true }
            })
            : await prisma.user.create({
                data: {
                    name: name || normalizedEmail.split('@')[0],
                    email: normalizedEmail,
                    passwordHash: null,
                    avatarUrl: avatarUrl || null,
                    emailVerified: true,
                    accountType: accountType || 'roommate'
                }
            });

        await prisma.oAuthAccount.create({
            data: { provider, providerAccountId, userId: user.userId }
        });
        return user;
    }
};

module.exports = UserModel;
