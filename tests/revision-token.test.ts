/**
 * REVISION TOKEN TESTS
 *
 * Verifies revision token changes when components change
 */

import Database from 'better-sqlite3';
import { DatasetRevisionManager } from '../src/server/revisionManager';

describe('Canonical Revision Token', () => {
  let db: Database.Database;
  let manager: DatasetRevisionManager;

  beforeAll(() => {
    db = new Database(':memory:');

    // Create minimal schema
    db.exec(`
      CREATE TABLE entities (id INTEGER PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE entity_mentions (id INTEGER PRIMARY KEY, ingest_run_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE documents (id INTEGER PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    `);

    manager = new DatasetRevisionManager(db);
  });

  afterAll(() => {
    db.close();
  });

  test('Token is deterministic for same components', () => {
    const token1 = manager.getRevisionToken();
    const token2 = manager.getRevisionToken();

    expect(token1.token).toBe(token2.token);
  });

  test('Token changes when data mutates', async () => {
    const token1 = manager.getRevisionToken();

    // Wait to ensure timestamp changes
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Insert new entity (changes last_mutation_timestamp)
    db.prepare('INSERT INTO entities DEFAULT VALUES').run();

    // Invalidate cache
    manager.invalidate();

    const token2 = manager.getRevisionToken();

    // Tokens should be different
    expect(token1.token).not.toBe(token2.token);
  });

  test('Token includes all components', () => {
    const info = manager.getRevisionInfo();

    expect(info.token).toBeDefined();
    expect(info.latestIngestRunId).toBeDefined();
    expect(info.rulesetVersion).toBeDefined();
    expect(info.cleanerVersion).toBeDefined();
    expect(info.lastMutationTimestamp).toBeDefined();
  });

  test('Token is 16 characters (SHA-256 truncated)', () => {
    const token = manager.getRevisionToken();
    expect(token.token).toHaveLength(16);
  });
});
