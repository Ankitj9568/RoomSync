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

// A fresh account with no groups must never be bounced around: data pages
// stay put with an empty state, and the scanner opens so the camera works.
test('groupless user can open scan and data pages freely', async ({ page }) => {
    const stamp = Date.now();
    const email = `nogroup${stamp}@example.com`;

    await page.goto('/pages/register.html');
    await page.fill('#name', 'No Group');
    await page.fill('#email', email);
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.fill('#captchaAnswer-register', await solveCaptcha(page, 'register'));
    await page.click('#registerForm button[type="submit"]');
    await page.waitForURL(/\/pages\/(dashboard|groups)\.html/, { timeout: 30000 });

    // Scan page opens and asks for camera permission (no redirect to groups).
    await page.goto('/pages/scan.html');
    await page.waitForTimeout(2500);
    expect(page.url()).toContain('/pages/scan.html');
    await expect(page.getByRole('button', { name: 'Allow Camera' })).toBeVisible();

    // Data pages stay put with an empty state instead of redirecting.
    await page.goto('/pages/expenses.html');
    await page.waitForTimeout(2500);
    expect(page.url()).toContain('/pages/expenses.html');
    await expect(page.getByRole('link', { name: 'Create or Join a Group' })).toBeVisible();
});
