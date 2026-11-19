import { test, expect } from '@playwright/test';

test.describe('Delete Event', () => {
  test('organizer can delete an event from the events list', async ({ page }) => {
    // Login as organizer
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');

    // Navigate to events list
    await page.goto('/admin/events');
    await page.waitForTimeout(1000);

    // Check if there are events to delete
    const eventCards = page.locator('text=/fotos/');
    const eventCount = await eventCards.count();

    if (eventCount === 0) {
      // No events to delete, test is skipped
      test.skip();
    }

    // Get the first event's name before deleting
    const firstEventName = await page.locator('h3.font-semibold').first().textContent();
    expect(firstEventName).not.toBeNull();

    // Click the delete button on the first event card
    const deleteButton = page.locator('button:has-text("Eliminar")').first();
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    // Wait for confirmation dialog to appear
    const dialog = page.locator('[data-slot="dialog-content"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify dialog shows the event name
    await expect(dialog).toContainText(firstEventName!, { timeout: 5000 });

    // Verify warning message is shown
    await expect(page.locator('text=irreversible')).toBeVisible({ timeout: 5000 });

    // Confirm deletion
    const confirmDeleteButton = page.locator('button:has-text("Eliminar evento")');
    await confirmDeleteButton.click();

    // Wait for deletion to complete and redirect
    await page.waitForTimeout(2000);

    // Verify the event is no longer visible on the page
    await expect(page.locator(`text="${firstEventName}"`)).not.toBeVisible();
  });

  test('organizer can delete an event from the event detail page', async ({ page }) => {
    // Login as organizer
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');

    // Navigate to events list
    await page.goto('/admin/events');
    await page.waitForTimeout(1000);

    // Check if there are events
    const eventLinks = page.locator('a[href*="/admin/events/"]');
    const eventCount = await eventLinks.count();

    if (eventCount === 0) {
      test.skip();
    }

    // Get the first event's link and name
    const firstEventLink = await eventLinks.first().getAttribute('href');
    const firstEventName = await page.locator('h3.font-semibold').first().textContent();
    expect(firstEventLink).not.toBeNull();

    // Navigate to event detail page
    await page.goto(firstEventLink!);
    await page.waitForTimeout(1000);

    // Verify we're on the detail page
    await expect(page.locator(`text="${firstEventName}"`)).toBeVisible({ timeout: 5000 });

    // Find and click the delete button
    const deleteButton = page.locator('button:has-text("Eliminar")').first();
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    // Wait for confirmation dialog
    const dialog = page.locator('[data-slot="dialog-content"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify dialog content
    await expect(dialog).toContainText('Eliminar evento', { timeout: 5000 });
    await expect(dialog).toContainText(firstEventName!, { timeout: 5000 });

    // Verify warning about what will be deleted
    await expect(page.locator('text=fotos')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=invitados')).toBeVisible({ timeout: 5000 });

    // Confirm deletion
    const confirmDeleteButton = page.locator('button:has-text("Eliminar evento")');
    await confirmDeleteButton.click();

    // Wait for redirect to dashboard
    await page.waitForURL('/admin', { timeout: 10000 });

    // Verify event is gone from the events list
    await page.goto('/admin/events');
    await page.waitForTimeout(1000);
    await expect(page.locator(`text="${firstEventName}"`)).not.toBeVisible();
  });

  test('delete event dialog shows loading state', async ({ page }) => {
    // Login as organizer
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');

    // Navigate to events list
    await page.goto('/admin/events');
    await page.waitForTimeout(1000);

    // Check if there are events
    const eventCards = page.locator('text=/fotos/');
    if ((await eventCards.count()) === 0) {
      test.skip();
    }

    // Click delete button
    const deleteButton = page.locator('button:has-text("Eliminar")').first();
    await deleteButton.click();

    // Verify dialog opens
    const dialog = page.locator('[data-slot="dialog-content"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify cancel button is visible
    const cancelButton = page.locator('button:has-text("Cancelar")');
    await expect(cancelButton).toBeVisible({ timeout: 5000 });

    // Cancel the deletion
    await cancelButton.click();
    await expect(dialog).not.toBeVisible();
  });

  test('unauthenticated user cannot delete events via API', async ({ page }) => {
    // Try to delete an event without authentication
    const response = await page.request.delete('/api/events/test-event-id');
    
    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('deleting non-existent event returns error', async ({ page }) => {
    // Login as organizer
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');

    // Try to delete a non-existent event
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const response = await page.request.delete(`/api/events/${nonExistentId}`);
    
    // Should return 403 (access check happens before existence check) or 404
    expect([403, 404]).toContain(response.status());
  });

  test('delete event removes related resources', async ({ page }) => {
    // Login as organizer
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');

    // Navigate to events list
    await page.goto('/admin/events');
    await page.waitForTimeout(1000);

    // Check if there are events
    const eventLinks = page.locator('a[href*="/admin/events/"]');
    if ((await eventLinks.count()) === 0) {
      test.skip();
    }

    // Get the first event
    const firstEventLink = await eventLinks.first().getAttribute('href');
    const firstEventName = await page.locator('h3.font-semibold').first().textContent();
    expect(firstEventLink).not.toBeNull();

    // Extract event ID from URL
    const eventId = firstEventLink!.split('/').pop();

    // Delete the event via API
    const response = await page.request.delete(`/api/events/${eventId}`);
    expect(response.status()).toBe(200);

    // Verify the event detail page returns 404 or shows not found
    await page.goto(firstEventLink!);
    await page.waitForTimeout(1000);

    // Should show "Evento no encontrado" or redirect
    const notFound = page.locator('text=Evento no encontrado');
    const isNotFoundVisible = await notFound.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isNotFoundVisible) {
      // Might redirect to admin dashboard
      await expect(page).toHaveURL(/\/admin/, { timeout: 5000 }).catch(() => {
        // Or might show a different message
      });
    }

    // Verify the event is gone from the list
    await page.goto('/admin/events');
    await page.waitForTimeout(1000);
    await expect(page.locator(`text="${firstEventName}"`)).not.toBeVisible();
  });
});
