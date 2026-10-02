const { test, expect } = require('@playwright/test');

async function solveCaptcha(page, kind) {
    const question = await page.textContent(`#captchaQuestion-${kind}`);
    const match = String(question).match(/What is (\d+) ([+\-×]) (\d+)\?/);
    if (!match) throw new Error(`Unparseable captcha: ${question}`);
    const [, left, op, right] = match;
    const answer = op === '+' ? Number(left) + Number(right)
        : op === '-' ? Number(left) - Number(right)
        : Number(left) * Number(right);
    return String(answer);
}

// Regression: a stale stored group id (e.g. testing several accounts in one
// browser) must not bounce every page back to Manage Groups. Pages wait for
// the navbar-validated group, so a healed id loads in place.
test('stale group id heals without redirecting to groups', async ({ page }) => {
    const stamp = Date.now();
    const email = `stale${stamp}@example.com`;

    // Register and create a group so this account owns exactly one group.
    await page.goto('/pages/register.html');
    await page.fill('#name', 'Stale Test');
    await page.fill('#email', email);
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.fill('#captchaAnswer-register', await solveCaptcha(page, 'register'));
    await page.click('#registerForm button[type="submit"]');
    await page.waitForURL(/\/pages\/(dashboard|groups)\.html/, { timeout: 30000 });

    await page.goto('/pages/groups.html');
    await page.fill('#newGroupName', `Flat ${stamp}`);
    await page.click('#createGroupForm button[type="submit"]');
    await page.waitForFunction(() => !!localStorage.getItem('activeGroupId'), null, { timeout: 30000 });
    // The create handler reloads the page; let it settle before poisoning.
    await page.waitForLoadState('networkidle');

    // Poison the stored id, then open a data page directly.
    await page.evaluate(() => localStorage.setItem('activeGroupId', '99999'));
    await page.goto('/pages/expenses.html');

    // Must stay on expenses (navbar heals the id and loads data in place).
    await page.waitForTimeout(4000);
    expect(page.url()).toContain('/pages/expenses.html');
    expect(page.url()).not.toContain('/pages/groups.html');
});
