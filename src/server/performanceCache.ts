/**
 * SERVER-SIDE CACHING LAYER
 *
 * Short-TTL (30-60s) cache for hot paths:
 * - Top 250 entities
 * - Entity overview DTOs
 * - First page of entity documents
 *
 * Keyed by ingest_run_id + RULESET_VERSION for safe invalidation
 */

import NodeCache from 'node-cache';

interface CacheOptions {
  ttl?: number; // seconds
  checkperiod?: number; // seconds
}

class PerformanceCache {
  private cache: NodeCache;
  private cacheVersion: string;

  constructor(options: CacheOptions = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || 60, // 60s default
      checkperiod: options.checkperiod || 120, // 2min cleanup
      useClones: false, // Don't clone objects (faster, but be careful with mutations)
    });

    // Cache version = ingest_run_id + RULESET_VERSION
    // This ensures cache is invalidated when data changes
    this.cacheVersion = this.getCacheVersion();
  }

  private getCacheVersion(): string {
    // In production, this would come from environment or database
    const ingestRunId = process.env.INGEST_RUN_ID || 'default';
    const rulesetVersion = process.env.RULESET_VERSION || 'v1';
    return `${ingestRunId}:${rulesetVersion}`;
  }

  private makeKey(key: string): string {
    return `${this.cacheVersion}:${key}`;
  }

  /**
   * Get cached value
   */
  get<T>(key: string): T | undefined {
    return this.cache.get<T>(this.makeKey(key));
  }

  /**
   * Set cached value
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(this.makeKey(key), value, ttl || 0);
  }

  /**
   * Delete cached value
   */
  del(key: string): number {
    return this.cache.del(this.makeKey(key));
  }

  /**
   * Flush all cache
   */
  flush(): void {
    this.cache.flushAll();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Cache top entities (homepage)
   */
  cacheTopEntities(entities: any[], ttl = 60): void {
    this.set('top_entities', entities, ttl);
  }

  getTopEntities(): any[] | undefined {
    return this.get<any[]>('top_entities');
  }

  /**
   * Cache entity overview DTO
   */
  cacheEntityOverview(entityId: string, data: any, ttl = 60): void {
    this.set(`entity:${entityId}:overview`, data, ttl);
  }

  getEntityOverview(entityId: string): any | undefined {
    return this.get(`entity:${entityId}:overview`);
  }

  /**
   * Cache entity documents (first page)
   */
  cacheEntityDocuments(entityId: string, documents: any[], ttl = 60): void {
    this.set(`entity:${entityId}:documents:page1`, documents, ttl);
  }

  getEntityDocuments(entityId: string): any[] | undefined {
    return this.get<any[]>(`entity:${entityId}:documents:page1`);
  }

  /**
   * Cache search results
   */
  cacheSearchResults(query: string, results: any[], ttl = 30): void {
    // Normalize query for cache key
    const normalizedQuery = query.toLowerCase().trim();
    this.set(`search:${normalizedQuery}`, results, ttl);
  }

  getSearchResults(query: string): any[] | undefined {
    const normalizedQuery = query.toLowerCase().trim();
    return this.get<any[]>(`search:${normalizedQuery}`);
  }
}

// Singleton instance
export const performanceCache = new PerformanceCache({
  ttl: 60, // 60s default
  checkperiod: 120, // 2min cleanup
});

// Export class for testing
export { PerformanceCache };
