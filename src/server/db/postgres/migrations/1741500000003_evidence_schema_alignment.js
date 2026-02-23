/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  // 1. Add missing columns to evidence
  pgm.addColumns('evidence', {
    ingested_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    modified_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    word_count: { type: 'integer' },
    file_size: { type: 'bigint' },
  });

  // 2. Add role to media_item_people
  pgm.addColumns('media_item_people', {
    role: { type: 'text', default: 'participant' },
  });

  // 3. Create media_item_tags junction table
  pgm.createTable('media_item_tags', {
    media_item_id: { type: 'text', references: 'media_items(id)', onDelete: 'CASCADE' },
    tag_id: { type: 'bigint', references: 'media_tags(id)', onDelete: 'CASCADE' },
  });
  pgm.addConstraint('media_item_tags', 'pk_media_item_tags', {
    primaryKey: ['media_item_id', 'tag_id'],
  });
}

export async function down(pgm) {
  pgm.dropTable('media_item_tags');
  pgm.dropColumn('media_item_people', 'role');
  pgm.dropColumn('evidence', ['ingested_at', 'modified_at', 'word_count', 'file_size']);
}
