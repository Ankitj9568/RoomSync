// Backwards-compatible database entry point. New code should import
// config/prisma directly; this alias keeps health checks and external scripts
// from depending on a database-specific adapter.
module.exports = require('./prisma');
