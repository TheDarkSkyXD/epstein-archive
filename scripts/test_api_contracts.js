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

  // 3. Investigation case-folder and markdown briefing export
  const investigations = await get(`${base}/api/investigations?page=1&limit=1`);
  if (investigations.status !== 200) {
    console.error('❌ /api/investigations status', investigations.status);
    process.exit(1);
  }

  const invBody = investigations.body;
  const invList = Array.isArray(invBody?.data)
    ? invBody.data
    : Array.isArray(invBody)
      ? invBody
      : [];

  if (invList.length === 0) {
    console.error('❌ /api/investigations returned empty list', invBody);
    process.exit(1);
  }

  const investigationId = invList[0].id;
  console.log('✅ /api/investigations returned investigation id:', investigationId);

  const evidence = await get(
    `${base}/api/investigations/${encodeURIComponent(investigationId)}/evidence?limit=25&offset=0`,
  );
  if (evidence.status !== 200) {
    console.error(
      '❌ /api/investigations/:id/evidence status',
      evidence.status,
      'body:',
      evidence.body,
    );
    process.exit(1);
  }

  const evidenceBody = evidence.body;
  const evidenceItems = Array.isArray(evidenceBody)
    ? evidenceBody
    : Array.isArray(evidenceBody?.data)
      ? evidenceBody.data
      : [];

  if (evidenceItems.length === 0) {
    console.error('❌ /api/investigations/:id/evidence returned no items', evidenceBody);
    process.exit(1);
  }
  console.log('✅ /api/investigations/:id/evidence returns items:', evidenceItems.length);

  const byType = await get(
    `${base}/api/investigations/${encodeURIComponent(investigationId)}/evidence-by-type`,
  );
  if (byType.status !== 200) {
    console.error(
      '❌ /api/investigations/:id/evidence-by-type status',
      byType.status,
      'body:',
      byType.body,
    );
    process.exit(1);
  }
  console.log('✅ /api/investigations/:id/evidence-by-type OK');

  const briefingRes = await fetch(
    `${base}/api/investigations/${encodeURIComponent(investigationId)}/briefing`,
  );
  const briefingText = await briefingRes.text();
  if (!briefingRes.ok || !briefingText || briefingText.trim().length === 0) {
    console.error(
      '❌ /api/investigations/:id/briefing failed or empty',
      briefingRes.status,
      briefingText.slice(0, 200),
    );
    process.exit(1);
  }
  console.log(
    '✅ /api/investigations/:id/briefing returns markdown (length:',
    briefingText.length,
    ')',
  );

  console.log('✅ API contract tests passed');
}

main().catch((e) => {
  console.error('❌ API contract tests error', e);
  process.exit(1);
});
