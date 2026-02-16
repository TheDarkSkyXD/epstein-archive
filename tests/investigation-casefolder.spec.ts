import { test, expect } from '@playwright/test';

test.describe('Investigation Case Folder', () => {
  test('clicking evidence opens a viewer modal', async ({ page }) => {
    await page.goto('/investigations');

    const firstCase = page.locator('h3.text-xl.font-medium.text-white').first();

    if (!(await firstCase.isVisible())) {
      test.skip(true, 'No investigation cards available in this dataset');
      return;
    }

    await firstCase.click();
    await page.getByRole('button', { name: 'Case Folder' }).first().click();

    const openEvidenceButton = page.getByRole('button', { name: 'Open evidence' }).first();
    if (!(await openEvidenceButton.isVisible())) {
      test.skip(true, 'No evidence rows available in case folder');
      return;
    }

    await openEvidenceButton.click();

    await expect(page.locator('#DocumentModal, [role="dialog"][aria-modal="true"]')).toBeVisible({
      timeout: 8000,
    });
  });
});
