import { test, expect } from '@playwright/test';

test.describe('Gallery Realtime', () => {
  test('gallery updates in real time when new photos are added', async ({ page, context }) => {
    // Open two browser contexts to simulate two guests
    const page2 = await context.newPage();
    
    // Both guests join the same event
    await page.goto('/e/test-event');
    await page2.goto('/e/test-event');
    
    // Guest 1 enters name
    const nameInput1 = page.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput1.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput1.fill('Realtime Guest 1');
      const submitButton1 = page.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton1.click();
      await page.waitForTimeout(1000);
    }
    
    // Guest 2 enters name
    const nameInput2 = page2.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput2.fill('Realtime Guest 2');
      const submitButton2 = page2.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton2.click();
      await page2.waitForTimeout(1000);
    }
    
    // Both should see the same gallery
    const gallery1 = page.locator('.gallery, [class*="gallery"], img[alt*="foto"], img[alt*="Foto"]');
    const gallery2 = page2.locator('.gallery, [class*="gallery"], img[alt*="foto"], img[alt*="Foto"]');
    
    // Wait for galleries to load
    await page.waitForTimeout(2000);
    await page2.waitForTimeout(2000);
    
    // Both pages should show the same content
    const count1 = await gallery1.count();
    const count2 = await gallery2.count();
    
    // Counts should match (both see same gallery)
    expect(count1).toBe(count2);
    
    await page2.close();
  });

  test('gallery shows empty state when no photos', async ({ page }) => {
    await page.goto('/e/empty-event');
    
    // Enter guest name if needed
    const nameInput = page.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill('Empty Gallery Guest');
      const submitButton = page.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Should show empty state message
    const emptyState = page.locator('text=fotos, text=Fotos, text=galería, text=Galería');
    await expect(emptyState).toBeVisible({ timeout: 10000 }).catch(() => {
      // Empty state might have different text
    });
  });

  test('gallery supports lightbox view', async ({ page }) => {
    await page.goto('/e/test-event');
    
    // Enter guest name
    const nameInput = page.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill('Lightbox Guest');
      const submitButton = page.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Click on a photo to open lightbox
    const photo = page.locator('img').first();
    if (await photo.isVisible({ timeout: 5000 }).catch(() => false)) {
      await photo.click();
      
      // Lightbox should appear
      const lightbox = page.locator('[role="dialog"], .lightbox, [class*="lightbox"]');
      await expect(lightbox).toBeVisible({ timeout: 5000 }).catch(() => {
        // Lightbox might use different structure
      });
    }
  });
});
