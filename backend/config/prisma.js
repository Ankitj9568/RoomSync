const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

// Opt-in query logging for staging/performance work. Enable with
// PRISMA_LOG_QUERIES=true (logs go to stdout, picked up by Vercel logs).
// Leave unset in production to avoid log noise and latency overhead.
const logQueries = process.env.PRISMA_LOG_QUERIES === 'true';

const prisma = globalForPrisma.__roomsyncPrisma || new PrismaClient({
    log: logQueries ? ['query', 'error', 'warn'] : ['error']
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.__roomsyncPrisma = prisma;
}

module.exports = prisma;
