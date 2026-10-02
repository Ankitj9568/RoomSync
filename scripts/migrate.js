const { execFileSync } = require('child_process');

// Prisma owns PostgreSQL schema migrations now. Keep this entry point for
// existing deployment scripts while routing it to the canonical command.
execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit'
});
