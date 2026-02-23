import fs from 'fs';
import { getDb } from '../db/connection.js';

export async function validateStartup() {
  console.log('[Startup] Validating environment and configuration...');
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Environment Variables
  const requiredEnv = ['NODE_ENV'];
  requiredEnv.forEach((env) => {
    if (!process.env[env]) {
      errors.push(`Missing required environment variable: ${env}`);
    }
  });

  // 2. Paths
  const corpusPath = process.env.RAW_CORPUS_BASE_PATH;
  if (!corpusPath) {
    warnings.push(
      'RAW_CORPUS_BASE_PATH is not set. Using default hardcoded path (Risk of failure).',
    );
  } else if (!fs.existsSync(corpusPath)) {
    warnings.push(`RAW_CORPUS_BASE_PATH is set to ${corpusPath} but directory does not exist.`);
  }

  if (process.env.NODE_ENV === 'production' && process.env.DB_PATH) {
    warnings.push(
      `DB_PATH is set to ${process.env.DB_PATH} in production, but the application now uses Postgres. This value is ignored.`,
    );
  }

  // 3. Auth
  // Authentication is now forced to be enabled in all environments
  // The ENABLE_AUTH environment variable is no longer used

  // 4. Schema Integrity
  try {
    const db = getDb();
    const existingTablesRaw = await db
      .prepare("SELECT tablename as name FROM pg_catalog.pg_tables WHERE schemaname = 'public'")
      .all();
    const existingTables = existingTablesRaw.map((r: any) => r.name);

    // Check critical tables
    if (!existingTables.includes('entities')) errors.push('Missing critical table: entities');
    if (!existingTables.includes('documents')) errors.push('Missing critical table: documents');

    const strictSchema =
      process.env.STRICT_SCHEMA === '1' ||
      process.env.STRICT_SCHEMA === 'true' ||
      process.env.NODE_ENV === 'production';
    if (strictSchema) {
      const requiredTables = [
        'entity_mentions',
        'investigations',
        'document_pages',
        'redaction_spans',
        'claim_triples',
        'document_sentences',
      ];
      for (const table of requiredTables) {
        if (!existingTables.includes(table)) {
          errors.push(`Missing required Postgres table for strict mode: ${table}`);
        }
      }

      const requiredColumns = [
        ['documents', 'original_file_id'],
        ['documents', 'has_failed_redactions'],
        ['documents', 'failed_redaction_count'],
        ['entity_mentions', 'doc_red_flag_rating'],
        ['entity_mentions', 'doc_date_created'],
        ['investigations', 'collaborator_ids'],
      ] as const;
      for (const [table, column] of requiredColumns) {
        const col = (await db
          .prepare(
            `SELECT 1
             FROM information_schema.columns
             WHERE table_schema='public'
               AND table_name = ?
               AND column_name = ?
             LIMIT 1`,
          )
          .get(table, column)) as any;
        if (!col) {
          errors.push(`Missing required Postgres column for strict mode: ${table}.${column}`);
        }
      }
    }

    // Check for migrations table
    if (!existingTables.includes('pgmigrations')) {
      warnings.push('pgmigrations table missing. Migrations may not have run.');
    }
  } catch (e: any) {
    errors.push(`Database connection failed during validation: ${e.message}`);
  }

  // Report
  if (warnings.length > 0) {
    console.warn('--- Startup Warnings ---');
    warnings.forEach((w) => console.warn(`[WARN] ${w}`));
    console.warn('------------------------');
  }

  if (errors.length > 0) {
    console.error('--- Startup Errors ---');
    errors.forEach((e) => console.error(`[ERR] ${e}`));
    console.error('----------------------');
    throw new Error('Startup validation failed. See errors above.');
  }

  console.log('[Startup] Validation passed.');
}
