/* eslint-disable no-undef */

export async function up(pgm) {
  pgm.createTable('web_vitals', {
    id: { type: 'serial', primaryKey: true },
    session_id: { type: 'text', notNull: true },
    route: { type: 'text', notNull: true },
    cls: { type: 'real', notNull: true },
    lcp: { type: 'real', notNull: true },
    inp: { type: 'real', notNull: true },
    long_task_count: { type: 'integer', notNull: true },
    collected_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createIndex('web_vitals', 'session_id');
  pgm.createIndex('web_vitals', 'route');
  pgm.createIndex('web_vitals', 'collected_at');
}

export async function down(pgm) {
  pgm.dropTable('web_vitals');
}
