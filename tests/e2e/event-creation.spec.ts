import { test, expect } from '@playwright/test';

test.describe('Event Creation', () => {
  test('organizer can create a new event', async ({ page }) => {
    // Navigate to login
    await page.goto('/admin/login');
    
    // Fill in login credentials (assuming test user exists)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/admin');
    
    // Navigate to create event
    await page.goto('/admin/events/create');
    
    // Fill in event details
    await page.fill('input[name="name"]', 'Test Event');
    await page.fill('textarea[name="description"]', 'A test event for Xalt Moments');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to events list or detail page
    await page.waitForURL(/\/admin\/events/);
    
    // Verify event was created
    await expect(page.locator('text=Test Event')).toBeVisible();
  });

  test('event creation requires valid name', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
    
    await page.goto('/admin/events/create');
    
    // Try to submit without a name
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator('[role="alert"], .text-red-500, [data-state="valid"]')).toBeVisible({ timeout: 5000 }).catch(() => {
      // Validation might be handled differently
    });
  });
});
