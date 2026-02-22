import Database from 'better-sqlite3';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const PG_URL = process.env.DATABASE_URL;

if (!PG_URL) {
  console.error('❌ Error: DATABASE_URL is required.');
  process.exit(1);
}

const sqlite = new Database(DB_PATH, { readonly: true });
const pgPool = new pg.Pool({ connectionString: PG_URL });

const BATCH_SIZE = 1000;

async function backfillTable(tableName: string, pgTableName: string, columns: string[]) {
  console.log(`📦 Backfilling ${tableName} -> ${pgTableName}...`);

  const countRow = sqlite.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
  if (!countRow) {
    console.log(`   ⚠ Table ${tableName} is empty or missing count.`);
    return;
  }
  const total = countRow.count;
  let processed = 0;

  const colString = columns.join(', ');

  let offset = 0;
  const hasId = columns.includes('id');
  let lastId: any = null;

  while (processed < total) {
    let rows: any[];
    if (hasId) {
      if (lastId !== null) {
        rows = sqlite
          .prepare(`SELECT * FROM ${tableName} WHERE id > ? ORDER BY id ASC LIMIT ${BATCH_SIZE}`)
          .all(lastId) as any[];
      } else {
        rows = sqlite
          .prepare(`SELECT * FROM ${tableName} ORDER BY id ASC LIMIT ${BATCH_SIZE}`)
          .all() as any[];
      }
      if (rows.length > 0) lastId = rows[rows.length - 1].id;
    } else {
      rows = sqlite
        .prepare(`SELECT * FROM ${tableName} LIMIT ${BATCH_SIZE} OFFSET ${offset}`)
        .all() as any[];
    }

    if (rows.length === 0) break;

    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');

      // Build a multi-row insert for performance
      const values: any[] = [];
      const valuePlaceholders: string[] = [];

      rows.forEach((row, rowIndex) => {
        const rowPlaceholders = columns.map((col, colIndex) => {
          const val = (row as any)[col];
          let finalVal = val;
          if (typeof finalVal === 'string') {
            finalVal = finalVal.replace(/\x00/g, '');
          }

          // Handle JSON/Object types for Postgres
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
            finalVal = val ? (typeof val === 'string' ? val : JSON.stringify(val)) : null;
          }

          values.push(finalVal);
          return `$${values.length}`;
        });
        valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
      });

      const insertSql = `INSERT INTO ${pgTableName} (${colString}) VALUES ${valuePlaceholders.join(', ')} ON CONFLICT DO NOTHING`;
      await client.query(insertSql, values);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.warn(
        `\n⚠ Batch failed at offset/id, falling back to concurrent single-row inserts...`,
      );
      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (row, cIndex) => {
            const rIndex = i + cIndex;
            try {
              const singleValues: any[] = [];
              const singlePlaceholders = columns.map((col) => {
                let val = (row as any)[col];
                if (typeof val === 'string') {
                  val = val.replace(/\x00/g, '');
                }
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
                  val = val ? (typeof val === 'string' ? val : JSON.stringify(val)) : null;
                }
                singleValues.push(val);
                return `$${singleValues.length}`;
              });
              const singleSql = `INSERT INTO ${pgTableName} (${colString}) VALUES (${singlePlaceholders.join(', ')}) ON CONFLICT DO NOTHING`;
              await pgPool.query(singleSql, singleValues);
            } catch (singleErr: any) {
              if (rIndex < 5) console.warn(`   Skipped invalid row: ${singleErr.message}`);
            }
          }),
        );
      }
    } finally {
      client.release();
    }

    processed += rows.length;
    offset += rows.length;
    process.stdout.write(
      `   Progress: ${processed}/${total} (${((processed / total) * 100).toFixed(1)}%)\r`,
    );
  }
  console.log(`\n✅ Finished backfilling ${tableName}.`);
}

async function runBackfill() {
  console.log('🏁 Starting Bulk Backfill (SQLite -> Postgres)...');

  try {
    // 1. Core Lookups
    await backfillTable('users', 'users', [
      'id',
      'username',
      'email',
      'role',
      'password_hash',
      'created_at',
      'last_login_at',
    ]);
    await backfillTable('audit_log', 'audit_log', [
      'id',
      'timestamp',
      'actor_id',
      'action',
      'target_type',
      'target_id',
      'payload_json',
      'ip_address',
      'user_agent',
    ]);
    await backfillTable('evidence_types', 'evidence_types', ['id', 'type_name', 'description']);

    // 2. Main Entities & Documents
    await backfillTable('documents', 'documents', [
      'id',
      'file_name',
      'file_path',
      'title',
      'content',
      'mime_type',
      'file_size_bytes',
      'page_count',
      'is_sensitive',
      'signal_score',
      'processing_status',
      'processing_error',
      'processing_attempts',
      'worker_id',
      'lease_expires_at',
      'last_processed_at',
      'created_at',
      'analyzed_at',
      'source_collection',
      'content_hash',
    ]);
    await backfillTable('entities', 'entities', [
      'id',
      'full_name',
      'entity_type',
      'type',
      'entity_category',
      'risk_level',
      'red_flag_rating',
      'red_flag_description',
      'bio',
      'birth_date',
      'death_date',
      'aliases',
      'notes',
      'primary_role',
      'mentions',
      'connections_summary',
      'canonical_id',
      'junk_tier',
      'quarantine_status',
      'entity_metadata_json',
      'is_vip',
      'created_at',
      'updated_at',
    ]);

    // 3. Junctions & Relations
    await backfillTable('entity_evidence_types', 'entity_evidence_types', [
      'entity_id',
      'evidence_type_id',
    ]);
    await backfillTable('entity_mentions', 'entity_mentions', [
      'id',
      'entity_id',
      'document_id',
      'span_id',
      'start_offset',
      'end_offset',
      'surface_text',
      'mention_type',
      'mention_context',
      'confidence',
      'ingest_run_id',
      'page_number',
      'position_start',
      'position_end',
      'significance_score',
      'created_at',
    ]);
    await backfillTable('entity_relationships', 'entity_relationships', [
      'source_entity_id',
      'target_entity_id',
      'relationship_type',
      'strength',
      'confidence',
      'proximity_score',
      'risk_score',
      'first_seen_at',
      'last_seen_at',
      'ingest_run_id',
      'evidence_pack_json',
      'created_at',
      'updated_at',
    ]);

    // 4. Investigations
    await backfillTable('investigations', 'investigations', [
      'id',
      'uuid',
      'title',
      'description',
      'status',
      'priority',
      'owner_id',
      'created_by',
      'assigned_to',
      'created_at',
      'updated_at',
      'metadata_json',
    ]);
    await backfillTable('investigation_evidence', 'investigation_evidence', [
      'investigation_id',
      'document_id',
      'added_by',
      'added_at',
      'notes',
    ]);

    // 5. Media & Assets
    await backfillTable('media_albums', 'media_albums', [
      'id',
      'name',
      'description',
      'cover_image_id',
      'created_at',
      'date_modified',
      'is_sensitive',
    ]);
    await backfillTable('media_items', 'media_items', [
      'id',
      'entity_id',
      'document_id',
      'album_id',
      'media_type',
      'file_path',
      'thumbnail_path',
      'original_url',
      'title',
      'caption',
      'description',
      'verification_status',
      'red_flag_rating',
      'is_sensitive',
      'exif_json',
      'metadata_json',
      'created_at',
    ]);
    await backfillTable('media_tags', 'media_tags', ['id', 'name', 'category', 'color']);
    await backfillTable('media_album_items', 'media_album_items', [
      'album_id',
      'media_item_id',
      'order',
      'added_at',
    ]);

    // 6. Forensic Data
    await backfillTable('financial_transactions', 'financial_transactions', [
      'id',
      'from_entity',
      'to_entity',
      'amount',
      'currency',
      'transaction_date',
      'transaction_type',
      'method',
      'risk_level',
      'description',
      'investigation_id',
      'source_document_id',
      'metadata_json',
      'created_at',
    ]);
    await backfillTable('timeline_events', 'timeline_events', [
      'id',
      'entity_id',
      'event_date',
      'event_description',
      'event_type',
      'document_id',
      'created_at',
    ]);
    await backfillTable('ingest_runs', 'ingest_runs', [
      'id',
      'status',
      'git_commit',
      'pipeline_version',
      'agentic_enabled',
      'notes',
      'created_at',
      'finished_at',
    ]);
    await backfillTable('claim_triples', 'claim_triples', [
      'id',
      'subject_entity_id',
      'predicate',
      'object_entity_id',
      'object_text',
      'document_id',
      'sentence_id',
      'confidence',
      'modality',
      'evidence_json',
      'created_at',
    ]);

    // 7. Granular Provenance
    await backfillTable('document_pages', 'document_pages', [
      'id',
      'document_id',
      'page_number',
      'content',
      'signal_score',
      'ocr_quality_score',
      'text_source',
      'created_at',
    ]);
    await backfillTable('document_sentences', 'document_sentences', [
      'id',
      'document_id',
      'page_id',
      'sentence_text',
      'sentence_index',
      'signal_score',
      'is_boilerplate',
      'created_at',
    ]);

    // 8. Advanced Graph
    await backfillTable('document_spans', 'document_spans', [
      'id',
      'document_id',
      'page_num',
      'span_start_char',
      'span_end_char',
      'raw_text',
      'cleaned_text',
      'ocr_confidence',
      'layout_json',
    ]);

    console.log('\n🔄 Resetting sequences...');
    const tablesWithSerials = [
      'audit_log',
      'evidence_types',
      'documents',
      'entities',
      'investigations',
      'media_albums',
      'media_tags',
      'financial_transactions',
      'timeline_events',
      'claim_triples',
      'document_pages',
      'document_sentences',
    ];
    for (const table of tablesWithSerials) {
      try {
        await pgPool.query(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1)) FROM ${table}`,
        );
      } catch (seqErr: any) {
        console.warn(`   ⚠ Could not reset sequence for ${table}:`, seqErr.message);
      }
    }

    console.log('🎉 Bulk Backfill COMPLETED successfully.');
  } catch (err) {
    console.error('\n❌ Backfill failed:', err);
    process.exit(1);
  } finally {
    sqlite.close();
    await pgPool.end();
  }
}

runBackfill();
