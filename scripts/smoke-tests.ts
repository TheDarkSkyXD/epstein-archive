import assert from 'node:assert';

// BASE_URL reserved for future UI smoke tests
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:5173';
const API_BASE = process.env.SMOKE_API_BASE_URL || 'http://localhost:3000';

async function checkJson(path: string) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request to ${url} failed with ${res.status}`);
  }
  return res.json();
}

async function main() {
  console.log('Running API smoke tests...');

  // Health & readiness
  const health = await checkJson('/api/health');
  assert.ok(health.status === 'healthy' || health.status === 'degraded');

  const ready = await checkJson('/api/ready');
  assert.equal(ready.status, 'ready');

  // Core APIs
  const docs = await checkJson('/api/documents?page=1&limit=1');
  assert.ok(Array.isArray(docs.data) || Array.isArray(docs.documents) || Array.isArray(docs));

  const entities = await checkJson('/api/entities?page=1&limit=1');
  assert.ok(entities && typeof entities === 'object');

  const audio = await checkJson('/api/media/audio?page=1&limit=1');
  assert.ok(Array.isArray(audio.mediaItems) || Array.isArray(audio.data) || Array.isArray(audio));

  const analytics = await checkJson('/api/analytics/enhanced');
  assert.ok(analytics !== null && typeof analytics === 'object');

  console.log('All smoke tests passed.');
}

main().catch((err) => {
  console.error('Smoke tests FAILED');
  console.error(err);
  process.exit(1);
});
