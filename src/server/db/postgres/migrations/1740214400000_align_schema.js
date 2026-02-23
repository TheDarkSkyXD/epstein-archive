/* eslint-disable no-unused-vars */

/**
 * Historical placeholder migration.
 *
 * Production `pgmigrations` already contains `1740214400000_align_schema`.
 * The original file is no longer present in the repository, which breaks
 * node-pg-migrate's order checks when later migrations are pending.
 *
 * This file intentionally performs no schema changes. It only preserves
 * migration chain continuity for environments that already recorded it.
 */

export async function up(_pgm) {
  // no-op (historical migration already applied in production)
}

export async function down(_pgm) {
  // no-op
}
