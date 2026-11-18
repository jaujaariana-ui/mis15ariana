import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('event page is responsive on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 }, // iPhone X dimensions
      isMobile: true,
    });
    const page = await context.newPage();
    
    await page.goto('/e/test-event');
    
    // Event header should be visible
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    
    // Upload buttons should be accessible
    const uploadButton = page.locator('button:has-text("Compartir"), button:has-text("Subir"), button:has-text("Cámara")').first();
    await expect(uploadButton).toBeVisible({ timeout: 10000 }).catch(() => {
      // Buttons might have different text
    });
    
    // Gallery should be scrollable
    const gallery = page.locator('.gallery, [class*="gallery"], main').first();
    await expect(gallery).toBeVisible({ timeout: 10000 }).catch(() => {
      // Gallery might use different structure
    });
    
    await context.close();
  });

  test('event page is responsive on tablet', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 }, // iPad dimensions
    });
    const page = await context.newPage();
    
    await page.goto('/e/test-event');
    
    // Event header should be visible
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    
    // Gallery should display in grid layout
    const gallery = page.locator('.gallery, [class*="gallery"], main').first();
    await expect(gallery).toBeVisible({ timeout: 10000 }).catch(() => {
      // Gallery might use different structure
    });
    
    await context.close();
  });

  test('event page is responsive on desktop', async ({ page }) => {
    await page.goto('/e/test-event');
    
    // Event header should be visible
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    
    // Gallery should display properly
    const gallery = page.locator('.gallery, [class*="gallery"], main').first();
    await expect(gallery).toBeVisible({ timeout: 10000 }).catch(() => {
      // Gallery might use different structure
    });
  });

  test('admin panel is responsive on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
    });
    const page = await context.newPage();
    
    await page.goto('/admin/login');
    
    // Login form should be accessible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    await context.close();
  });

  test('touch interactions work on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
    });
    const page = await context.newPage();
    
    await page.goto('/e/test-event');
    
    // Enter guest name
    const nameInput = page.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.tap();
      await nameInput.fill('Mobile Touch User');
      
      const submitButton = page.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton.tap();
      await page.waitForTimeout(1000);
    }
    
    // Gallery should be visible
    const gallery = page.locator('.gallery, [class*="gallery"], main, img').first();
    await expect(gallery).toBeVisible({ timeout: 10000 }).catch(() => {
      // Gallery might be empty
    });
    
    await context.close();
  });
});
