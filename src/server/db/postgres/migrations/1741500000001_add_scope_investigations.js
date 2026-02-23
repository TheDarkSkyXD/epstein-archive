/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE investigations ADD COLUMN IF NOT EXISTS scope TEXT;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE investigations DROP COLUMN IF EXISTS scope;
  `);
}
