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
