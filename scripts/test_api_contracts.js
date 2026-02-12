async function get(url) {
  const res = await fetch(url);
  const status = res.status;
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status, body };
}

async function main() {
  const base = process.env.TEST_BASE_URL || 'http://localhost:3012';

  const subjects = await get(`${base}/api/subjects?page=1&limit=24`);
  if (subjects.status !== 200) {
    console.error('❌ /api/subjects status', subjects.status);
    process.exit(1);
  }
  if (!Array.isArray(subjects.body.subjects) || subjects.body.subjects.length === 0) {
    console.error('❌ /api/subjects returned empty or wrong key', subjects.body);
    process.exit(1);
  }
  if (typeof subjects.body.total !== 'number') {
    console.error('❌ /api/subjects missing total', subjects.body);
    process.exit(1);
  }
  console.log('✅ /api/subjects returns items:', subjects.body.subjects.length);

  const documents = await get(`${base}/api/documents?page=1&limit=50&sortBy=red_flag`);
  if (documents.status !== 200) {
    console.error('❌ /api/documents status', documents.status);
    process.exit(1);
  }
  if (!Array.isArray(documents.body.data) || documents.body.data.length === 0) {
    console.error('❌ /api/documents returned empty or wrong key', documents.body);
    process.exit(1);
  }
  if (typeof documents.body.total !== 'number') {
    console.error('❌ /api/documents missing total', documents.body);
    process.exit(1);
  }
  console.log('✅ /api/documents returns items:', documents.body.data.length);

  console.log('✅ API contract tests passed');
}

main().catch((e) => {
  console.error('❌ API contract tests error', e);
  process.exit(1);
});
