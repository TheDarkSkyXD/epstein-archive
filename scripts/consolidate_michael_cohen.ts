#!/usr/bin/env tsx

/**
 * Consolidate all "Michael Cohen"-related entities into a single canonical entity.
 *
 * Canonical choice: entity id 13316 ("Michael Cohen"), which has the highest
 * number of mentions. All other entities whose name or aliases contain
 * "Michael" and "Cohen" will be merged into this one.
 *
 * Affects tables:
 * - entities
 * - entity_mentions (entity_id)
 * - entity_relationships (source_entity_id, target_entity_id)
 * - relations (subject_entity_id, object_entity_id, id recomputed)
 * - resolution_candidates (left_entity_id, right_entity_id)
 *
 * This script is idempotent: running it multiple times should not create
 * duplicate rows beyond what the existing ON CONFLICT constraints allow.
 */

import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

type EntityRow = {
  id: number;
  full_name: string;
  aliases: string | null;
};

const hasEntityRels = !!db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'entity_relationships'")
  .get();
const hasRelations = !!db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'relations'")
  .get();
const hasResCandidates = !!db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'resolution_candidates'")
  .get();

function main() {
  console.log('[MichaelCohen] Starting consolidation against DB:', DB_PATH);

  const candidates = db
    .prepare<[] /* no params */, EntityRow>(
      `
      SELECT id, full_name, COALESCE(aliases, '') as aliases
      FROM entities
      WHERE (lower(full_name) LIKE '%michael%' AND lower(full_name) LIKE '%cohen%')
         OR lower(aliases) LIKE '%michael%cohen%'
      ORDER BY id
    `,
    )
    .all();

  if (candidates.length <= 1) {
    console.log('[MichaelCohen] Found', candidates.length, 'candidate(s). Nothing to consolidate.');
    db.close();
    return;
  }

  console.log('[MichaelCohen] Found candidates:');
  for (const c of candidates) {
    console.log(`  - ${c.id}: ${c.full_name} [aliases="${c.aliases}"]`);
  }

  const ids = candidates.map((c) => c.id);

  const mentionCounts = db
    .prepare(
      `SELECT entity_id, COUNT(*) as c FROM entity_mentions
       WHERE entity_id IN (${ids.map(() => '?').join(',')})
       GROUP BY entity_id
       ORDER BY c DESC`,
    )
    .all(...ids) as { entity_id: number; c: number }[];

  let canonicalId = 13316; // default based on prior inspection
  const top = mentionCounts[0];
  if (top && top.entity_id) {
    canonicalId = top.entity_id;
  }

  const canonical = candidates.find((c) => c.id === canonicalId) ?? candidates[0];
  canonicalId = canonical.id;

  console.log(`\n[MichaelCohen] Using canonical entity ${canonicalId}: "${canonical.full_name}"`);

  const toMerge = candidates.filter((c) => c.id !== canonicalId).map((c) => c.id);
  if (toMerge.length === 0) {
    console.log('[MichaelCohen] No other entities to merge.');
    db.close();
    return;
  }

  console.log('[MichaelCohen] Will merge the following ids into canonical: ', toMerge.join(', '));

  const tx = db.transaction((mergeIds: number[]) => {
    for (const id of mergeIds) {
      if (id === canonicalId) continue;
      console.log(`[MichaelCohen] Merging entity ${id} into ${canonicalId}...`);

      // 1) Move all entity_mentions
      const updatedMentions = db
        .prepare('UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?')
        .run(canonicalId, id).changes;

      // 2) For simplicity and to avoid UNIQUE constraint issues, drop any
      //    entity_relationships rows that reference the merging id. These
      //    co-occurrence relationships can be rebuilt later from mentions.
      let deletedRels = 0;
      if (hasEntityRels) {
        deletedRels = db
          .prepare(
            'DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?',
          )
          .run(id, id).changes;
      }

      // 3) Update relations (subject/object) and recompute id as
      //    "<minId>-<maxId>-<predicate>" so subsequent runs remain stable.
      let updSubj = 0;
      let updObj = 0;
      if (hasRelations) {
        updSubj = db
          .prepare('UPDATE relations SET subject_entity_id = ? WHERE subject_entity_id = ?')
          .run(canonicalId, id).changes;
        updObj = db
          .prepare('UPDATE relations SET object_entity_id = ? WHERE object_entity_id = ?')
          .run(canonicalId, id).changes;

        if (updSubj > 0 || updObj > 0) {
          db.prepare(
            `UPDATE relations
                 SET id =
                   (CAST(
                      CASE WHEN subject_entity_id < object_entity_id THEN subject_entity_id ELSE object_entity_id END
                    AS TEXT)
                    || '-' ||
                    CAST(
                      CASE WHEN subject_entity_id < object_entity_id THEN object_entity_id ELSE subject_entity_id END
                    AS TEXT)
                    || '-' ||
                    COALESCE(predicate, 'related'))`,
          ).run();
        }
      }

      // 4) Update resolution_candidates (left/right entity ids).
      if (hasResCandidates) {
        db.prepare(
          'UPDATE resolution_candidates SET left_entity_id = ? WHERE left_entity_id = ?',
        ).run(canonicalId, id);
        db.prepare(
          'UPDATE resolution_candidates SET right_entity_id = ? WHERE right_entity_id = ?',
        ).run(canonicalId, id);
      }

      // 5) Optionally, merge aliases into canonical entity
      const row = db
        .prepare(`SELECT full_name, COALESCE(aliases, '') as aliases FROM entities WHERE id = ?`)
        .get(id) as { full_name: string; aliases: string | null } | undefined;
      if (row) {
        const parts: string[] = [];
        if (canonical.aliases) {
          parts.push(
            ...canonical.aliases
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          );
        }
        if (row.full_name && row.full_name !== canonical.full_name) {
          parts.push(row.full_name.trim());
        }
        if (row.aliases) {
          parts.push(
            ...row.aliases
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          );
        }
        const uniqueAliases = Array.from(new Set(parts));
        const aliasStr = uniqueAliases.join(', ');
        db.prepare('UPDATE entities SET aliases = ? WHERE id = ?').run(aliasStr, canonicalId);
        // Keep canonical in sync in memory
        canonical.aliases = aliasStr;
      }

      // 6) Finally, remove the merged entity row itself
      db.prepare('DELETE FROM entities WHERE id = ?').run(id);

      console.log(
        `[MichaelCohen]   -> moved ${updatedMentions} mentions, ` +
          `${deletedRels} relationships (dropped), ` +
          `${updSubj + updObj} relations rows, and merged aliases.`,
      );
    }
  });

  tx(toMerge);

  console.log('\n[MichaelCohen] Consolidation complete.');
  db.close();
}

main();
