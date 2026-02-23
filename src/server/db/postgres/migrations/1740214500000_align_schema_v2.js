/* eslint-disable no-unused-vars */

/**
 * Historical placeholder migration.
 *
 * Production `pgmigrations` may already contain `1740214500000_align_schema_v2`.
 * The canonical repo migration was later re-timestamped to
 * `1741540000000_align_schema_v2.js` to avoid backdated ordering failures on
 * environments that had advanced further in the chain.
 *
 * This placeholder preserves migration ledger continuity only.
 */

export async function up(_pgm) {
  // no-op (historical migration already applied in production)
}

export async function down(_pgm) {
  // no-op
}
