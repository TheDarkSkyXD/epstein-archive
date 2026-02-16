/**
 * Lightweight email API smoke test.
 * Usage:
 *   EMAIL_SMOKE_BASE_URL=http://localhost:8080/api pnpm tsx scripts/email_smoke.ts
 */

const baseUrl = (process.env.EMAIL_SMOKE_BASE_URL || 'http://localhost:8080/api').replace(
  /\/$/,
  '',
);

async function getJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error(`Request failed: ${path} -> ${response.status}`);
  }
  return (await response.json()) as T;
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

async function run(): Promise<void> {
  const mailboxes = await getJson<{ data: Array<{ mailboxId: string; totalThreads: number }> }>(
    '/emails/mailboxes',
  );
  assert(Array.isArray(mailboxes.data), 'mailboxes.data should be an array');
  assert(mailboxes.data.length > 0, 'Expected at least one mailbox');

  const mailboxId = mailboxes.data[0].mailboxId || 'all';

  const threads = await getJson<{
    data: Array<{ threadId: string; messageCount: number }>;
    meta: { total: number };
  }>(`/emails/threads?mailboxId=${encodeURIComponent(mailboxId)}&limit=10`);

  assert(Array.isArray(threads.data), 'threads.data should be an array');
  assert(threads.meta && typeof threads.meta.total === 'number', 'threads.meta.total missing');
  if (threads.data.length === 0) {
    console.log('Email smoke: no threads returned for mailbox, checks completed on empty dataset.');
    return;
  }

  const threadId = threads.data[0].threadId;
  assert(Boolean(threadId), 'threadId missing');

  const thread = await getJson<{
    threadId: string;
    messages: Array<{ messageId: string; snippet: string }>;
  }>(`/emails/threads/${encodeURIComponent(threadId)}`);

  assert(Array.isArray(thread.messages), 'thread.messages should be an array');
  assert(thread.messages.length > 0, 'Expected at least one message in thread');

  const messageId = thread.messages[0].messageId;
  const body = await getJson<{ cleanedText: string; parseStatus: string }>(
    `/emails/messages/${encodeURIComponent(messageId)}/body`,
  );
  assert(typeof body.cleanedText === 'string', 'body.cleanedText should be a string');
  assert(Boolean(body.parseStatus), 'body.parseStatus missing');

  console.log('Email smoke: PASS');
}

run().catch((error) => {
  console.error('Email smoke: FAIL');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
