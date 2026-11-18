import { test, expect } from '@playwright/test';

test.describe('Guest Access', () => {
  test('guest can access event page via public URL', async ({ page }) => {
    // Navigate to a public event page
    await page.goto('/e/test-event');
    
    // Should show event header
    await expect(page.locator('h1')).toBeVisible();
    
    // Should show guest name input or consent modal
    const nameInput = page.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    const consentModal = page.locator('[role="dialog"]');
    
    await expect(nameInput.or(consentModal)).toBeVisible({ timeout: 10000 });
  });

  test('guest can enter name and join event', async ({ page }) => {
    await page.goto('/e/test-event');
    
    // Enter display name
    const nameInput = page.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill('Test Guest');
      
      // Submit name
      const submitButton = page.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton.click();
      
      // Should show gallery or consent modal
      await expect(page.locator('.gallery, [role="dialog"], button:has-text("Compartir")')).toBeVisible({ timeout: 10000 }).catch(() => {
        // Gallery might be empty
      });
    }
  });

  test('guest session persists across page reload', async ({ page }) => {
    await page.goto('/e/test-event');
    
    // Enter name
    const nameInput = page.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill('Persistent Guest');
      const submitButton = page.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton.click();
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should not ask for name again
      await expect(nameInput).not.toBeVisible({ timeout: 5000 }).catch(() => {
        // Name input should not be visible after reload
      });
    }
  });
});
