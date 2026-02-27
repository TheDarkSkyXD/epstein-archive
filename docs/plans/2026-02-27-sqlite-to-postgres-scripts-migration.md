# SQLite to PostgreSQL scripts migration implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace every broken getDb() / getIngestDb() call in scripts with the correct pg.Pool API so all scripts run against PostgreSQL.

**Architecture:** Direct pool.query(sql, paramsArray) replacement throughout. No new abstractions. Module-level `let db: any` variables become pg.Pool references. Synchronous SQLite patterns (.prepare().run(), .transaction()) become await pool.query() and BEGIN/COMMIT client checkouts.

**Tech Stack:** Node.js/tsx, pg (node-postgres), TypeScript. All scripts in scripts/ directory.

---

## Translation reference (read before each task)

```
getDb() / getIngestDb()           ->  getIngestPool()   (pipeline scripts)
                                  ->  getMaintenancePool()  (maintenance/backfill)
                                  ->  getApiPool()          (read-only analysis)

db.run(sql, [p1, p2])            ->  await pool.query(sql, [p1, p2])
db.get(sql, [p1])                ->  (await pool.query(sql, [p1])).rows[0] ?? null
db.all(sql, [p1])                ->  (await pool.query(sql, [p1])).rows
db.prepare(s).run([p1])          ->  await pool.query(s, [p1])
db.prepare(s).get([p1])          ->  (await pool.query(s, [p1])).rows[0] ?? null
db.prepare(s).all([p1])          ->  (await pool.query(s, [p1])).rows
db.transaction(fn)()             ->  BEGIN/COMMIT with pool.connect() (see Task 13)
db.close()                       ->  remove (pool manages connections)
result.changes                   ->  result.rowCount
? placeholder                    ->  $1, $2, $3 ...
has_redactions = 1               ->  has_redactions = true
is_boilerplate = 1               ->  is_boilerplate = true
datetime('now')                  ->  NOW()
PRAGMA ANALYZE                   ->  ANALYZE
SQLITE_BUSY error code           ->  remove (pg uses different retry semantics)
```

Transaction template for Group C scripts:

```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... async operations using client.query() ...
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

---

## Task 1: Fix run_migrations.ts

**Files:**

- Modify: scripts/run_migrations.ts

**Step 1: Replace file content**

```typescript
import { runMigrations } from '../src/server/db/migrator.js';

console.log('Running migrations...');
try {
  await runMigrations();
  console.log('Migrations complete.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
```

**Step 2: Verify no import errors**

Run: `cd epstein-archive && npx tsx --no-warnings scripts/run_migrations.ts 2>&1 | head -5`
Expected: no "getDb is not exported" error.

**Step 3: Commit**

```bash
git add scripts/run_migrations.ts
git commit -m "fix: remove broken getDb import from run_migrations.ts"
```

---

## Task 2: Fix watermark_fakes.ts and backfill_thumbnails.ts

**Files:**

- Modify: scripts/watermark_fakes.ts
- Modify: scripts/backfill_thumbnails.ts

**Step 1: Remove unused getDb import from watermark_fakes.ts**

Delete the line: `import { getDb } from '../src/server/db/connection.js';`

**Step 2: Remove unused getDb import from backfill_thumbnails.ts**

Delete the line: `import { getDb } from '../src/server/db/connection.js';`

**Step 3: Verify**

Run: `cd epstein-archive && npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "watermark|backfill_thumb"`
Expected: no errors on these files.

**Step 4: Commit**

```bash
git add scripts/watermark_fakes.ts scripts/backfill_thumbnails.ts
git commit -m "fix: remove unused getDb imports from watermark and thumbnail scripts"
```

---

## Task 3: Fix scripts/debug/check_top_entities.ts

**Files:**

- Modify: scripts/debug/check_top_entities.ts

**Step 1: Replace file**

```typescript
import { getApiPool } from '../../src/server/db/connection.js';
import 'dotenv/config';

async function main() {
  const pool = getApiPool();
  console.log('Checking top 20 entities by mentions...');

  const result = await pool.query(`
    SELECT
        id,
        full_name,
        mentions,
        (SELECT COUNT(*) FROM entity_mentions WHERE entity_id = entities.id) as mention_count,
        (SELECT COUNT(*) FROM media_item_people WHERE entity_id = entities.id) as media_count,
        (SELECT COUNT(*) FROM entity_evidence_types WHERE entity_id = entities.id) as evidence_type_count
    FROM entities
    ORDER BY mentions DESC
    LIMIT 20
  `);

  console.table(result.rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add scripts/debug/check_top_entities.ts
git commit -m "fix: migrate check_top_entities debug script to Postgres pool"
```

---

## Task 4: Fix analyze_evidence_gap.ts

**Files:**

- Modify: scripts/analyze_evidence_gap.ts

Note: junkPatterns is spread into positional ? params; convert to $N array.

**Step 1: Replace file**

```typescript
import { getApiPool } from '../src/server/db/connection.js';
import 'dotenv/config';

const junkPatterns = [
  '%House%',
  '%Office%',
  '%Street%',
  '%Road%',
  '%Avenue%',
  '%Park%',
  '%Beach%',
  '%Islands%',
  '%Times%',
  '%Post%',
  '%News%',
  '%Press%',
  '%Journal%',
  '%Magazine%',
  '%Inc%',
  '%LLC%',
  '%Corp%',
  '%Ltd%',
  '%Group%',
  '%Trust%',
  '%Foundation%',
  '%University%',
  '%College%',
  '%School%',
  '%Academy%',
  '%Judge%',
  '%Court%',
  '%Attorney%',
  '%Justice%',
  '%Department%',
  '%Bureau%',
  '%Agency%',
  '%Police%',
  '%Sheriff%',
  '%FBI%',
  '%CIA%',
  '%Secret Service%',
  '%Bank%',
  '%Checking%',
  '%Savings%',
  '%Additions%',
  '%Subtractions%',
];

async function main() {
  const pool = getApiPool();
  console.log('Analyzing Top 100 *People* Evidence Coverage...');

  const junkConditions = junkPatterns.map((_, i) => `full_name NOT LIKE $${i + 1}`).join(' AND ');

  const unknownParam = `$${junkPatterns.length + 1}`;

  const sql = `
    SELECT
        id, full_name, mentions,
        (SELECT COUNT(*) FROM entity_mentions WHERE entity_id = entities.id) as mention_count,
        (SELECT COUNT(*) FROM media_item_people WHERE entity_id = entities.id) as photo_count
    FROM entities
    WHERE ${junkConditions}
    AND full_name NOT LIKE ${unknownParam}
    ORDER BY mentions DESC
    LIMIT 100
  `;

  const result = await pool.query(sql, [...junkPatterns, '%unknown%']);
  const topPeople = result.rows;

  console.log(`\nFound ${topPeople.length} Top People.`);
  const needsFix = topPeople.filter((p: any) => p.photo_count === 0);

  console.table(
    topPeople.slice(0, 20).map((p: any) => ({
      id: p.id,
      name: p.full_name.substring(0, 20),
      mentions: p.mentions,
      photos: p.photo_count,
      NEEDS_FIX: p.photo_count === 0 ? 'YES' : '',
    })),
  );

  console.log(`\nEntities with NO Photos: ${needsFix.length} / ${topPeople.length}`);
  if (needsFix.length > 0) {
    console.log('Top 10 needing photos:');
    console.log(
      needsFix
        .slice(0, 10)
        .map((p: any) => p.full_name)
        .join(', '),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add scripts/analyze_evidence_gap.ts
git commit -m "fix: migrate analyze_evidence_gap to Postgres pool"
```

---

## Task 5: Fix export_training_data.ts

**Files:**

- Modify: scripts/export_training_data.ts

**Step 1: Replace file**

```typescript
import { getApiPool } from '../src/server/db/connection.js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const EXPORT_DIR = 'data/training_exports';
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

async function exportTrainingData() {
  const pool = getApiPool();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  console.log('Exporting Active Learning Training Data...');

  const mentionsResult = await pool.query(`
    SELECT m.mention_context, m.span_text as entity_text,
      e.full_name as linked_entity, e.entity_type, m.verified, m.rejection_reason
    FROM entity_mentions m
    JOIN entities e ON m.entity_id = e.id
    WHERE m.verified != 0
  `);
  if (mentionsResult.rows.length > 0) {
    const filename = path.join(EXPORT_DIR, `mentions_feedback_${timestamp}.jsonl`);
    const stream = fs.createWriteStream(filename);
    mentionsResult.rows.forEach((row) => {
      stream.write(JSON.stringify(row) + '\n');
    });
    stream.end();
    console.log(`Exported ${mentionsResult.rows.length} mention feedback records to ${filename}`);
  } else {
    console.log('No verified mention data found.');
  }

  const claimsResult = await pool.query(`
    SELECT c.subject_entity_id, es.full_name as subject, c.predicate, c.object_text,
      c.modality, ds.sentence_text, c.verified, c.rejection_reason
    FROM claim_triples c
    JOIN entities es ON c.subject_entity_id = es.id
    LEFT JOIN document_sentences ds ON c.sentence_id = ds.id
    WHERE c.verified != 0
  `);
  if (claimsResult.rows.length > 0) {
    const filename = path.join(EXPORT_DIR, `claims_feedback_${timestamp}.jsonl`);
    const stream = fs.createWriteStream(filename);
    claimsResult.rows.forEach((row) => {
      stream.write(JSON.stringify(row) + '\n');
    });
    stream.end();
    console.log(`Exported ${claimsResult.rows.length} claim feedback records to ${filename}`);
  } else {
    console.log('No verified claim data found.');
  }

  const boilerplateResult = await pool.query(`
    SELECT bp.sentence_text_sample, bp.frequency, bp.status
    FROM boilerplate_phrases bp
    WHERE bp.status = 'candidate'
    ORDER BY bp.frequency DESC
    LIMIT 1000
  `);
  if (boilerplateResult.rows.length > 0) {
    const filename = path.join(EXPORT_DIR, `boilerplate_candidates_${timestamp}.csv`);
    const stream = fs.createWriteStream(filename);
    stream.write('text,frequency,status\n');
    boilerplateResult.rows.forEach((row: any) => {
      const safeText = `"${row.sentence_text_sample.replace(/"/g, '""')}"`;
      stream.write(`${safeText},${row.frequency},${row.status}\n`);
    });
    stream.end();
    console.log(`Exported ${boilerplateResult.rows.length} boilerplate candidates to ${filename}`);
  } else {
    console.log('No boilerplate candidates found.');
  }
}

exportTrainingData().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add scripts/export_training_data.ts
git commit -m "fix: migrate export_training_data to Postgres pool"
```

---

## Task 6: Fix seed_map_locations.ts

**Files:**

- Modify: scripts/seed_map_locations.ts

Note: result.rowCount replaces info.changes.

**Step 1: Replace file**

```typescript
import { getMaintenancePool } from '../src/server/db/connection.js';
import 'dotenv/config';

const LOCATIONS = [
  { name: 'Little St James', lat: 18.3003, lng: -64.8255, label: 'Little St James, USVI' },
  { name: 'Great St James', lat: 18.308, lng: -64.827, label: 'Great St James, USVI' },
  { name: 'Palm Beach', lat: 26.7153, lng: -80.0534, label: 'Palm Beach, FL' },
  { name: 'New York Mansion', lat: 40.7741, lng: -73.9656, label: '9 E 71st St, New York, NY' },
  { name: 'Paris Apartment', lat: 48.868, lng: 2.29, label: 'Avenue Foch, Paris' },
  { name: 'Zorro Ranch', lat: 35.343, lng: -106.027, label: 'Zorro Ranch, NM' },
];

const hubs = [
  { baseLat: 18.3003, baseLng: -64.8255 },
  { baseLat: 40.7128, baseLng: -74.006 },
  { baseLat: 48.8566, baseLng: 2.3522 },
];

async function main() {
  const pool = getMaintenancePool();
  console.log('Seeding location data...');

  for (const loc of LOCATIONS) {
    const result = await pool.query(
      'UPDATE entities SET location_lat = $1, location_lng = $2, location_label = $3 WHERE full_name LIKE $4 OR title LIKE $5',
      [loc.lat, loc.lng, loc.label, `%${loc.name}%`, `%${loc.name}%`],
    );
    console.log(`Updated ${loc.name}: ${result.rowCount} changes`);
  }

  const topEntitiesResult = await pool.query(
    'SELECT id, full_name as name FROM entities WHERE location_lat IS NULL ORDER BY mentions DESC LIMIT 20',
  );

  for (const entity of topEntitiesResult.rows as any[]) {
    const hub = hubs[Math.floor(Math.random() * hubs.length)];
    const lat = hub.baseLat + (Math.random() - 0.5) * 0.1;
    const lng = hub.baseLng + (Math.random() - 0.5) * 0.1;
    await pool.query(
      'UPDATE entities SET location_lat = $1, location_lng = $2, location_label = $3 WHERE id = $4',
      [lat, lng, 'Estimated Location', entity.id],
    );
    console.log(`Assigned random location to ${entity.name}`);
  }

  console.log('Seeding complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add scripts/seed_map_locations.ts
git commit -m "fix: migrate seed_map_locations to Postgres pool"
```

---

## Task 7: Fix promote_boilerplate.ts

**Files:**

- Modify: scripts/promote_boilerplate.ts

Note: result.rowCount replaces result.changes. Must become async.

**Step 1: Replace file**

```typescript
import { getMaintenancePool } from '../src/server/db/connection.js';
import 'dotenv/config';

const BOILERPLATE_CANDIDATE_THRESHOLD = 10;
const BOILERPLATE_CONFIRMED_THRESHOLD = 100;

async function promoteBoilerplate() {
  const pool = getMaintenancePool();
  console.log('Starting Boilerplate Promotion Job...');

  const candidateResult = await pool.query(
    `UPDATE boilerplate_phrases SET status = 'candidate' WHERE status = 'pending' AND frequency > $1`,
    [BOILERPLATE_CANDIDATE_THRESHOLD],
  );
  if (candidateResult.rowCount && candidateResult.rowCount > 0) {
    console.log(`Promoted ${candidateResult.rowCount} phrases to 'candidate'`);
  }

  const confirmedResult = await pool.query(
    `UPDATE boilerplate_phrases SET status = 'confirmed'
     WHERE (status = 'pending' OR status = 'candidate') AND frequency > $1`,
    [BOILERPLATE_CONFIRMED_THRESHOLD],
  );
  if (confirmedResult.rowCount && confirmedResult.rowCount > 0) {
    console.log(`Promoted ${confirmedResult.rowCount} phrases to 'confirmed'`);
  }

  console.log(
    'Note: Existing document_sentences is_boilerplate flags are not automatically updated.',
  );
  console.log('Boilerplate Promotion Complete.');
}

promoteBoilerplate().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add scripts/promote_boilerplate.ts
git commit -m "fix: migrate promote_boilerplate to Postgres pool"
```

---

## Task 8: Fix repair_invalid_spans.ts

**Files:**

- Modify: scripts/repair_invalid_spans.ts

**Step 1: Replace file**

```typescript
import { getMaintenancePool } from '../src/server/db/connection.js';
import 'dotenv/config';

async function main() {
  const pool = getMaintenancePool();
  console.log('Repairing invalid document_spans offsets...\n');

  const spansResult = await pool.query(
    'SELECT id, start_offset, end_offset, document_id FROM document_spans',
  );
  const spans = spansResult.rows;

  let legacySpans = 0;
  let repaired = 0;

  for (const span of spans) {
    if (span.start_offset === 0 && span.end_offset === 0) {
      legacySpans++;
      continue;
    }

    const docResult = await pool.query(
      'SELECT content, content_refined FROM documents WHERE id = $1',
      [span.document_id],
    );
    const doc = docResult.rows[0] as
      | { content: string | null; content_refined: string | null }
      | undefined;

    const text =
      (doc?.content_refined && doc.content_refined.length > 0
        ? doc.content_refined
        : doc?.content && doc.content.length > 0
          ? doc.content
          : null) || null;

    let invalid = false;
    let reason = '';

    if (span.start_offset < 0 || span.end_offset <= span.start_offset) {
      invalid = true;
      reason = 'negative_or_non_increasing';
    } else if (text && span.end_offset > text.length) {
      invalid = true;
      reason = 'beyond_text_length';
    }

    if (invalid) {
      console.log(
        `  - fixing ${span.id} (doc=${span.document_id}, start=${span.start_offset}, end=${span.end_offset}, reason=${reason})`,
      );
      await pool.query('UPDATE document_spans SET start_offset = 0, end_offset = 0 WHERE id = $1', [
        span.id,
      ]);
      repaired++;
    }
  }

  console.log(
    `\nCompleted span offset repair. Legacy spans: ${legacySpans}, repaired spans: ${repaired}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add scripts/repair_invalid_spans.ts
git commit -m "fix: migrate repair_invalid_spans to Postgres pool"
```

---

## Task 9: Fix unified_pipeline.ts

**Files:**

- Modify: scripts/unified_pipeline.ts

This script already uses await db.get() / await db.run() / await db.all() (async pattern). Changes needed:

1. Replace import { getDb } with import { getIngestPool }
2. Replace const db = getDb() with const pool = getIngestPool()
3. Replace await db.get(sql) with (await pool.query(sql)).rows[0]
4. Replace await db.get(sql, params) with (await pool.query(sql, params)).rows[0]
5. Replace await db.all(sql, params) with (await pool.query(sql, params)).rows
6. Replace await db.run(sql, params) with await pool.query(sql, params)
7. Change ? to $1, $2 ... in all SQL strings

**Step 1: Update line 10 import**

```typescript
// Before:
import { getDb } from '../src/server/db/connection.js';
// After:
import { getIngestPool } from '../src/server/db/connection.js';
import 'dotenv/config';
```

**Step 2: Update runIntelPhase() function**

```typescript
async function runIntelPhase(): Promise<{ entitiesExtracted: number; relationsFound: number }> {
  const pool = getIngestPool();

  const entitiesBefore = ((await pool.query('SELECT COUNT(*) as c FROM entities')).rows[0] as any)
    .c;
  const relationsBefore = (
    (await pool.query('SELECT COUNT(*) as c FROM entity_relationships')).rows[0] as any
  ).c;

  const exitCode = await runScript('scripts/ingest_intelligence.ts');

  const entitiesAfter = ((await pool.query('SELECT COUNT(*) as c FROM entities')).rows[0] as any).c;
  const relationsAfter = (
    (await pool.query('SELECT COUNT(*) as c FROM entity_relationships')).rows[0] as any
  ).c;

  return {
    entitiesExtracted: entitiesAfter - entitiesBefore,
    relationsFound: relationsAfter - relationsBefore,
  };
}
```

**Step 3: Update runEnrichPhase() function**

Replace const db = getDb() with const pool = getIngestPool() and update all calls:

- db.get(sql) -> (await pool.query(sql)).rows[0]
- db.all(sql, [BATCH_SIZE, offset]) -> (await pool.query(sql, [BATCH_SIZE, offset])).rows
- db.run(sql, [args]) -> await pool.query(sql, [args])
- Change LIMIT ? OFFSET ? -> LIMIT $1 OFFSET $2
- Change UPDATE documents SET metadata_json = ?, content_refined = ? WHERE id = ? -> $1, $2, $3

**Step 4: Verify type-check**

Run: `cd epstein-archive && npx tsc --noEmit --skipLibCheck 2>&1 | grep unified_pipeline`
Expected: no errors.

**Step 5: Commit**

```bash
git add scripts/unified_pipeline.ts
git commit -m "fix: migrate unified_pipeline to Postgres pool"
```

---

## Task 10: Fix run_queue_single_node.ts

**Files:**

- Modify: scripts/run_queue_single_node.ts

**Step 1: Update import**

```typescript
import { getIngestPool } from '../src/server/db/connection.js';
import 'dotenv/config';
```

**Step 2: Update runQueue() function — replace all db calls with pool.query()**

In the function body:

```typescript
async function runQueue() {
  const pool = getIngestPool();
  // ...

  const initialQueued = (
    (await pool.query("SELECT COUNT(*) AS c FROM documents WHERE processing_status = 'queued'")).rows[0] as { c: number }
  ).c;

  const initialProcessing = (
    (await pool.query("SELECT COUNT(*) AS c FROM documents WHERE processing_status = 'processing'")).rows[0] as { c: number }
  ).c;
```

Inside the job processing callback:

```typescript
const row = (await pool.query('SELECT content FROM documents WHERE id = $1', [docId])).rows[0] as
  | { content?: string }
  | undefined;
// ...
if (refined && refined !== content) {
  await pool.query(
    'UPDATE documents SET content = $1, content_refined = $2, last_processed_at = NOW() WHERE id = $3',
    [refined, refined, docId],
  );
}
```

Progress stats and final count queries:

```typescript
const remaining = (
  (await pool.query("SELECT COUNT(*) AS c FROM documents WHERE processing_status = 'queued'"))
    .rows[0] as { c: number }
).c;
// ...
const queuedLeft = (
  (await pool.query("SELECT COUNT(*) AS c FROM documents WHERE processing_status = 'queued'"))
    .rows[0] as { c: number }
).c;
```

**Step 3: Verify**

Run: `cd epstein-archive && npx tsc --noEmit --skipLibCheck 2>&1 | grep run_queue_single_node`

**Step 4: Commit**

```bash
git add scripts/run_queue_single_node.ts
git commit -m "fix: migrate run_queue_single_node to Postgres pool"
```

---

## Task 11: Fix ingest_intelligence.ts — critical pipeline script

**Files:**

- Modify: scripts/ingest_intelligence.ts

This script already uses async await db.run(), await db.get() patterns but the db variable comes from the deleted getDb(). The prepared statement variables (insertSpan, insertMentionRow, insertRelation) need to become plain SQL strings.

**Step 1: Update line 7 import**

```typescript
import { getIngestPool } from '../src/server/db/connection.js';
import 'dotenv/config';
```

**Step 2: Remove prepared statement variables (lines 13-15)**

Delete:

```typescript
let insertSpan: any;
let insertMentionRow: any;
let insertRelation: any;
```

**Step 3: Update extractCredentials() — change db.run() to db.query(), ? to $1**

```typescript
async function extractCredentials(doc: any, content: string) {
  for (const pattern of CREDENTIAL_PATTERNS) {
    const regex = new RegExp(pattern.regex, 'gi');
    const matches = [...content.matchAll(regex)];
    for (const match of matches) {
      if (match[1]) {
        await db.query(
          `INSERT INTO black_book_entries (entry_text, notes, document_id, entry_category, created_at)
           VALUES ($1, $2, $3, 'credential', CURRENT_TIMESTAMP)`,
          [
            `star ${pattern.type}: ${match[1]}`,
            `[CREDENTIAL] Extracted from document ${doc.id} (${doc.file_name})`,
            doc.id,
          ],
        );
      }
    }
  }
}
```

**Step 4: Update harvestContacts() — change db.get() and db.run() calls**

```typescript
const existing = (
  await db.query(
    'SELECT id FROM black_book_entries WHERE document_id = $1 AND entry_text LIKE $2',
    [doc.id, `%${email}%`],
  )
).rows[0];

if (!existing) {
  await db.query(
    `INSERT INTO black_book_entries (person_id, entry_text, notes, document_id, entry_category, created_at)
     VALUES ($1, $2, $3, $4, 'contact', CURRENT_TIMESTAMP)`,
    [
      entity.entityId || null,
      `star ${entity.name} (Contact): ${email}`,
      `[HARVESTED] Found near name in document ${doc.id}`,
      doc.id,
    ],
  );
}
// Repeat same pattern for phone matches
```

**Step 5: Update runIntelligencePipeline() — initialization**

```typescript
export async function runIntelligencePipeline() {
  db = getIngestPool();  // was: getDb()
```

**Step 6: Update ingest_runs INSERT (line ~170) — ? to $N**

```typescript
await db.query(
  `INSERT INTO ingest_runs (id, status, git_commit, pipeline_version, agentic_enabled)
   VALUES ($1, 'running', $2, '2.0.0-pg', 0)`,
  [ingestRunId, gitCommit],
);
```

**Step 7: Replace resolver run INSERT with RETURNING (lines ~177-182)**

```typescript
const res = (
  await db.query(
    'INSERT INTO resolver_runs (resolver_name, resolver_version) VALUES ($1, $2) RETURNING id',
    ['UltimateIngestionPipeline', '2.0.0-pg'],
  )
).rows[0];
const currentResolverRunTableId = res.id;
```

**Step 8: Replace db.prepare() prepared statement blocks with SQL strings (lines ~185-199)**

Remove await db.prepare() calls and replace with plain SQL strings used inline:

```typescript
const insertEntitySql = `
  INSERT INTO entities (name, type, risk_level, evidence_count, first_seen_at)
  VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP)
  ON CONFLICT (name, type) DO NOTHING
  RETURNING id
`;

const insertMentionSql = `
  INSERT INTO entity_mentions (entity_id, document_id, mention_text, context_window, confidence, pipeline_run_id)
  VALUES ($1, $2, $3, $4, $5, $6)
`;

const updateEvidenceSql = `UPDATE entities SET evidence_count = evidence_count + 1 WHERE id = $1`;
```

**Step 9: Replace docs fetch (line ~202)**

```typescript
const docs = (
  await db.query(`
  SELECT id, content, file_name, metadata_json
  FROM documents
  WHERE content IS NOT NULL
    AND (processing_status = 'succeeded' OR processing_status = 'completed')
  ORDER BY id ASC
`)
).rows;
```

**Step 10: Update entity loop (lines ~234-268)**

```typescript
const existing = (
  await db.query('SELECT id FROM entities WHERE name = $1 AND type = $2', [
    finalEnt.name,
    finalEnt.type,
  ])
).rows[0];

if (existing) {
  entityId = existing.id;
  await db.query(updateEvidenceSql, [entityId]);
} else {
  const result = (await db.query(insertEntitySql, [finalEnt.name, finalEnt.type, 'low'])).rows[0];
  if (result) {
    entityId = result.id;
  } else {
    const refetch = (
      await db.query('SELECT id FROM entities WHERE name = $1 AND type = $2', [
        finalEnt.name,
        finalEnt.type,
      ])
    ).rows[0];
    entityId = refetch.id;
  }
}

await db.query(insertMentionSql, [
  entityId,
  doc.id,
  finalEnt.name,
  content.substring(Math.max(0, ent.offset - 50), ent.offset + 100),
  0.9,
  ingestRunId,
]);
```

**Step 11: Update final status updates (lines ~275-286) — ? to $N**

```typescript
await db.query(
  "UPDATE ingest_runs SET status = 'completed', finished_at = CURRENT_TIMESTAMP WHERE id = $1",
  [ingestRunId],
);
// error handler:
await db.query("UPDATE ingest_runs SET status = 'failed', error_message = $1 WHERE id = $2", [
  (error as Error).message,
  ingestRunId,
]);
```

**Step 12: Verify**

Run: `cd epstein-archive && npx tsc --noEmit --skipLibCheck 2>&1 | grep ingest_intelligence`
Expected: no errors.

**Step 13: Commit**

```bash
git add scripts/ingest_intelligence.ts
git commit -m "fix: migrate ingest_intelligence to Postgres pool — critical pipeline script"
```

---

## Task 12: Fix ingest_pipeline.ts — the backbone (1747 lines)

**Files:**

- Modify: scripts/ingest_pipeline.ts

Most of this file already uses async await db.get() / run() / all() patterns. The problems are:

1. Import getDb and getIngestDb no longer exist
2. storeRedactions() (lines ~661-765) still uses synchronous .prepare().run()
3. db.close() call (line ~1594)
4. processQueue() uses const dbSync = getIngestDb() separately

**Step 1: Update import (line 40)**

```typescript
// Before:
import { getDb, getIngestDb } from '../src/server/db/connection.js';
// After:
import { getIngestPool } from '../src/server/db/connection.js';
import 'dotenv/config';
```

**Step 2: Update initDb() (lines ~209-212)**

```typescript
async function initDb() {
  db = getIngestPool();
  console.log('Database gateway initialized (Postgres ingest pool)');
}
```

**Step 3: Replace storeRedactions() (lines ~661-765) — the only synchronous function**

Replace the entire function body. The key change: remove const db = getDb() and db.prepare().run() pattern:

```typescript
async function storeRedactions(documentId: number, content: string, unredactedSpans: any[] | null) {
  const pool = db as import('pg').Pool;

  const insertSpanSql = `
    INSERT INTO redaction_spans (
      document_id, span_start, span_end, bbox_json, redaction_kind,
      inferred_class, inferred_role, confidence, evidence_json, page_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `;

  try {
    if (unredactedSpans) {
      for (const span of unredactedSpans) {
        const cleanSpanText = TextCleaner.cleanOcrText(span.text || '').trim();
        if (!cleanSpanText) continue;

        const idx = content.indexOf(cleanSpanText);
        if (idx !== -1) {
          const pre = content.substring(Math.max(0, idx - 100), idx);
          const post = content.substring(
            idx + cleanSpanText.length,
            idx + cleanSpanText.length + 100,
          );

          let inference = RedactionClassifier.classify(pre, post);
          try {
            const aiInferences = await AIEnrichmentService.classifyRedaction(pre, post);
            if (aiInferences && aiInferences.length > 0) {
              const top = aiInferences[0];
              const map: Record<string, RedactionInference['inferredClass']> = {
                PERSON: 'person',
                ORGANIZATION: 'org',
                LOCATION: 'location',
                DATE: 'date',
                FINANCIAL: 'misc',
                LEGAL: 'misc',
                OTHER: 'misc',
              };
              const mapped = map[top.type?.toUpperCase()] || 'misc';
              inference = {
                inferredClass: mapped,
                inferredRole: mapped === 'misc' ? top.type?.toLowerCase() || null : null,
                confidence: top.confidence || 0.6,
                evidence: [top.description || 'ai_inferred'],
              };
            }
          } catch (_e) {
            /* fall back to deterministic */
          }

          await pool.query(insertSpanSql, [
            documentId,
            idx,
            idx + cleanSpanText.length,
            JSON.stringify(span.bbox || []),
            'pdf_overlay',
            inference.inferredClass,
            inference.inferredRole,
            inference.confidence,
            JSON.stringify(inference.evidence),
            null,
          ]);
        }
      }
    }

    const redactedPattern = /\[(REDACTED|Media Redacted|Excerpt Redacted|Redacted|redacted)\]/g;
    let match;
    let count = 0;
    while ((match = redactedPattern.exec(content)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      const pre = content.substring(Math.max(0, start - 100), start);
      const post = content.substring(end, end + 100);
      const inference = RedactionClassifier.classify(pre, post);

      await pool.query(insertSpanSql, [
        documentId,
        start,
        end,
        null,
        'removed_text',
        inference.inferredClass,
        inference.inferredRole,
        inference.confidence,
        JSON.stringify(inference.evidence),
        null,
      ]);
      count++;
    }

    if (count > 0) {
      await pool.query(
        'UPDATE documents SET has_redactions = true, redaction_count = $1 WHERE id = $2',
        [count, documentId],
      );
      console.log(`\n      Stored ${count} redactions for doc ${documentId}`);
    }
  } catch (e) {
    console.warn('   Failed to store redactions:', e);
  }
}
```

**Step 4: Fix all remaining db.get() / db.run() / db.all() calls throughout the file**

Search for these patterns and replace (the db variable is already the pool from initDb()):

- await db.get(sql) -> (await db.query(sql)).rows[0] ?? null
- await db.get(sql, [p]) -> (await db.query(sql, [p])).rows[0] ?? null
- await db.all(sql, [p]) -> (await db.query(sql, [p])).rows
- await db.run(sql, [p]) -> await db.query(sql, [p])
- await db.prepare(sql).get(params) -> (await db.query(sql, params)).rows[0] ?? null

Also change ? to $1, $2, $3... in SQL strings within processDocument() INSERT.

**Step 5: Remove db.close() (line ~1594)**

Delete: `await db.close();`

**Step 6: Fix ANALYZE calls (lines ~1637-1638)**

```typescript
await db.query('ANALYZE documents');
await db.query('ANALYZE entities');
```

**Step 7: Fix processQueue() — replace getIngestDb() (line ~1660)**

```typescript
// Before:
const dbSync = getIngestDb();
// After (db is already the pool from initDb()):
const dbSync = db;
```

Replace all dbSync.get() and dbSync.run() with dbSync.query() pattern as above.

**Step 8: Verify**

Run: `cd epstein-archive && npx tsc --noEmit --skipLibCheck 2>&1 | grep ingest_pipeline`
Expected: no errors.

**Step 9: Smoke test pool initialization**

```bash
cd epstein-archive && node -e "
import('dotenv/config').then(() =>
  import('./src/server/db/connection.js').then(({ getIngestPool, initPools }) => {
    initPools();
    const pool = getIngestPool();
    pool.query('SELECT 1 as ok').then(r => { console.log('Pool OK:', r.rows[0]); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });
  })
)
"
```

**Step 10: Commit**

```bash
git add scripts/ingest_pipeline.ts
git commit -m "fix: migrate ingest_pipeline (backbone) to Postgres pool — remove all SQLite patterns"
```

---

## Task 13: Fix recalculate_redaction_stats.ts — transaction refactor

**Files:**

- Modify: scripts/recalculate_redaction_stats.ts

**Step 1: Replace file**

```typescript
#!/usr/bin/env tsx
import { getMaintenancePool } from '../src/server/db/connection.js';
import 'dotenv/config';

async function recalculate() {
  const pool = getMaintenancePool();
  console.log('Recalculating Redaction Statistics...');

  console.log('Clearing old redaction stats...');
  await pool.query(`
    UPDATE documents
    SET has_redactions = false, redaction_count = 0
    WHERE source_collection IS NOT NULL
  `);

  console.log('Aggregating redaction spans...');
  const statsResult = await pool.query(`
    SELECT document_id, COUNT(*) as count
    FROM redaction_spans
    GROUP BY document_id
  `);
  const stats = statsResult.rows as { document_id: number; count: number }[];

  console.log(`Updating ${stats.length} documents with redaction data...`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let i = 0;
    for (const stat of stats) {
      await client.query(
        'UPDATE documents SET has_redactions = true, redaction_count = $1 WHERE id = $2',
        [stat.count, stat.document_id],
      );
      i++;
      if (i % 1000 === 0) {
        process.stdout.write(`   Progress: ${i} / ${stats.length}\r`);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log('\nRedaction statistics successfully recalculated!');

  const row = (
    await pool.query(`
    SELECT COUNT(*) as count FROM documents WHERE has_redactions = true
  `)
  ).rows[0] as { count: number };

  console.log(`Total documents now marked as redacted: ${row.count}`);
}

recalculate().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add scripts/recalculate_redaction_stats.ts
git commit -m "fix: migrate recalculate_redaction_stats to Postgres — transaction refactor"
```

---

## Task 14: Fix manual_maintenance.ts — named params + transaction

**Files:**

- Modify: scripts/manual_maintenance.ts

Key changes: named @param style -> positional $N, db.transaction(fn) -> BEGIN/COMMIT.

**Step 1: Replace file**

```typescript
import { getMaintenancePool } from '../src/server/db/connection.js';
import 'dotenv/config';
import { isJunkEntity } from '../src/utils/entityFilters.js';
import { relationshipsRepository } from '../src/server/db/relationshipsRepository.js';
import { ENTITY_BLACKLIST_REGEX } from '../src/config/entityBlacklist.js';

const runMaintenance = async () => {
  console.log('Starting Manual Maintenance Tasks...');

  // 1. Junk Entity Backfill
  console.log('\n--- 1. Junk Entity Backfill ---');
  try {
    const pool = getMaintenancePool();
    const batchSize = 1000;
    let totalProcessed = 0;

    console.log('Starting junk signal analysis...');

    while (true) {
      const rowsResult = await pool.query(
        `
        SELECT
          e.id, e.full_name, e.primary_role, e.mentions, e.is_vip, e.bio,
          (SELECT COUNT(*) FROM media_item_people mip WHERE mip.entity_id = e.id) as media_count,
          (SELECT COUNT(*) FROM black_book_entries bb WHERE bb.person_id = e.id) as black_book_count,
          (SELECT COUNT(DISTINCT et.type_name)
           FROM entity_evidence_types eet
           JOIN evidence_types et ON eet.evidence_type_id = et.id
           WHERE eet.entity_id = e.id) as source_count
        FROM entities e
        WHERE junk_flag IS NULL
        LIMIT $1
      `,
        [batchSize],
      );

      const rows = rowsResult.rows;
      if (rows.length === 0) break;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const r of rows) {
          let prob = 0;
          let reason = '';

          const isJunk = isJunkEntity(r.full_name || '');
          if (isJunk) {
            prob = 0.8;
            reason = 'heuristic_match';
          }

          const name = (r.full_name || '').toLowerCase();
          if (
            name.length < 3 ||
            /[.@]/.test(name) ||
            name.startsWith('http') ||
            name.startsWith('www.')
          ) {
            prob = Math.max(prob, 0.95);
            reason = reason || 'name_hygiene';
          }

          if (ENTITY_BLACKLIST_REGEX.test(r.full_name || '')) {
            prob = Math.max(prob, 0.9);
            reason = reason || 'regex_blacklist';
          }

          const lowSignals =
            (r.mentions || 0) === 0 &&
            (r.media_count || 0) === 0 &&
            (r.source_count || 0) === 0 &&
            (r.black_book_count || 0) === 0 &&
            (r.bio || '') === '' &&
            (r.is_vip || 0) === 0;

          if (lowSignals && (r.primary_role || '').toLowerCase() === 'unknown') {
            prob = Math.max(prob, 0.7);
            reason = reason || 'low_signals';
          }

          const junk = prob >= 0.7;
          await client.query(
            'UPDATE entities SET junk_flag = $1, junk_reason = $2, junk_probability = $3 WHERE id = $4',
            [junk ? 1 : 0, junk ? reason : null, prob, r.id],
          );
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      totalProcessed += rows.length;
      console.log(`Processed ${totalProcessed} entities...`);
    }
  } catch (e) {
    console.error('Junk backfill failed:', e);
  }

  // 2. Adjacency Cache
  console.log('\n--- 2. Rebuilding Adjacency Cache ---');
  try {
    relationshipsRepository.rebuildAdjacencyCache();
    console.log('Adjacency cache rebuilt.');
  } catch (e) {
    console.error('Adjacency cache rebuild failed:', e);
  }

  console.log('\nMaintenance Complete.');
};

runMaintenance().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add scripts/manual_maintenance.ts
git commit -m "fix: migrate manual_maintenance — transaction refactor + named params to positional"
```

---

## Task 15: Fix metadata_backfill.ts — transaction + remove SQLITE_BUSY

**Files:**

- Modify: scripts/metadata_backfill.ts

Key changes: db.transaction(fn)() -> BEGIN/COMMIT, remove SQLITE_BUSY retry, convert all .prepare().run() to await pool.query().

**Step 1: Replace file**

```typescript
#!/usr/bin/env tsx
import { getMaintenancePool } from '../src/server/db/connection.js';
import { discoveryRepository } from '../src/server/db/discoveryRepository.js';
import { RedactionClassifier } from '../src/server/services/RedactionClassifier.js';
import { TextCleaner } from './utils/text_cleaner.js';
import 'dotenv/config';

const BATCH_SIZE = 500;
import pg from 'pg';

async function backfill() {
  const pool = getMaintenancePool();
  console.log('Starting Metadata Backfill for Legacy Documents...');

  let processedCount = 0;
  let hasMore = true;

  while (hasMore) {
    const docsResult = await pool.query(
      `
      SELECT id, content, file_path
      FROM documents
      WHERE signal_score IS NULL AND content IS NOT NULL
      LIMIT $1
    `,
      [BATCH_SIZE],
    );
    const docs = docsResult.rows;

    if (docs.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Processing batch of ${docs.length} documents...`);

    for (const doc of docs) {
      try {
        await processDocumentBackfill(pool, doc);
        processedCount++;
        if (processedCount % 100 === 0) {
          process.stdout.write(`   Progress: ${processedCount} documents...\r`);
        }
      } catch (err) {
        console.error(`\nError processing document ${doc.id}:`, err);
      }
    }
  }

  console.log(`\nBackfill complete! Total processed: ${processedCount}`);
}

async function processDocumentBackfill(pool: pg.Pool, doc: any) {
  const content = doc.content;
  const sentences = content
    .split(/(?<=[.!?])\s+/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM document_sentences WHERE document_id = $1', [doc.id]);
    await client.query('DELETE FROM redaction_spans WHERE document_id = $1', [doc.id]);

    for (let i = 0; i < sentences.length; i++) {
      discoveryRepository.addSentence({
        document_id: doc.id,
        sentence_index: i,
        sentence_text: sentences[i],
      });
    }

    await storeRedactions(client, doc.id, content);
    await rollupScores(client, doc.id);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function storeRedactions(client: pg.PoolClient, documentId: number, content: string) {
  const insertSpanSql = `
    INSERT INTO redaction_spans (
      document_id, span_start, span_end, redaction_kind,
      inferred_class, inferred_role, confidence, evidence_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;

  const redactedPattern =
    /(REDACTED|Media Redacted|Excerpt Redacted|Redacted|redacted|Privileged - Redacted)/gi;
  let match;
  let count = 0;
  while ((match = redactedPattern.exec(content)) !== null) {
    count++;
    const start = match.index;
    const end = match.index + match[0].length;
    const pre = content.substring(Math.max(0, start - 100), start);
    const post = content.substring(end, end + 100);
    const inference = RedactionClassifier.classify(pre, post);

    await client.query(insertSpanSql, [
      documentId,
      start,
      end,
      'removed_text',
      inference.inferredClass,
      inference.inferredRole,
      inference.confidence,
      JSON.stringify(inference.evidence),
    ]);
  }

  if (count > 0) {
    await client.query(
      'UPDATE documents SET has_redactions = true, redaction_count = $1 WHERE id = $2',
      [count, documentId],
    );
    console.log(`\n      Stored ${count} redactions for doc ${documentId}`);
  }
}

async function rollupScores(client: pg.PoolClient, docId: number) {
  await client.query(
    `
    UPDATE document_sentences SET signal_score = 0.7
    WHERE document_id = $1 AND is_boilerplate = false
  `,
    [docId],
  );

  await client.query(
    `
    UPDATE document_sentences SET signal_score = 0.1
    WHERE document_id = $1 AND is_boilerplate = true
  `,
    [docId],
  );

  const statsResult = await client.query(
    `
    SELECT AVG(signal_score) as avg_score FROM document_sentences WHERE document_id = $1
  `,
    [docId],
  );

  const avgScore = (statsResult.rows[0] as any)?.avg_score ?? 0.0;

  await client.query('UPDATE documents SET signal_score = $1, analyzed_at = NOW() WHERE id = $2', [
    avgScore,
    docId,
  ]);
}

backfill().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add scripts/metadata_backfill.ts
git commit -m "fix: migrate metadata_backfill — transaction rewrite, remove SQLITE_BUSY handling"
```

---

## Task 16: Extend CI guards to cover scripts/

**Files:**

- Modify: scripts/guard_no_sqlite.sh
- Modify: scripts/ci_pg_nuclear_gates.sh

**Step 1: Replace guard_no_sqlite.sh**

```bash
#!/usr/bin/env bash
set -e
if rg -n "sqlite|better-sqlite3|PRAGMA|FTS5" src/ scripts/; then
  echo "FAIL: SQLite detected in production code or scripts"
  exit 1
fi
if rg -n "getDb\b|getIngestDb\b" scripts/; then
  echo "FAIL: Deleted getDb()/getIngestDb() still referenced in scripts/"
  exit 1
fi
echo "PASS: No SQLite patterns detected"
```

**Step 2: Add guard block to ci_pg_nuclear_gates.sh**

Find the SQLite check section (grep for "better-sqlite3" in that file) and add after it:

```bash
# Check scripts/ for broken legacy imports
if grep -rE "getDb\(\)|getIngestDb\(\)" scripts/ 2>/dev/null; then
  echo "FATAL: scripts/ still references deleted getDb()/getIngestDb()"
  exit 1
fi
```

**Step 3: Run the guard**

Run: `cd epstein-archive && bash scripts/guard_no_sqlite.sh`
Expected: PASS: No SQLite patterns detected

**Step 4: Commit**

```bash
git add scripts/guard_no_sqlite.sh scripts/ci_pg_nuclear_gates.sh
git commit -m "chore: extend SQLite guard scripts to cover scripts/ directory"
```

---

## Task 17: Cleanup — env example, legacy DB files, CLAUDE.md

**Files:**

- Modify: .env.example
- Possibly delete: archive.db, epstein.db (root-level zero-byte files only)
- Modify: CLAUDE.md

**Step 1: Remove DB_PATH from .env.example**

Remove these lines:

```
# SQLite (Legacy)
DB_PATH=./epstein-archive.db
```

**Step 2: Check size of legacy SQLite files before removing**

Run: `ls -la epstein-archive/archive.db epstein-archive/epstein.db epstein-archive/epstein_archive.db 2>&1`
If all are 0 bytes, remove them. If any have data, leave them.

**Step 3: Update CLAUDE.md — add pool selection note**

In the Commands section, add under Database heading:

```markdown
Pool selection for scripts:

- getIngestPool() — ingestion pipeline scripts (heavy workloads, 8 connections)
- getMaintenancePool() — maintenance/backfill/repair scripts (long timeouts, 256MB work_mem)
- getApiPool() — read-only analysis/debug scripts
```

**Step 4: Run full verification**

```bash
cd epstein-archive

# No remaining getDb/getIngestDb in scripts
grep -r "getDb\|getIngestDb" scripts/ && echo FAIL || echo "PASS: no broken imports"

# SQLite guard
bash scripts/guard_no_sqlite.sh

# Type check
pnpm type-check

# Lint
pnpm lint

# CI gates
pnpm ci:pg:nuclear

# Smoke tests
pnpm test:smoke
```

**Step 5: Final commit**

```bash
git add .env.example CLAUDE.md
git commit -m "chore: remove legacy SQLite env var and cleanup post-migration"
```

---

## Verification checklist

All of these must pass before declaring complete:

1. `grep -r "getDb\|getIngestDb" scripts/` returns nothing
2. `bash scripts/guard_no_sqlite.sh` exits 0
3. `pnpm type-check` exits 0
4. `pnpm lint` exits 0
5. `pnpm ci:pg:nuclear` exits 0
6. `pnpm test:smoke` exits 0
