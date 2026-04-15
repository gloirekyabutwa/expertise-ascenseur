
import { test, expect } from '@playwright/test';

test('Login Debugging', async ({ page }) => {
    // 1. Capture Console Logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', exception => console.log('PAGE ERROR:', exception));

    // 2. Capture Network Requests
    page.on('requestfailed', request => {
        console.log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
    });

    page.on('response', async response => {
        if (response.status() >= 400) {
            console.log(`RESPONSE ERROR: ${response.url()} - ${response.status()}`);
            console.log('Headers:', await response.allHeaders());
        }
    });

    // 3. Go to Login Page
    await page.goto('http://localhost:3000/login');

    // 4. Fill Form
    await page.fill('input[name="tenantId"]', '7327c495-606c-45c4-8896-416dd6a46367');
    await page.fill('input[name="email"]', 'admin@ascenseurs-express.com');
    await page.fill('input[name="password"]', 'admin123');

    // 5. Submit
    await page.click('button[type="submit"]');

    // 6. Wait for Navigation or Toast
    // We expect a redirect to /dashboard if successful, or a toast if failed.
    try {
        await expect(page).toHaveURL('http://localhost:3000/dashboard', { timeout: 5000 });
        console.log("LOGIN SUCCESS: Redirected to dashboard");
    } catch (e) {
        console.log("LOGIN FAILED: Did not redirect to dashboard");
        // Check for error toast
        const toast = await page.locator('.sonner-toast').first();
        if (await toast.isVisible()) {
            console.log("TOAST MESSAGE:", await toast.textContent());
        }
    }

    // Keep open for a bit to see logs
    await page.waitForTimeout(2000);
});
