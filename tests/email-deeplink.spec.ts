import { expect, test } from '@playwright/test';

test.describe('Email Deep Link Routing', () => {
  test('cold-load thread/message deep link reconstructs UI and URL syncs on thread change', async ({
    page,
    request,
  }) => {
    const threadResp = await request.get('/api/emails/threads?mailboxId=all&limit=2');
    test.skip(!threadResp.ok(), 'Email API unavailable for deep-link test');

    const threadJson = (await threadResp.json()) as {
      data: Array<{ threadId: string; subject: string }>;
    };

    test.skip(!threadJson.data?.length, 'No email threads available for deep-link test');

    const firstThread = threadJson.data[0];
    const secondThread = threadJson.data[1];

    const detailResp = await request.get(
      `/api/emails/threads/${encodeURIComponent(firstThread.threadId)}`,
    );
    test.skip(!detailResp.ok(), 'Thread details unavailable for deep-link test');

    const detailJson = (await detailResp.json()) as {
      messages: Array<{ messageId: string }>;
    };

    test.skip(!detailJson.messages?.length, 'No messages in selected thread for deep-link test');

    const firstMessageId = detailJson.messages[0].messageId;

    await page.goto(
      `/emails?mailboxId=all&threadId=${encodeURIComponent(firstThread.threadId)}&messageId=${encodeURIComponent(firstMessageId)}`,
    );

    await expect(page).toHaveURL(
      new RegExp(`threadId=${encodeURIComponent(firstThread.threadId)}`),
    );
    await expect(page.locator('[data-testid="email-thread-row"]').first()).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator(`[data-message-id="${firstMessageId}"]`)).toBeVisible({
      timeout: 30000,
    });

    const deepLinkedThreadRow = page.locator(`[data-thread-id="${firstThread.threadId}"]`);
    if (await deepLinkedThreadRow.count()) {
      await expect(deepLinkedThreadRow).toBeVisible();
    }

    if (secondThread?.threadId) {
      const secondRow = page.locator(
        `[data-testid="email-thread-row"][data-thread-id="${secondThread.threadId}"]`,
      );
      if ((await secondRow.count()) > 0) {
        await secondRow.click();
        await expect(page).toHaveURL(
          new RegExp(`threadId=${encodeURIComponent(secondThread.threadId)}`),
        );
      }
    }
  });
});
