import { test, expect } from '@playwright/test';

test('Login and Generate PDF Flow', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@ascenseurs-express.com');
    await page.fill('input[name="password"]', 'admin123');
    // Tenant ID is prefilled or we fill it if needed
    // await page.fill('input[name="tenantId"]', '...'); 
    await page.click('button[type="submit"]');

    // Verify Dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // 2. Go to Mission Details (Assuming list has items or mock)
    // Or navigate directly if we know ID.
    // For now, click first "View" button in Recent Missions
    await page.click('text=View >> nth=0');

    // Verify Mission Details
    await expect(page.locator('h1')).toBeVisible();

    // 3. Go to PDF Tab
    await page.click('button:has-text("PDF Report")');

    // 4. Generate PDF
    await page.click('button:has-text("Generate")');

    // 5. Verify Success Alert
    await expect(page.locator('text=Generation Initiated')).toBeVisible();

    // 6. Verify Download Option (if immediate)
    // await expect(page.locator('text=Download PDF')).toBeVisible(); 
});
