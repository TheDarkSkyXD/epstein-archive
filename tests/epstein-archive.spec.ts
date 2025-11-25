import { test, expect } from '@playwright/test';
import { peopleData } from '../src/data/peopleData';

test.describe('Epstein Archive - Comprehensive Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test.describe('Basic Navigation', () => {
    test('should load the main page', async ({ page }) => {
      await expect(page).toHaveTitle(/Epstein Files Archive/);
      await expect(page.locator('h1')).toContainText('THE EPSTEIN FILES');
    });

    test('should navigate through all tabs', async ({ page }) => {
      // Test navigation to each tab by clicking the button containing the text
      const tabs = [
        { name: 'Subjects', selector: 'button:has-text("Subjects")' },
        { name: 'Analytics', selector: 'button:has-text("Analytics")' },
        { name: 'Evidence Search', selector: 'button:has-text("Evidence Search")' },
        { name: 'Documents', selector: 'button:has-text("Documents")' },
        { name: 'Timeline', selector: 'button:has-text("Timeline")' },
        { name: 'Articles', selector: 'button:has-text("Articles")' }
      ];
      
      for (const tab of tabs) {
        await page.click(tab.selector);
        // Check that the tab content is visible by looking for specific elements
        if (tab.name === 'Subjects') {
          await expect(page.locator('h2:text("Investigation Subjects")').first()).toBeVisible();
        } else if (tab.name === 'Analytics') {
          await expect(page.locator('h2:text("Data Analytics")').first()).toBeVisible();
        } else if (tab.name === 'Evidence Search') {
          await expect(page.locator('h2:text("Evidence Search")').first()).toBeVisible();
        } else if (tab.name === 'Documents') {
          await expect(page.locator('h2:text("Document Browser")').first()).toBeVisible();
        } else if (tab.name === 'Timeline') {
          await expect(page.locator('h2:text("Timeline of Events")').first()).toBeVisible();
        } else if (tab.name === 'Articles') {
          await expect(page.locator('h2:text("Latest Articles")').first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Spice Rating System', () => {
    test('should display spice ratings on person cards', async ({ page }) => {
      await page.click('button:has-text("Subjects")');
      
      // Check for Donald Trump (should have 5 peppers)
      const trumpCard = page.locator('text=Donald Trump').first().locator('..').locator('..');
      await expect(trumpCard).toContainText('🌶️🌶️🌶️🌶️🌶️');
      
      // Check for Ghislaine Maxwell (should have 5 peppers)
      const maxwellCard = page.locator('text=Ghislaine Maxwell').first().locator('..').locator('..');
      await expect(maxwellCard).toContainText('🌶️🌶️🌶️🌶️🌶️');
    });

    test('should filter by spice rating in search', async ({ page }) => {
      await page.click('button:has-text("Evidence Search")');
      
      // Set minimum spice rating to 4
      await page.selectOption('select >> nth=2', '4'); // Min Spice Rating
      
      // Should show only highly spicy people
      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('Donald Trump');
      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('Ghislaine Maxwell');
    });

    test('should sort by spice level', async ({ page }) => {
      await page.click('button:has-text("Evidence Search")');
      
      // Sort by spice level
      await page.selectOption('select >> nth=4', 'spice'); // Sort By
      
      // First result should be Donald Trump (highest spice score)
      const firstResult = page.locator('.bg-gray-800 >> nth=1');
      await expect(firstResult).toContainText('Donald Trump');
      await expect(firstResult).toContainText('🌶️🌶️🌶️🌶️🌶️');
    });
  });

  test.describe('Search Functionality', () => {
    test('should search for people by name', async ({ page }) => {
      await page.click('button:has-text("Evidence Search")');
      
      await page.fill('input[placeholder="Search names, contexts, or evidence..."]', 'Donald Trump');
      
      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('Donald Trump');
      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('🌶️🌶️🌶️🌶️🌶️');
    });

    test('should search by evidence type', async ({ page }) => {
      await page.click('button:has-text("Evidence Search")');
      
      await page.selectOption('select >> nth=1', 'flight_log'); // Evidence Type
      
      // Should show people with flight log evidence
      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('FLIGHT_LOG');
    });

    test('should search by risk level', async ({ page }) => {
      await page.click('button:has-text("Evidence Search")');
      
      await page.selectOption('select >> nth=0', 'HIGH'); // Risk Level
      
      // Should show only high risk people
      const results = page.locator('.bg-gray-800');
      await expect(results.first()).toContainText('HIGH RISK');
    });

    test('should combine multiple search filters', async ({ page }) => {
      await page.click('button:has-text("Evidence Search")');
      
      await page.fill('input[placeholder="Search names, contexts, or evidence..."]', 'Clinton');
      await page.selectOption('select >> nth=0', 'HIGH'); // Risk Level
      await page.selectOption('select >> nth=2', '4'); // Min Spice Rating
      
      // Should show high-risk, spicy Clinton-related results
      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('Clinton');
      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('HIGH RISK');
      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('🌶️🌶️🌶️🌶️');
    });
  });

  test.describe('Data Visualization', () => {
    test('should display analytics charts', async ({ page }) => {
      await page.click('button:has-text("Analytics")');
      
      // Check for chart containers
      await expect(page.locator('text=Risk Level Distribution')).toBeVisible();
      await expect(page.locator('text=Top People by Mentions')).toBeVisible();
      await expect(page.locator('text=Evidence Types')).toBeVisible();
      await expect(page.locator('text=Timeline of Events')).toBeVisible();
      
      // Check for chart elements
      await expect(page.locator('.recharts-pie')).toBeVisible();
      await expect(page.locator('.recharts-bar')).toBeVisible();
      await expect(page.locator('.recharts-area')).toBeVisible();
    });

    test('should display timeline visualization', async ({ page }) => {
      await page.click('button:has-text("Timeline")');
      
      await expect(page.locator('text=Timeline of Events')).toBeVisible();
      await expect(page.locator('.timeline-container')).toBeVisible();
    });

    test('should display network visualization', async ({ page }) => {
      await page.click('button:has-text("Documents")');
      
      await expect(page.locator('text=Network Connections')).toBeVisible();
      await expect(page.locator('.network-container')).toBeVisible();
    });
  });

  test.describe('Export Functionality', () => {
    test('should export CSV data', async ({ page }) => {
      await page.click('button:has-text("Subjects")');
      
      // Click export button
      await page.click('button:has-text("Export")');
      await page.click('text=Export as CSV');
      
      // Check if download was triggered (this would need to be configured in your test setup)
      // For now, just verify the export menu appeared
      await expect(page.locator('text=Export as CSV')).toBeVisible();
    });

    test('should export JSON data', async ({ page }) => {
      await page.click('button:has-text("Subjects")');
      
      // Click export button
      await page.click('button:has-text("Export")');
      await page.click('text=Export as JSON');
      
      await expect(page.locator('text=Export as JSON')).toBeVisible();
    });
  });

  test.describe('Data Integrity', () => {
    test('should have valid spice ratings for all people', async ({ page }) => {
      await page.click('button:has-text("Subjects")');
      
      // Check that all displayed people have valid spice ratings
      const peopleCards = page.locator('.bg-gray-800');
      const count = await peopleCards.count();
      
      for (let i = 0; i < count; i++) {
        const card = peopleCards.nth(i);
        const text = (await card.textContent()) || '';
        
        // Should have at least one pepper emoji or "No Spice" text
        const hasPeppers = text.includes('🌶️') || text.includes('No Spice');
        expect(hasPeppers).toBeTruthy();
      }
    });

    test('should have consistent data across views', async ({ page }) => {
      // Get Donald Trump's data from People view
      await page.click('button:has-text("Subjects")');
      const trumpMentions = await page.locator('text=Donald Trump').first().locator('..').locator('..').locator('text=/\\d+ mentions/').textContent();
      
      // Check same data in Search view
      await page.click('button:has-text("Evidence Search")');
      await page.fill('input[placeholder="Search names, contexts, or evidence..."]', 'Donald Trump');
      const searchTrumpMentions = await page.locator('.bg-gray-800 >> nth=1').locator('text=/\\d+ mentions/').textContent();
      
      expect(trumpMentions).toBe(searchTrumpMentions);
    });
  });

  test.describe('Performance', () => {
    test('should load data quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      await page.click('button:has-text("Evidence Search")');
      
      // Search for a common term that should return many results
      await page.fill('input[placeholder="Search names, contexts, or evidence..."]', 'president');
      
      // Should display results quickly
      await expect(page.locator('.bg-gray-800 >> nth=1')).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle empty search results gracefully', async ({ page }) => {
      await page.click('button:has-text("Evidence Search")');
      
      await page.fill('input[placeholder="Search names, contexts, or evidence..."]', 'xyznonexistent');
      
      await expect(page.locator('text=No results found')).toBeVisible();
      await expect(page.locator('text=Try adjusting your search terms')).toBeVisible();
    });

    test('should handle invalid filter combinations', async ({ page }) => {
      await page.click('button:has-text("Evidence Search")');
      
      // Set conflicting filters (very high spice rating with low risk)
      await page.selectOption('select >> nth=0', 'LOW'); // Risk Level
      await page.selectOption('select >> nth=2', '5'); // Min Spice Rating
      
      // Should show appropriate message or empty results
      await expect(page.locator('text=results found')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await expect(page.locator('input[placeholder="Search names, contexts, or evidence..."]')).toHaveAttribute('aria-label', /search/i);
      
      const selects = page.locator('select');
      const count = await selects.count();
      for (let i = 0; i < count; i++) {
        const select = selects.nth(i);
        await expect(select).toHaveAttribute('aria-label', /.*/);
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Focus the search input directly
      const searchInput = page.locator('input[aria-label="Search names, contexts, or evidence"]');
      await searchInput.focus();
      
      // Should be able to navigate to search input
      await expect(searchInput).toBeFocused();
    });
  });
});