export const shorthands = undefined;

export async function up(pgm) {
  // Add error_message to ingest_runs
  pgm.addColumn('ingest_runs', {
    error_message: { type: 'text' },
  });

  // Create resolver_runs table
  pgm.createTable('resolver_runs', {
    id: { type: 'bigserial', primaryKey: true },
    resolver_name: { type: 'text', notNull: true },
    resolver_version: { type: 'text' },
    started_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    completed_at: { type: 'timestamp' },
    status: { type: 'text', default: 'running' },
    metrics_json: { type: 'jsonb' },
  });
}

export async function down(pgm) {
  pgm.dropTable('resolver_runs');
  pgm.dropColumn('ingest_runs', 'error_message');
}
