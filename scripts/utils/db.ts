import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..', '..');

/**
 * Get the path to the project root directory
 */
export function getProjectRoot(): string {
  return PROJECT_ROOT;
}

/**
 * Get the path to the database file
 */
export function getDbPath(): string {
  return process.env.DB_PATH || path.join(PROJECT_ROOT, 'epstein-archive.db');
}

/**
 * Create a database connection
 */
export function createDatabase(): Database.Database {
  const dbPath = getDbPath();
  console.log(`Using database: ${dbPath}`);
  return new Database(dbPath);
}

/**
 * Get the base media directory path
 */
export function getMediaRoot(): string {
  return path.join(PROJECT_ROOT, 'data/media');
}

/**
 * Get the text data directory path
 */
export function getTextRoot(): string {
  return path.join(PROJECT_ROOT, 'data/text');
}

/**
 * Convert a file system path to a database path format
 * Database paths use forward slashes and start with /data/
 */
export function toDbPath(absolutePath: string, basePath: string): string {
  const relativePath = path.relative(basePath, absolutePath);
  const dbPath = `/data/${relativePath}`;
  return dbPath.split(path.sep).join('/');
}

/**
 * Safely parse JSON with a fallback value
 */
export function safeParseJson<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
