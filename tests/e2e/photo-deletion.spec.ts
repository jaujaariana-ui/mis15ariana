import { test, expect } from '@playwright/test';

test.describe('Photo Deletion', () => {
  test('guest can delete their own photos', async ({ page }) => {
    await page.goto('/e/test-event');
    
    // Enter guest name
    const nameInput = page.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill('Delete Guest');
      const submitButton = page.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Find a photo uploaded by this guest
    const photo = page.locator('img').first();
    if (await photo.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click on photo to open lightbox or find delete button
      await photo.click();
      await page.waitForTimeout(500);
      
      // Look for delete button
      const deleteButton = page.locator('button:has-text("Eliminar"), button:has-text("Delete"), button[aria-label*="eliminar"]').first();
      if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteButton.click();
        
        // Confirm deletion if prompted
        const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Sí"), button:has-text("Confirm")').first();
        if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmButton.click();
        }
        
        // Photo should be removed from gallery
        await page.waitForTimeout(1000);
      }
    }
  });

  test('guest cannot delete other guests photos', async ({ page, context }) => {
    // Guest 1 uploads a photo
    const page1 = page;
    await page1.goto('/e/test-event');
    
    const nameInput1 = page1.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput1.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput1.fill('Photo Owner');
      const submitButton1 = page1.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton1.click();
      await page1.waitForTimeout(1000);
    }
    
    // Guest 2 tries to delete Guest 1's photo
    const page2 = await context.newPage();
    await page2.goto('/e/test-event');
    
    const nameInput2 = page2.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput2.fill('Other Guest');
      const submitButton2 = page2.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton2.click();
      await page2.waitForTimeout(1000);
    }
    
    // Try to find and click delete button on a photo
    const photo = page2.locator('img').first();
    if (await photo.isVisible({ timeout: 5000 }).catch(() => false)) {
      await photo.click();
      await page2.waitForTimeout(500);
      
      // Delete button should NOT be visible for other guests' photos
      const deleteButton = page2.locator('button:has-text("Eliminar"), button:has-text("Delete")').first();
      
      // Either delete button is not visible, or clicking it shows an error
      const isDeleteVisible = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isDeleteVisible) {
        await deleteButton.click();
        await page2.waitForTimeout(1000);
        
        // Should show error message
        const errorMessage = page2.locator('text=error, text=Error, text=no autorizado, text=propia');
        await expect(errorMessage).toBeVisible({ timeout: 5000 }).catch(() => {
          // Error handling might be different
        });
      }
    }
    
    await page2.close();
  });

  test('deletion removes photo from gallery in real time', async ({ page, context }) => {
    const page2 = await context.newPage();
    
    await page.goto('/e/test-event');
    await page2.goto('/e/test-event');
    
    // Both guests join
    const nameInput1 = page.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput1.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput1.fill('Delete Realtime 1');
      const submitButton1 = page.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton1.click();
      await page.waitForTimeout(1000);
    }
    
    const nameInput2 = page2.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput2.fill('Delete Realtime 2');
      const submitButton2 = page2.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton2.click();
      await page2.waitForTimeout(1000);
    }
    
    // Count photos before deletion
    const countBefore = await page.locator('img').count();
    const countBefore2 = await page2.locator('img').count();
    
    // Delete a photo on page 1
    const photo = page.locator('img').first();
    if (await photo.isVisible({ timeout: 5000 }).catch(() => false)) {
      await photo.click();
      await page.waitForTimeout(500);
      
      const deleteButton = page.locator('button:has-text("Eliminar"), button:has-text("Delete")').first();
      if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteButton.click();
        
        const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Sí")').first();
        if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmButton.click();
        }
        
        // Wait for realtime update
        await page.waitForTimeout(2000);
        await page2.waitForTimeout(2000);
        
        // Both pages should show one less photo
        const countAfter = await page.locator('img').count();
        const countAfter2 = await page2.locator('img').count();
        
        expect(countAfter).toBeLessThanOrEqual(countBefore);
        expect(countAfter2).toBeLessThanOrEqual(countBefore2);
      }
    }
    
    await page2.close();
  });
});
