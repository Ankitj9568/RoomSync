const { defineConfig, devices } = require('@playwright/test');

// Mobile-first smoke suite. The local server must be running against a
// PostgreSQL database before these run:
//
//   npm start &
//   npx playwright test
//
// Tests register a fresh user each run, so no seed data is required.
module.exports = defineConfig({
    testDir: './tests/e2e',
    timeout: 60000,
    fullyParallel: false,
    reporter: [['list']],
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
        trace: 'retain-on-failure'
    },
    projects: [
        {
            name: 'mobile',
            use: { ...devices['Pixel 5'] }
        }
    ],
    webServer: undefined
});
