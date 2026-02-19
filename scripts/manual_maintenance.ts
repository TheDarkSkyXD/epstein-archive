import { getDb } from '../src/server/db/connection';
import { isJunkEntity } from '../src/utils/entityFilters';
import { relationshipsRepository } from '../src/server/db/relationshipsRepository';
import { ENTITY_BLACKLIST_REGEX } from '../src/config/entityBlacklist';

const runMaintenance = async () => {
  console.log('🚀 Starting Manual Maintenance Tasks...');

  // 1. Junk Backfill (Synchronous for script)
  console.log('\n--- 1. Junk Entity Backfill ---');
  try {
    const db = getDb();
    const batchSize = 1000;
    let offset = 0;
    let totalProcessed = 0;

    console.log('Starting junk signal analysis...');

    while (true) {
      const rows = db
        .prepare(
          `
            SELECT 
              e.id, 
              e.full_name, 
              e.primary_role,
              e.mentions, 
              e.is_vip,
              e.bio,
              (SELECT COUNT(*) FROM media_item_people mip WHERE mip.entity_id = e.id) as media_count,
              (SELECT COUNT(*) FROM black_book_entries bb WHERE bb.person_id = e.id) as black_book_count,
              (SELECT COUNT(DISTINCT et.type_name) 
               FROM entity_evidence_types eet 
               JOIN evidence_types et ON eet.evidence_type_id = et.id 
               WHERE eet.entity_id = e.id) as source_count
            FROM entities e
            WHERE junk_flag IS NULL 
            LIMIT ? OFFSET ?
        `,
        )
        .all(batchSize, offset) as any[];

      if (rows.length === 0) break;

      const stmt = db.prepare(
        `UPDATE entities SET junk_flag=@junk_flag, junk_reason=@junk_reason, junk_probability=@junk_probability WHERE id=@id`,
      );

      const tx = db.transaction((items: typeof rows) => {
        for (const r of items) {
          let prob = 0;
          let reason = '';

          // Use the expanded heuristics from isJunkEntity
          const isJunk = isJunkEntity(r.full_name || '');

          if (isJunk) {
            prob = 0.8;
            reason = 'heuristic_match';
          }

          // Additional name hygiene
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

          // Signal-based junk detection
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
          stmt.run({
            id: r.id,
            junk_flag: junk ? 1 : 0,
            junk_reason: junk ? reason : null,
            junk_probability: prob,
          });
        }
      });

      tx(rows);
      totalProcessed += rows.length;
      // Since we are iterating offset, we process in chunks.
      // Note: we can't rely on 'WHERE junk_flag IS NULL' inside the loop if we use offset,
      // because the set changes. So we use LIMIT/OFFSET on the *snapshot* or just re-query?
      // Actually, if we update them, they no longer have junk_flag IS NULL.
      // So offset should remain 0!
      // But if rows.length < batchSize, we are done.

      // Wait, if we use offset 0, we re-query.
      // But 'rows' is fetched with LIMIT.
      // If we process them, they disappear from the next query (if exact same query runs).
      // Let's stick to safe pagination using offset if we weren't modifying.
      // BUT we ARE modifying.
      // So offset MUST be 0 if we rely on the WHERE clause to exclude processed items.

      // Correct logic:
      // offset 0.
      // process batch.
      // next iteration, fetch batch again (which will be new items).

      // BUT we need to be careful about infinite loops if updates fail.
      // Let's assume updates succeed.

      console.log(`Processed ${totalProcessed} entities...`);
    }
  } catch (e) {
    console.error('Junk backfill failed:', e);
  }

  // 2. Adjacency Cache
  console.log('\n--- 2. Rebuilding Adjacency Cache ---');
  try {
    relationshipsRepository.rebuildAdjacencyCache();
    console.log('✅ Adjacency cache rebuilt.');
  } catch (e) {
    console.error('Adjacency cache rebuild failed:', e);
  }

  console.log('\n✅ Maintenance Complete.');
};

runMaintenance();
