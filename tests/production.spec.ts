import { test, expect } from '@playwright/test';

test.describe('Epstein Archive - Production E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the homepage successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Epstein Archive/);
    await expect(page.locator('h1')).toContainText('Epstein Archive');
  });

  test('should display network visualization', async ({ page }) => {
    await expect(page.locator('#network-visualization')).toBeVisible();
    const count = await page.locator('.network-node').count();
    expect(count).toBeGreaterThan(0);
  });

  test('should search for entities', async ({ page }) => {
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('Epstein');
    await searchInput.press('Enter');
    
    await expect(page.locator('.search-results')).toBeVisible();
    const count = await page.locator('.entity-card').count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter by likelihood level', async ({ page }) => {
    await page.selectOption('select[name="likelihood"]', 'HIGH');
    const count = await page.locator('.entity-card').count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to entity details', async ({ page }) => {
    const firstEntity = page.locator('.entity-card').first();
    await firstEntity.click();
    
    await expect(page).toHaveURL(/\/entity\/\d+/);
    await expect(page.locator('.entity-details')).toBeVisible();
  });

  test('should access investigation workspace', async ({ page }) => {
    await page.click('text=Investigations');
    await expect(page).toHaveURL(/\/investigations/);
    await expect(page.locator('.investigation-workspace')).toBeVisible();
  });

  test('should create new investigation', async ({ page }) => {
    await page.click('text=Investigations');
    await page.click('text=New Investigation');
    
    await page.fill('input[name="title"]', 'Test Investigation');
    await page.fill('textarea[name="hypothesis"]', 'Testing investigation creation');
    await page.click('button:has-text("Create Investigation")');
    
    await expect(page.locator('text=Test Investigation')).toBeVisible();
  });

  test('should access forensic analysis tools', async ({ page }) => {
    await page.click('text=Investigations');
    // Click on the first investigation in the list
    await page.locator('.investigation-workspace .grid > div').first().click();
    
    // Navigate to forensic analysis tab
    await page.click('text=Forensic Analysis');
    await expect(page.locator('.forensic-analysis-workspace')).toBeVisible();
  });

  test('should handle API health check', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const health = await response.json();
    expect(health.status).toBe('healthy');
    expect(health.database).toBe('connected');
  });

  test('should handle 404 errors gracefully', async ({ page }) => {
    await page.goto('/non-existent-page');
    await expect(page.locator('.error-page')).toBeVisible();
    await expect(page.locator('h1')).toContainText('404');
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.mobile-menu')).toBeVisible();
    
    // Test mobile navigation
    await page.click('.mobile-menu');
    await expect(page.locator('.mobile-nav')).toBeVisible();
  });

  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Test with pagination
    await page.selectOption('select[name="limit"]', '100');
    const startTime = Date.now();
    
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000); // Should handle 100 items within 3 seconds
    const count = await page.locator('.entity-card').count();
    expect(count).toBeGreaterThan(0);
  });
});