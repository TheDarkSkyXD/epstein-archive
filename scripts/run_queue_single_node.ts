#!/usr/bin/env tsx
import { JobManager } from '../src/server/services/JobManager.js';
import { getDb } from '../src/server/db/connection.js';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';

process.env.AI_PROVIDER = 'exo_cluster';
process.env.ENABLE_AI_ENRICHMENT = 'true';

const CONCURRENCY = parseInt(process.env.INGEST_CONCURRENCY || '2', 10);
const LEASE_SECONDS = parseInt(process.env.QUEUE_LEASE_SECONDS || '600', 10);
const HEALTH_URL = process.env.QUEUE_HEALTH_URL || 'http://127.0.0.1:3012/api/health';

async function waitForHealthyApi(): Promise<void> {
  try {
    const res = await fetch(HEALTH_URL, { method: 'GET' });
    if (res.ok) return;
  } catch {
    // intentional: handled below
  }
  process.stdout.write(`\n⚠️ API unhealthy at ${HEALTH_URL}. Pausing queue worker for 30s...\n`);
  await new Promise((resolve) => setTimeout(resolve, 30000));
}

async function runQueue() {
  const db = getDb();
  const jobManager = new JobManager();

  let shuttingDown = false;
  let processed = 0;
  let failed = 0;
  let hasMore = true;
  const active: Set<Promise<void>> = new Set();
  const startedAt = Date.now();

  const initialQueued = (
    db.prepare("SELECT COUNT(*) AS c FROM documents WHERE processing_status = 'queued'").get() as {
      c: number;
    }
  ).c;

  const initialProcessing = (
    db
      .prepare("SELECT COUNT(*) AS c FROM documents WHERE processing_status = 'processing'")
      .get() as { c: number }
  ).c;

  console.log('='.repeat(80));
  console.log('🚀 SINGLE-NODE QUEUE RUNNER');
  console.log('='.repeat(80));
  console.log(`🤖 EXO_MODEL=${process.env.EXO_MODEL || '(auto-discover)'}`);
  console.log(`⚡ Concurrency=${CONCURRENCY}`);
  console.log(`📬 Initial queued=${initialQueued.toLocaleString()}`);
  console.log(`⏳ Initial processing=${initialProcessing.toLocaleString()}`);
  console.log();

  const signalHandler = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n🛑 Shutdown requested. Finishing active jobs...');
  };
  process.on('SIGINT', signalHandler);
  process.on('SIGTERM', signalHandler);

  while (!shuttingDown && (hasMore || active.size > 0)) {
    await waitForHealthyApi();

    while (!shuttingDown && hasMore && active.size < CONCURRENCY) {
      const job = jobManager.acquireJob(LEASE_SECONDS);
      if (!job) {
        hasMore = false;
        break;
      }

      const p = (async () => {
        const docId = Number(job.id);
        try {
          jobManager.renewLease(docId, LEASE_SECONDS);

          const row = db.prepare('SELECT content FROM documents WHERE id = ?').get(docId) as
            | { content?: string }
            | undefined;
          const content = row?.content ?? '';

          if (content.length > 0) {
            const context = content.slice(0, 2000);
            const refined = await AIEnrichmentService.repairMimeWildcards(content, context);
            if (refined && refined !== content) {
              db.prepare(
                'UPDATE documents SET content = ?, content_refined = ?, last_processed_at = datetime("now") WHERE id = ?',
              ).run(refined, refined, docId);
            }
          }

          jobManager.completeJob(docId);
          processed++;

          if (processed % 25 === 0) {
            const elapsedSec = (Date.now() - startedAt) / 1000;
            const rate = processed / Math.max(elapsedSec, 1);
            const remaining = (
              db
                .prepare("SELECT COUNT(*) AS c FROM documents WHERE processing_status = 'queued'")
                .get() as { c: number }
            ).c;
            const etaMin = remaining / Math.max(rate, 0.0001) / 60;
            process.stdout.write(
              `\r✅ Processed=${processed.toLocaleString()} Failed=${failed.toLocaleString()} Active=${active.size} Rate=${rate.toFixed(2)} docs/s Remaining=${remaining.toLocaleString()} ETA=${etaMin.toFixed(1)}m`,
            );
          }
        } catch (e: any) {
          failed++;
          jobManager.failJob(docId, e?.message || 'unknown error');
          process.stdout.write(`\n❌ Doc ${docId} failed: ${e?.message || 'unknown error'}\n`);
        }
      })();

      p.finally(() => active.delete(p));
      active.add(p);
    }

    if (active.size > 0) {
      await Promise.race(active);
    } else if (!hasMore) {
      break;
    }
  }

  while (active.size > 0) {
    await Promise.race(active);
  }

  const queuedLeft = (
    db.prepare("SELECT COUNT(*) AS c FROM documents WHERE processing_status = 'queued'").get() as {
      c: number;
    }
  ).c;

  console.log('\n');
  console.log('='.repeat(80));
  console.log('🏁 QUEUE RUN COMPLETE');
  console.log('='.repeat(80));
  console.log(`Processed: ${processed.toLocaleString()}`);
  console.log(`Failed: ${failed.toLocaleString()}`);
  console.log(`Queued remaining: ${queuedLeft.toLocaleString()}`);
}

runQueue().catch((err) => {
  console.error('\n❌ Fatal queue runner error:', err);
  process.exit(1);
});
