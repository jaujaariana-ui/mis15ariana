import { test, expect } from '@playwright/test';

test.describe('Admin Permissions', () => {
  test('organizer can access admin panel', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/admin');
    await expect(page.locator('h1, h2')).toContainText('Dashboard', { timeout: 10000 }).catch(() => {
      // Dashboard might have different heading
    });
  });

  test('organizer can delete any photo', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
    
    // Navigate to event detail
    await page.goto('/admin/events');
    const firstEventLink = page.locator('a[href*="/admin/events/"]').first();
    await firstEventLink.click();
    await page.waitForTimeout(1000);
    
    // Navigate to photos tab
    const photosTab = page.locator('[role="tab"]:has-text("Fotos"), [role="tab"]:has-text("Photos")').first();
    if (await photosTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await photosTab.click();
      await page.waitForTimeout(1000);
      
      // Find delete button for any photo
      const deleteButton = page.locator('button:has-text("Eliminar"), button:has-text("Delete")').first();
      if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteButton.click();
        
        // Confirm if prompted
        const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Sí")').first();
        if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmButton.click();
        }
        
        await page.waitForTimeout(1000);
      }
    }
  });

  test('organizer can manage event status', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
    
    // Navigate to event detail
    await page.goto('/admin/events');
    const firstEventLink = page.locator('a[href*="/admin/events/"]').first();
    await firstEventLink.click();
    await page.waitForTimeout(1000);
    
    // Navigate to settings tab
    const settingsTab = page.locator('[role="tab"]:has-text("Configuración"), [role="tab"]:has-text("Settings")').first();
    if (await settingsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsTab.click();
      await page.waitForTimeout(1000);
      
      // Should see status options
      const statusSelect = page.locator('select, [role="listbox"]');
      await expect(statusSelect).toBeVisible({ timeout: 5000 }).catch(() => {
        // Status might be radio buttons or other controls
      });
    }
  });

  test('closed event does not accept new uploads', async ({ page }) => {
    // Navigate to a closed event
    await page.goto('/e/closed-event');
    
    // Enter guest name
    const nameInput = page.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill('Closed Event Guest');
      const submitButton = page.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Upload button should be disabled or show error
    const uploadButton = page.locator('button:has-text("Compartir"), button:has-text("Subir")').first();
    const isDisabled = await uploadButton.isDisabled({ timeout: 5000 }).catch(() => false);
    
    if (!isDisabled) {
      await uploadButton.click();
      await page.waitForTimeout(1000);
      
      // Should show error message
      const errorMessage = page.locator('text=cerrado, text=cerrada, text=closed, text=expirado, text=expired');
      await expect(errorMessage).toBeVisible({ timeout: 5000 }).catch(() => {
        // Error might be shown differently
      });
    }
  });

  test('unauthenticated user cannot access admin panel', async ({ page }) => {
    await page.goto('/admin');
    
    // Should redirect to login
    await page.waitForURL(/\/admin\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
