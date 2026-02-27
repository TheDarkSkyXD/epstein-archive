# SQLite to PostgreSQL scripts migration design

## Context

The "Scorched Earth on SQLite" commit (b3ec90a8, 2026-02-23) removed `getDb()` from
`src/server/db/connection.ts` and completed the migration of production server code
(`src/`) to PostgreSQL. However, 22+ scripts in `scripts/` still import the deleted
function and use the SQLite synchronous API (`.prepare()`, `.run()`, `.get()`, `.all()`,
`.transaction()`). These scripts are currently broken and include the critical ingestion
pipeline.

## Approach selected: direct `pool.query()` in-place

Replace every SQLite call with the raw `pg` pool API directly in each script. No new
abstractions. This matches the existing style of server code (which uses `pool.query()`
directly in repositories) and keeps each script self-contained.

## Translation rules

| SQLite pattern                                        | PostgreSQL replacement                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `import { getDb } from '../src/server/db/connection'` | `import { getApiPool \| getMaintenancePool \| getIngestPool } from '../src/server/db/connection'` |
| `const db = getDb()`                                  | `const pool = getIngestPool()` (or appropriate pool)                                              |
| `db.prepare(sql).get(p1, p2)`                         | `(await pool.query(sql, [p1, p2])).rows[0]`                                                       |
| `db.prepare(sql).all(p1)`                             | `(await pool.query(sql, [p1])).rows`                                                              |
| `db.prepare(sql).run(p1, p2)`                         | `await pool.query(sql, [p1, p2])`                                                                 |
| `db.transaction(fn)()`                                | `BEGIN / COMMIT` with `pool.connect()` client checkout                                            |
| `?` placeholder                                       | `$1, $2, $3…`                                                                                     |
| `PRAGMA ANALYZE`                                      | `ANALYZE`                                                                                         |
| `db.close()`                                          | Remove (pool manages connections)                                                                 |

Pool selection per script type:

- Ingestion pipeline scripts → `getIngestPool()`
- Maintenance / backfill / repair scripts → `getMaintenancePool()`
- Read-only analysis / export scripts → `getApiPool()`

## Script inventory

### Group A — simple (import swap + placeholder fix, ~8 scripts)

- `run_migrations.ts` — delegates to `runMigrations()`, no direct SQL
- `watermark_fakes.ts` — no direct DB access
- `backfill_thumbnails.ts` — no direct DB access
- `analyze_evidence_gap.ts` — read-only `.prepare().all()`
- `unified_pipeline.ts` — simple read/update, no transactions
- `export_training_data.ts` — read-only exports
- `seed_map_locations.ts` — simple prepare/run
- `promote_boilerplate.ts` — simple prepare/run
- `debug/check_top_entities.ts`, `debug/debug_stats.ts`, `debug/test_stats.ts` — read-only

### Group B — medium (async refactor, no transactions, ~4 scripts)

- `ingest_pipeline.ts` — 35 DB calls, `.prepare()` for batched inserts, PRAGMA ANALYZE
- `ingest_intelligence.ts` — 11 DB calls, `.prepare()` for entity/relationship inserts
- `repair_invalid_spans.ts` — 4 DB calls, mixed read/write
- `run_queue_single_node.ts` — 7 DB calls, poll loop pattern

### Group C — complex (transaction refactoring, ~3 scripts)

- `metadata_backfill.ts` — 14 DB calls, `db.transaction()` wrapping a batch loop
- `manual_maintenance.ts` — 8 DB calls, `db.transaction()` wrapping looped updates
- `recalculate_redaction_stats.ts` — 6 DB calls, `db.transaction()` for stats update

PostgreSQL transaction template for Group C:

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

## Additional cleanup

- Remove `DB_PATH` from `.env.example` (now handled gracefully in startup validation
  but should not be advertised as a valid config option)
- Extend `scripts/guard_no_sqlite.sh` and `scripts/ci_pg_nuclear_gates.sh` to also
  scan `scripts/` directory, not just `src/`
- Remove orphaned SQLite `.db` files that are no longer needed
  (`archive.db`, `epstein.db`, `epstein_archive.db`; keep `sample.db` for local dev)
- Update `CLAUDE.md` to document which pool function each script category should use

## Success criteria

1. `pnpm type-check` passes with zero errors
2. `pnpm lint` passes with zero warnings on touched files
3. `pnpm check:boundaries` passes
4. CI nuclear gates pass (`pnpm ci:pg:nuclear`)
5. `pnpm test:smoke` passes
6. `pnpm ingest:intelligence` runs without crashing on a sample DB
