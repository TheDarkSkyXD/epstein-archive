import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getApiPool } from './connection.js';

function resolveMigrationDir(): string {
  const cwdSourceDir = path.resolve(process.cwd(), 'src', 'server', 'db', 'postgres', 'migrations');
  if (fs.existsSync(cwdSourceDir)) return cwdSourceDir;

  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'postgres', 'migrations');
}

function getExpectedMigrationNames(): string[] {
  const migrationDir = resolveMigrationDir();
  if (!fs.existsSync(migrationDir)) {
    throw new Error(
      `[Migrator] Migration directory not found at ${migrationDir}. Refusing to boot without migration parity verification.`,
    );
  }

  return fs
    .readdirSync(migrationDir)
    .filter((name) => name.endsWith('.js'))
    .sort();
}

function canonicalMigrationName(name: string): string {
  return name.replace(/\.(cjs|mjs|js|ts)$/i, '');
}

async function getAppliedMigrationNames(): Promise<Set<string>> {
  try {
    const { rows } = await getApiPool().query<{ name: string }>(
      'SELECT name FROM pgmigrations ORDER BY run_on ASC',
    );
    return new Set(rows.map((row) => row.name));
  } catch (error: any) {
    throw new Error(
      `[Migrator] Failed to read pgmigrations. Run Postgres migrations before boot. ${error?.message || error}`,
    );
  }
}

// Historical call-site name retained. We fail closed on parity instead of silently no-oping.
export async function runMigrations() {
  const expectedFiles = getExpectedMigrationNames();
  const expected = expectedFiles.map(canonicalMigrationName);
  const applied = new Set(Array.from(await getAppliedMigrationNames()).map(canonicalMigrationName));
  const pending = expected.filter((name) => !applied.has(name));

  if (pending.length > 0) {
    throw new Error(
      `[Migrator] Pending Postgres migrations detected (${pending.length}): ${pending.join(', ')}. Run "pnpm db:migrate:pg" before starting the server.`,
    );
  }

  console.log(`[Migrator] Postgres migration parity OK (${expected.length} applied).`);
}
