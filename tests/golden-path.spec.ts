import { test, expect } from '@playwright/test';

test.describe('Golden Path A: People → Entity → Documents → DocumentModal', () => {
  test('opens entity, shows documents, opens document modal', async ({ page }) => {
    await page.goto('/people');
    await page.waitForSelector('[data-testid="people-page"]', { timeout: 15000 });

    await page.click('[data-testid="subject-card"]');
    await page.waitForSelector('[data-testid="evidence-modal"]', { timeout: 10000 });

    await page.click('button:has-text("Documents")');
    await page.waitForSelector('[data-testid="evidence-documents-tab"]');

    const firstDocRow = page
      .locator('[data-testid="evidence-documents-tab"] [data-testid="evidence-document-row"]')
      .first();
    await expect(firstDocRow).toBeVisible();

    await firstDocRow.click();

    const modal = page.locator('[data-testid="document-modal"]');
    await expect(modal).toBeVisible();
  });
});

test.describe('Golden Path B: DocumentModal tab and scroll behavior', () => {
  test('refined/raw/pdf toggles and scroll containment behave correctly', async ({ page }) => {
    await page.goto('/documents');

    const firstDocumentCard = page.locator('[data-testid="document-card"]').first();
    await expect(firstDocumentCard).toBeVisible();
    await firstDocumentCard.click();

    const modal = page.locator('[data-testid="document-modal"]');
    await expect(modal).toBeVisible();

    const summaryTab = page.getByRole('tab', { name: 'Summary' });
    const cleanTab = page.getByRole('tab', { name: 'Clean Text' });
    const ocrTab = page.getByRole('tab', { name: 'Raw OCR' });

    await summaryTab.click();
    await expect(summaryTab).toHaveAttribute('data-state', 'active');

    await cleanTab.click();
    await expect(cleanTab).toHaveAttribute('data-state', 'active');

    await ocrTab.click();
    await expect(ocrTab).toHaveAttribute('data-state', 'active');

    const modalBody = page.locator('[data-testid="document-modal-body"]');
    await expect(modalBody).toBeVisible();

    const bodyOverflow = await page.evaluate(
      () => window.getComputedStyle(document.body).overflowY,
    );
    expect(bodyOverflow === 'hidden' || bodyOverflow === 'clip').toBeTruthy();

    const scrollContainers = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('div'));
      return elements.filter((el) => {
        const style = window.getComputedStyle(el);
        return (
          style.overflowY === 'auto' ||
          style.overflowY === 'scroll' ||
          style.overflowY === 'overlay'
        );
      }).length;
    });

    expect(scrollContainers).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Golden Path C: EmailClient threads, search, and add to investigation', () => {
  test('loads threads, opens a thread, searches, and adds to investigation', async ({ page }) => {
    await page.goto('/email');

    const threadList = page.locator('[data-testid="email-thread-row"]').first();
    await expect(threadList).toBeVisible();

    await threadList.click();

    const messageBody = page.locator('[data-testid="email-message-body"]').first();
    await expect(messageBody).toBeVisible();

    const bodyText = await messageBody.innerText();
    expect(bodyText).not.toMatch(/=0A|=3D|multipart\/alternative/i);

    const searchInput = page.locator('[data-testid="email-search-input"]');
    await searchInput.fill('test');
    await page.waitForTimeout(500);

    const addToInvestigationButton = page
      .locator('[data-testid="email-thread-actions"]')
      .locator('button:has-text("Add to Investigation")')
      .first();
    await expect(addToInvestigationButton).toBeVisible();

    await addToInvestigationButton.click();

    const toast = page.locator('[role="status"]').first();
    await expect(toast).toBeVisible();
  });
});
