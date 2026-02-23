/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.createTable(
    { schema: 'public', name: 'articles' },
    {
      id: { type: 'bigserial', primaryKey: true },
      title: { type: 'text', notNull: true },
      link: { type: 'text' },
      url: { type: 'text' },
      source: { type: 'text' },
      publication: { type: 'text' },
      pub_date: { type: 'timestamptz' },
      published_date: { type: 'timestamptz' },
      description: { type: 'text' },
      summary: { type: 'text' },
      tags: { type: 'text' },
      red_flag_rating: { type: 'integer', default: 0 },
      image_url: { type: 'text' },
      reading_time: { type: 'text' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    },
    { ifNotExists: true },
  );

  pgm.createIndex({ schema: 'public', name: 'articles' }, ['pub_date'], {
    ifNotExists: true,
    name: 'idx_articles_pub_date',
  });
  pgm.createIndex({ schema: 'public', name: 'articles' }, ['red_flag_rating'], {
    ifNotExists: true,
    name: 'idx_articles_red_flag_rating',
  });
  pgm.createIndex({ schema: 'public', name: 'articles' }, ['source'], {
    ifNotExists: true,
    name: 'idx_articles_source',
  });
}

export async function down(pgm) {
  pgm.dropTable({ schema: 'public', name: 'articles' }, { ifExists: true, cascade: true });
}
