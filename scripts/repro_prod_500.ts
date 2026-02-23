#!/usr/bin/env tsx
import crypto from 'crypto';

const baseUrlEnv = process.env.PROD_BASE_URL;

if (!baseUrlEnv) {
  console.error('PROD_BASE_URL is required');
  process.exit(1);
}

const endpoints = [
  '/api/investigations',
  '/api/documents?limit=100',
  '/api/subjects?page=1&limit=24',
  '/api/emails/threads?mailboxId=all&limit=40',
  '/api/entities/1',
];

type Result = {
  endpoint: string;
  status: number;
  durationMs: number;
  body?: string;
};

async function hitEndpoint(requestId: string, endpoint: string): Promise<Result> {
  const url = `${baseUrlEnv.replace(/\/$/, '')}${endpoint}`;
  const start = Date.now();
  const res = await fetch(url, {
    headers: {
      'X-Request-Id': requestId,
    },
  });
  const durationMs = Date.now() - start;
  let body: string | undefined;
  if (res.status >= 500 && res.status < 600) {
    body = await res.text();
  }
  console.log(
    JSON.stringify({
      endpoint,
      status: res.status,
      durationMs,
      isError: res.status >= 500,
    }),
  );
  return {
    endpoint,
    status: res.status,
    durationMs,
    body,
  };
}

async function main() {
  const requestId = crypto.randomUUID();
  console.log(`X-Request-Id=${requestId}`);

  const results: Result[] = [];
  for (const endpoint of endpoints) {
    const result = await hitEndpoint(requestId, endpoint);
    results.push(result);
  }

  const firstFail = results.find((r) => r.status >= 500 && r.status < 600);
  if (firstFail) {
    console.log('First failing endpoint:', firstFail.endpoint);
    if (firstFail.body) {
      console.log('First failing endpoint body:', firstFail.body);
    }
  } else {
    console.log('All endpoints returned non-5xx responses');
  }
}

main().catch((err) => {
  console.error('repro_prod_500 failed', err);
  process.exit(1);
});
