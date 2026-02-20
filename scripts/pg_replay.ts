import Database from 'better-sqlite3';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const PG_URL = process.env.DATABASE_URL;

if (!PG_URL) {
  console.error('❌ Error: DATABASE_URL is required.');
  process.exit(1);
}

const sqlite = new Database(DB_PATH, { readonly: false });
const pgPool = new pg.Pool({ connectionString: PG_URL });

const POLL_INTERVAL_MS = 1000;
const BATCH_SIZE = 1000;

async function getWatermark(tableName: string): Promise<number> {
  const res = await pgPool.query(
    'INSERT INTO migration_watermarks (source_table, last_record_id) VALUES ($1, 0) ON CONFLICT (source_table) DO NOTHING RETURNING last_record_id',
    [tableName],
  );
  if (res.rows.length === 0) {
    const fetch = await pgPool.query(
      'SELECT last_record_id FROM migration_watermarks WHERE source_table = $1',
      [tableName],
    );
    return parseInt(fetch.rows[0].last_record_id);
  }
  return parseInt(res.rows[0].last_record_id);
}

async function replayBatch(tableName: string) {
  const currentWatermark = await getWatermark(tableName);

  const pending = sqlite
    .prepare(
      `
    SELECT * FROM migration_write_log 
    WHERE table_name = ? AND id > ?
    ORDER BY id ASC 
    LIMIT ?
  `,
    )
    .all(tableName, currentWatermark, BATCH_SIZE) as any[];

  if (pending.length === 0) return 0;

  console.log(
    `🔄 [${tableName}] Replaying ${pending.length} changes (from ID ${currentWatermark + 1})...`,
  );

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    let lastId = currentWatermark;
    for (const entry of pending) {
      const { id, record_id, operation } = entry;

      if (operation === 'DELETE') {
        if (tableName === 'entity_relationships') {
          const [src, tgt, type] = record_id.split('|');
          await client.query(
            `DELETE FROM ${tableName} WHERE source_entity_id = $1 AND target_entity_id = $2 AND relationship_type = $3`,
            [src, tgt, type],
          );
        } else {
          await client.query(`DELETE FROM ${tableName} WHERE id = $1`, [record_id]);
        }
      } else {
        let row: any;
        if (tableName === 'entity_relationships') {
          const [src, tgt, type] = record_id.split('|');
          row = sqlite
            .prepare(
              `
                SELECT * FROM ${tableName} 
                WHERE source_entity_id = ? AND target_entity_id = ? AND relationship_type = ?
            `,
            )
            .get(src, tgt, type);
        } else {
          row = sqlite.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(record_id);
        }

        if (row) {
          const columns = Object.keys(row);
          const values = Object.values(row).map((val, i) => {
            let finalVal = val;
            if (typeof finalVal === 'string') {
              finalVal = finalVal.replace(/\x00/g, '');
            }
            const col = columns[i];
            if (
              col.endsWith('_json') ||
              col === 'aliases' ||
              col === 'exif_json' ||
              col === 'payload_json' ||
              col === 'evidence_pack_json' ||
              col === 'evidence_json' ||
              col === 'layout_json' ||
              col === 'feature_vector_json' ||
              col === 'details_json'
            ) {
              return finalVal
                ? typeof finalVal === 'string'
                  ? finalVal
                  : JSON.stringify(finalVal)
                : null;
            }
            return finalVal;
          });

          const colString = columns.join(', ');
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

          let conflictClause =
            'ON CONFLICT (id) DO UPDATE SET ' +
            columns.map((c, i) => `${c} = EXCLUDED.${c}`).join(', ');

          if (tableName === 'entity_relationships') {
            conflictClause =
              'ON CONFLICT (source_entity_id, target_entity_id, relationship_type) DO UPDATE SET ' +
              columns.map((c, i) => `${c} = EXCLUDED.${c}`).join(', ');
          }

          const upsertSql = `INSERT INTO ${tableName} (${colString}) VALUES (${placeholders}) ${conflictClause}`;
          await client.query(upsertSql, values);
        }
      }
      lastId = id;
    }

    // 1. Update PG Authority Watermark (Inside transaction)
    await client.query(
      'UPDATE migration_watermarks SET last_record_id = $1, last_processed_at = NOW() WHERE source_table = $2',
      [lastId, tableName],
    );

    await client.query('COMMIT');

    // 2. Best-effort diagnostic update in SQLite (Outside PG transaction)
    sqlite
      .prepare(
        'UPDATE migration_write_log SET processed_at = CURRENT_TIMESTAMP WHERE table_name = ? AND id <= ? AND processed_at IS NULL',
      )
      .run(tableName, lastId);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`❌ [${tableName}] Failed to replay batch:`, err);
    throw err;
  } finally {
    client.release();
  }

  return pending.length;
}

async function startReplay() {
  console.log('🚀 Hardened Postgres Replay Service Started.');
  const tables = [
    'entities',
    'documents',
    'entity_mentions',
    'entity_relationships',
    'investigations',
    'media_items',
    'financial_transactions',
  ];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      let totalProcessed = 0;
      for (const table of tables) {
        totalProcessed += await replayBatch(table);
      }

      if (totalProcessed === 0) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (err) {
      console.error('❌ Replay loop error:', err);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS * 5));
    }
  }
}

startReplay();
