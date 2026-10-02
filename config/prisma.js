const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const prisma = globalForPrisma.__roomsyncPrisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.__roomsyncPrisma = prisma;
}

module.exports = prisma;
