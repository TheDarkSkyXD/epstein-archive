/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  // 1. Add cleaned_path to evidence
  pgm.addColumns('evidence', {
    cleaned_path: { type: 'text' },
  });

  // 2. Add file_size to media_items (if missing)
  pgm.addColumns('media_items', {
    file_size: { type: 'bigint' },
  });
}

export async function down(pgm) {
  pgm.dropColumn('media_items', 'file_size');
  pgm.dropColumn('evidence', 'cleaned_path');
}
