const { test, expect } = require('@playwright/test');

// Smoke: a new user can register and land inside the app on a mobile viewport.
// Registration is used (instead of a fixed login) so the suite needs no seed
// data and can run against any migrated database.
test('register and reach the app on mobile', async ({ page }) => {
    const stamp = Date.now();
    const email = `smoke${stamp}@example.com`;

    await page.goto('/pages/register.html');
    await expect(page).toHaveTitle(/RoomSync/);

    await page.fill('#name', 'Smoke Test');
    await page.fill('#email', email);
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.click('#registerForm button[type="submit"]');

    // No groups yet, so the navbar sends first-time users to groups setup.
    await page.waitForURL(/\/pages\/(dashboard|groups)\.html/, { timeout: 30000 });

    // Mobile navigation chrome is present on small viewports.
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
});
