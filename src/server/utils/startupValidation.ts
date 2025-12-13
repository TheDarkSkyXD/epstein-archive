import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection.js';

export function validateStartup() {
  console.log('[Startup] Validating environment and configuration...');
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Environment Variables
  const requiredEnv = ['NODE_ENV'];
  requiredEnv.forEach(env => {
    if (!process.env[env]) {
      errors.push(`Missing required environment variable: ${env}`);
    }
  });

  // 2. Paths
  const corpusPath = process.env.RAW_CORPUS_BASE_PATH;
  if (!corpusPath) {
    warnings.push('RAW_CORPUS_BASE_PATH is not set. Using default hardcoded path (Risk of failure).');
  } else if (!fs.existsSync(corpusPath)) {
    warnings.push(`RAW_CORPUS_BASE_PATH is set to ${corpusPath} but directory does not exist.`);
  }

  const dbPath = process.env.DB_PATH;
  if (dbPath && !fs.existsSync(dbPath) && process.env.NODE_ENV === 'production') {
    // In production, we expect the DB to exist usually, unless we are bootstrapping
    warnings.push(`DB_PATH is set to ${dbPath} but file does not exist. A new DB will be created.`);
  }

  // 3. Auth
  if (process.env.ENABLE_AUTH !== 'true') {
    if (process.env.NODE_ENV === 'production') {
      warnings.push('SECURITY WARNING: ENABLE_AUTH is not set to true. Authentication is DISABLED.');
    } else {
      console.log('[Startup] Auth is disabled (dev mode).');
    }
  }

  // 4. Schema Integrity
  try {
    const db = getDb();
    const requiredTables = [
      'entities', 'documents', 'relationships', 'investigations', 
      'evidence', 'users', 'audit_log'
    ];
    // Note: 'relationships' might be 'entity_relationships' depending on schema version. 
    // We check what we have.
    
    const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r: any) => r.name);
    
    // Check critical tables
    if (!existingTables.includes('entities')) errors.push('Missing critical table: entities');
    if (!existingTables.includes('documents')) errors.push('Missing critical table: documents');
    
    // Check for migrations table
    if (!existingTables.includes('schema_migrations')) {
      warnings.push('schema_migrations table missing. Migrations may not have run.');
    }

  } catch (e: any) {
    errors.push(`Database connection failed during validation: ${e.message}`);
  }

  // Report
  if (warnings.length > 0) {
    console.warn('--- Startup Warnings ---');
    warnings.forEach(w => console.warn(`[WARN] ${w}`));
    console.warn('------------------------');
  }

  if (errors.length > 0) {
    console.error('--- Startup Errors ---');
    errors.forEach(e => console.error(`[ERR] ${e}`));
    console.error('----------------------');
    throw new Error('Startup validation failed. See errors above.');
  }

  console.log('[Startup] Validation passed.');
}
