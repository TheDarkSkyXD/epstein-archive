/**
 * CANONICAL DATA REVISION TOKEN
 *
 * Single source of truth for dataset revision
 * Used by all caches, prefetch, and invalidation logic
 */

import Database from 'better-sqlite3';
import crypto from 'crypto';

interface RevisionComponents {
  latestIngestRunId: string;
  rulesetVersion: string;
  cleanerVersion: string;
  lastMutationTimestamp: string;
}

interface RevisionToken {
  token: string;
  components: RevisionComponents;
  generatedAt: string;
}

export class DatasetRevisionManager {
  private db: any;
  private cachedToken: RevisionToken | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5000; // 5s cache to avoid DB hits

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Get canonical revision token
   * Cached for 5s to avoid excessive DB queries
   */
  getRevisionToken(): RevisionToken {
    const now = Date.now();

    if (this.cachedToken && now < this.cacheExpiry) {
      return this.cachedToken;
    }

    const components = this.getRevisionComponents();
    const token = this.computeToken(components);

    this.cachedToken = {
      token,
      components,
      generatedAt: new Date().toISOString(),
    };
    this.cacheExpiry = now + this.CACHE_TTL;

    return this.cachedToken;
  }

  /**
   * Get revision components from database and environment
   */
  private getRevisionComponents(): RevisionComponents {
    // Get latest ingest run ID
    const latestIngest = this.db
      .prepare(
        `
      SELECT ingest_run_id 
      FROM entity_mentions 
      WHERE ingest_run_id IS NOT NULL 
      ORDER BY created_at DESC 
      LIMIT 1
    `,
      )
      .get() as { ingest_run_id: string } | undefined;

    const latestIngestRunId =
      latestIngest?.ingest_run_id || process.env.LATEST_INGEST_RUN_ID || 'default';

    // Get last mutation timestamp (max updated_at across critical tables)
    const lastMutation = this.db
      .prepare(
        `
      SELECT MAX(timestamp) as max_ts FROM (
        SELECT MAX(created_at) as timestamp FROM entities
        UNION ALL
        SELECT MAX(created_at) as timestamp FROM entity_mentions
        UNION ALL
        SELECT MAX(created_at) as timestamp FROM documents
      )
    `,
      )
      .get() as { max_ts: string } | undefined;

    const lastMutationTimestamp = lastMutation?.max_ts || new Date().toISOString();

    // Get versions from environment
    const rulesetVersion = process.env.RULESET_VERSION || 'v1';
    const cleanerVersion = process.env.CLEANER_VERSION || 'v1';

    return {
      latestIngestRunId,
      rulesetVersion,
      cleanerVersion,
      lastMutationTimestamp,
    };
  }

  /**
   * Compute deterministic token from components
   */
  private computeToken(components: RevisionComponents): string {
    const payload = [
      components.latestIngestRunId,
      components.rulesetVersion,
      components.cleanerVersion,
      components.lastMutationTimestamp,
    ].join(':');

    return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16);
  }

  /**
   * Invalidate cache (force recomputation on next call)
   */
  invalidate(): void {
    this.cachedToken = null;
    this.cacheExpiry = 0;
  }

  /**
   * Get human-readable revision info
   */
  getRevisionInfo(): RevisionComponents & { token: string } {
    const rev = this.getRevisionToken();
    return {
      token: rev.token,
      ...rev.components,
    };
  }
}

// Singleton instance (will be initialized with DB in server startup)
let revisionManager: DatasetRevisionManager | null = null;

export function initRevisionManager(db: any): void {
  revisionManager = new DatasetRevisionManager(db);
}

export function getRevisionManager(): DatasetRevisionManager {
  if (!revisionManager) {
    throw new Error('RevisionManager not initialized. Call initRevisionManager(db) first.');
  }
  return revisionManager;
}

export function getRevisionToken(): string {
  return getRevisionManager().getRevisionToken().token;
}

export function getRevisionInfo(): RevisionComponents & { token: string } {
  return getRevisionManager().getRevisionInfo();
}
