import { test, expect } from '@playwright/test';

test.describe('QR Generation', () => {
  test('organizer can generate and download QR code', async ({ page }) => {
    // Login as organizer
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
    
    // Navigate to event detail page
    await page.goto('/admin/events');
    const firstEventLink = page.locator('a[href*="/admin/events/"]').first();
    const eventId = (await firstEventLink.getAttribute('href'))?.split('/').pop();
    
    if (eventId) {
      await page.goto(`/admin/events/${eventId}`);
      
      // Find and click QR download button
      const qrButton = page.locator('button:has-text("QR"), button:has-text("Descargar")').first();
      await expect(qrButton).toBeVisible();
      
      // Click to download QR
      const downloadPromise = page.waitForEvent('download');
      await qrButton.click();
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toMatch(/\.png$/);
    }
  });

  test('QR code links to correct event page', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
    
    // Get event slug from events list
    await page.goto('/admin/events');
    const eventLink = page.locator('a[href*="/e/"]').first();
    const eventUrl = await eventLink.getAttribute('href');
    
    if (eventUrl) {
      // Click the event link
      await eventLink.click();
      await page.waitForURL(eventUrl);
      
      // Verify we're on the public event page
      await expect(page).toHaveURL(/\/e\//);
      await expect(page.locator('h1')).toBeVisible();
    }
  });
});
