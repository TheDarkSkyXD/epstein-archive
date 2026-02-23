#!/usr/bin/env tsx
import pg from 'pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const versionRes = await client.query('SELECT version() AS version');
    console.log('Postgres version:', versionRes.rows[0]?.version);

    const tables = [
      'entities',
      'documents',
      'entity_mentions',
      'entity_relationships',
      'media_items',
    ];

    for (const table of tables) {
      const res = await client.query(`SELECT COUNT(*)::bigint AS count FROM ${table}`);
      console.log(`COUNT(*) FROM ${table}:`, res.rows[0]?.count);
    }

    const columnsRes = await client.query<{
      column_name: string;
    }>(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'entities'
      `,
    );
    const entityColumns = columnsRes.rows.map((r) => r.column_name);
    console.log('entities columns:', entityColumns);

    const requiredColumns = [
      'fts_vector',
      'canonical_id',
      'type',
      'risk_score',
      'latitude',
      'longitude',
    ];
    const missing = requiredColumns.filter((c) => !entityColumns.includes(c));
    if (missing.length > 0) {
      console.log('Missing required entity columns:', missing);
    } else {
      console.log('All required entity columns present');
    }

    const idleTxRes = await client.query(
      `
        SELECT pid, usename, state, query, state_change
        FROM pg_stat_activity
        WHERE state = 'idle in transaction'
          AND now() - state_change > interval '3 seconds'
      `,
    );
    console.log('Idle in transaction sessions (>3s):', idleTxRes.rows);

    const deadTupRes = await client.query(
      `
        SELECT relname, n_dead_tup
        FROM pg_stat_user_tables
        WHERE relname IN ('entities','documents','entity_mentions','entity_relationships')
      `,
    );
    console.log('Dead tuples:', deadTupRes.rows);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('pg_prod_diagnostics failed', err);
  process.exit(1);
});
