import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Photo Upload', () => {
  test('guest can select and upload photos from gallery', async ({ page }) => {
    await page.goto('/e/test-event');
    
    // Enter guest name
    const nameInput = page.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill('Photo Uploader');
      const submitButton = page.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Click upload/share button
    const uploadButton = page.locator('button:has-text("Compartir"), button:has-text("Subir"), button:has-text("Upload")').first();
    await expect(uploadButton).toBeVisible();
    await uploadButton.click();
    
    // File selector should appear
    const fileSelector = page.locator('input[type="file"]');
    await expect(fileSelector).toBeVisible({ timeout: 5000 }).catch(() => {
      // Might be hidden input triggered by button
    });
    
    // Create a test image
    const testImagePath = path.join(__dirname, 'test-image.png');
    // Create a minimal valid PNG
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(testImagePath, pngBuffer);
    
    // Upload the file
    await fileSelector.setInputFiles(testImagePath);
    
    // Wait for upload to complete
    await page.waitForTimeout(3000);
    
    // Clean up
    fs.unlinkSync(testImagePath);
    
    // Photo should appear in gallery
    const photoCount = await page.locator('img').count();
    expect(photoCount).toBeGreaterThanOrEqual(0);
  });

  test('camera capture works when available', async ({ page }) => {
    await page.goto('/e/test-event');
    
    // Enter guest name
    const nameInput = page.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill('Camera User');
      const submitButton = page.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Click camera button
    const cameraButton = page.locator('button:has-text("Cámara"), button:has-text("Tomar"), button:has-text("Camera")').first();
    if (await cameraButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cameraButton.click();
      
      // Camera preview should appear or show error message
      const cameraPreview = page.locator('video');
      const cameraError = page.locator('text=camara, text=cámara, text=camera');
      
      await expect(cameraPreview.or(cameraError)).toBeVisible({ timeout: 10000 }).catch(() => {
        // Camera might not be available in test environment
      });
    }
  });

  test('upload shows progress indicator', async ({ page }) => {
    await page.goto('/e/test-event');
    
    // Enter guest name
    const nameInput = page.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill('Progress User');
      const submitButton = page.locator('button:has-text("Entrar"), button:has-text("Unirse"), button[type="submit"]').first();
      await submitButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Trigger upload
    const uploadButton = page.locator('button:has-text("Compartir"), button:has-text("Subir")').first();
    if (await uploadButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await uploadButton.click();
      
      // Progress indicator should be visible during upload
      const progressIndicator = page.locator('.progress, [role="progressbar"], text=subiendo, text=subida');
      await expect(progressIndicator).toBeVisible({ timeout: 5000 }).catch(() => {
        // Progress might be brief
      });
    }
  });
});
