import { test, expect } from '@playwright/test';

test.describe('Epstein Archive - Production E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the homepage successfully', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('THE EPSTEIN FILES');
  });

  test('should display network visualization', async ({ page }) => {
    await page.click('button:has-text("Analytics")');
    await expect(page.locator('text=Data Analytics')).toBeVisible();
    await expect(page.locator('.recharts-pie')).toBeVisible();
  });

  test('should search for entities', async ({ page }) => {
    const searchInput = page.locator('input[aria-label="Search names, contexts..."]');
    await searchInput.fill('Epstein');
    await page.waitForLoadState('networkidle');
    const count = await page.locator('.interactive-card').count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter by entity type', async ({ page }) => {
    await page.click('button:has-text("Subjects")');
    await page.selectOption('select[aria-label="Filter by entity type"]', 'Person');
    const count = await page.locator('.interactive-card').count();
    expect(count).toBeGreaterThan(0);
  });

  test('should open entity evidence modal', async ({ page }) => {
    await page.click('button:has-text("Subjects")');
    await page.waitForSelector('.interactive-card', { timeout: 10000 });
    await page.locator('.interactive-card').first().click();
    await expect(page.locator('text=RISK')).toBeVisible();
  });

  test('should access investigation workspace', async ({ page }) => {
    // Set localStorage to bypass onboarding
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenInvestigationOnboarding', 'true');
    });
    
    await page.goto('/');
    await page.click('text=Investigations');
    
    // If onboarding is still visible, skip it
    const skipButton = page.locator('text=Skip Tour');
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }
    
    await expect(page).toHaveURL(/\/investigations/);
    await expect(page.locator('.investigation-workspace')).toBeVisible();
  });

  test('should create new investigation', async ({ page }) => {
    // Set localStorage to bypass onboarding
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenInvestigationOnboarding', 'true');
    });
    
    await page.goto('/');
    await page.click('text=Investigations');
    
    // If onboarding is still visible, skip it
    const skipButton = page.locator('text=Skip Tour');
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }
    
    await page.click('text=New Investigation');
    
    await page.fill('input[name="title"]', 'Test Investigation');
    await page.fill('textarea[name="description"]', 'Testing investigation creation');
    await page.click('button:has-text("Create")');
    
    await expect(page.locator('text=Test Investigation')).toBeVisible();
  });

  test('should access forensic analysis tools', async ({ page }) => {
    // Set localStorage to bypass onboarding
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenInvestigationOnboarding', 'true');
    });
    
    await page.goto('/');
    await page.click('text=Investigations');
    
    // If onboarding is still visible, skip it
    const skipButton = page.locator('text=Skip Tour');
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }
    
    // Click on the first investigation in the list or create one if none exist
    const newInvestigationButton = page.locator('text=New Investigation');
    const existingInvestigations = page.locator('.investigation-card');
    
    if (await existingInvestigations.count() > 0) {
      await existingInvestigations.first().click();
    } else {
      // Create a test investigation
      await newInvestigationButton.click();
      await page.fill('input[name="title"]', 'Test Investigation');
      await page.fill('textarea[name="description"]', 'Test investigation for e2e testing');
      await page.click('button:has-text("Create")');
    }
    
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

  test('should handle unknown routes by showing subjects', async ({ page }) => {
    await page.goto('/non-existent-page');
    await expect(page.locator('button:has-text("Subjects")')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    await page.click('button:has-text("Subjects")');
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(10000);
    const count = await page.locator('.interactive-card').count();
    expect(count).toBeGreaterThan(0);
  });
});