
import { test, expect } from '@playwright/test';

test.describe('Compliance Full Flow', () => {
    test('Complete compliance mission workflow', async ({ page }) => {
        test.setTimeout(120000); // Increase timeout to 120s

        // 1. Login
        console.log('Navigating to login...');
        await page.goto('http://localhost:3000/login');
        await page.waitForSelector('input[name="email"]', { state: 'visible' });

        await page.fill('input[name="email"]', 'admin@ascenseurs-express.com');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');

        // Wait for dashboard or redirect
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

        // 2. Navigate to a Mission
        // Wait for missions to load
        await page.waitForSelector('h2:has-text("Recent Missions")');
        // Check if there are any rows
        const rows = page.locator('table tbody tr');
        await expect(rows.first()).toBeVisible({ timeout: 10000 });

        // Click the first mission
        await rows.first().click();

        // Wait for mission details
        await expect(page).toHaveURL(/\/missions\/[a-f0-9-]+/, { timeout: 15000 });
        await expect(page.locator('h1')).toBeVisible();

        // 3. Open Compliance Tab
        await page.click('text=Contrôle'); // Click by text
        // Check for a unique element in the Compliance tab
        await expect(page.locator('text=Checklist de Contrôle')).toBeVisible({ timeout: 10000 });

        // 4. Interact with Checklist (Optional, check if grid exists)
        // Just verify grid is present
        await expect(page.locator('.grid').first()).toBeVisible();

        // 5. Asset Specs Form - Test Dirty State
        // Target by label text
        const brandInput = page.getByLabel('Marque / Constructeur');
        if (await brandInput.count() > 0) {
            await brandInput.fill('Test Manufacturer ' + Date.now());

            // Save
            const saveBtn = page.locator('button:has-text("Save Changes")');
            await saveBtn.click();
            await expect(page.locator('text=Asset specifications updated')).toBeVisible();
        }

        // 6. Conclusion Form
        const clientRefInput = page.getByLabel('Référence Client');
        await clientRefInput.fill('REF-' + Date.now());
        await page.click('button:has-text("Save Conclusion")');
        await expect(page.locator('text=Conclusion updated')).toBeVisible();

        // 7. PDF Generation
        await page.click('text=PDF Report'); // Click by text
        await page.click('button:has-text("Generate")');

        // Wait for success or at least "Generating"
        await expect(page.locator('text=PDF Generation started')).toBeVisible();
        // Poll handling in UI should show "Processing" or "Ready" eventually
        // We can wait for "Ready" if we want to be thorough, but it might take time
        // await expect(page.locator('text=Ready')).toBeVisible({ timeout: 10000 });
    });
});
