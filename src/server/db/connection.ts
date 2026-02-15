import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Use 'any' for the database instance type to avoid TypeScript namespace issues
// with better-sqlite3 in this environment
let dbInstance: any = null;

function resolveDefaultDbPath(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const serverRoot = path.resolve(path.dirname(currentFile), '..', '..', '..');
  return path.join(serverRoot, 'epstein-archive.db');
}

export function getDb(): any {
  if (dbInstance) return dbInstance;

  // Use DB_PATH from env or default to repository root.
  // Avoid process.cwd()-based ambiguity when scripts run from different directories.
  const DB_PATH = process.env.DB_PATH || resolveDefaultDbPath();

  // Note: better-sqlite3 uses blocking IO by default but is very fast.
  dbInstance = new Database(DB_PATH, {
    timeout: 30000,
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
  });

  // Performance Pragmas
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('synchronous = NORMAL');
  dbInstance.pragma('temp_store = MEMORY');

  // Optional: Optimize memory mapping
  // dbInstance.pragma('mmap_size = 30000000000');

  return dbInstance;
}
