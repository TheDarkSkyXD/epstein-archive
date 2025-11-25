import { databaseService } from './DatabaseService';
import { Person, SearchFilters, SortOption } from '../types';

export class DatabaseDataService {
  private static instance: DatabaseDataService;
  private searchCache: Map<string, { results: Person[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): DatabaseDataService {
    if (!DatabaseDataService.instance) {
      DatabaseDataService.instance = new DatabaseDataService();
    }
    return DatabaseDataService.instance;
  }

  /**
   * Get paginated entities with filtering and sorting
   * Uses database queries instead of loading all data into memory
   */
  async getEntities(
    page: number = 1,
    limit: number = 24,
    filters?: SearchFilters,
    sortBy?: SortOption
  ): Promise<{ entities: Person[]; total: number }> {
    try {
      // Create cache key based on parameters
      const cacheKey = JSON.stringify({ page, limit, filters, sortBy });
      const cached = this.searchCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return { entities: cached.results, total: cached.results.length };
      }

      // Query database instead of loading JSON
      const result = await databaseService.getEntities(page, limit, filters, sortBy);
      
      // Cache the results
      this.searchCache.set(cacheKey, { results: result.entities, timestamp: Date.now() });
      
      return result;
    } catch (error) {
      console.error('Error fetching entities from database:', error);
      throw new Error(`Failed to fetch entities: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get single entity by ID
   */
  async getEntityById(id: string): Promise<Person | null> {
    try {
      return await databaseService.getEntityById(id);
    } catch (error) {
      console.error(`Error fetching entity ${id} from database:`, error);
      throw new Error(`Failed to fetch entity: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search entities using full-text search
   */
  async searchEntities(
    query: string,
    limit: number = 50
  ): Promise<{ entities: Person[]; documents: any[] }> {
    try {
      if (!query || query.trim().length === 0) {
        return { entities: [], documents: [] };
      }

      const searchResults = await databaseService.search(query.trim(), limit);
      return searchResults;
    } catch (error) {
      console.error('Error searching entities:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get statistics for dashboard
   */
  async getStatistics(): Promise<{
    totalEntities: number;
    totalDocuments: number;
    totalMentions: number;
    averageSpiceRating: number;
    topRoles: { role: string; count: number }[];
    likelihoodDistribution: { level: string; count: number }[];
  }> {
    try {
      return await databaseService.getStatistics();
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw new Error(`Failed to fetch statistics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get entities by likelihood level
   */
  async getEntitiesByLikelihood(
    levels: ('HIGH' | 'MEDIUM' | 'LOW')[],
    page: number = 1,
    limit: number = 24
  ): Promise<{ entities: any[]; total: number }> {
    const filters: SearchFilters = {
      likelihood: 'all',
      role: 'all',
      status: 'all',
      minMentions: 0,
      likelihoodScore: levels
    };
    
    return this.getEntities(page, limit, filters, 'spice');
  }

  /**
   * Get top entities by spice rating
   */
  async getTopSpicyEntities(
    page: number = 1,
    limit: number = 24
  ): Promise<{ entities: any[]; total: number }> {
    const filters: SearchFilters = {
      likelihood: 'all',
      role: 'all',
      status: 'all',
      minMentions: 0
    };
    
    return this.getEntities(page, limit, filters, 'spice');
  }

  /**
   * Get entities by role
   */
  async getEntitiesByRole(
    roles: string[],
    page: number = 1,
    limit: number = 24
  ): Promise<{ entities: any[]; total: number }> {
    const filters: SearchFilters = {
      likelihood: 'all',
      role: 'all',
      status: 'all',
      minMentions: 0,
      evidenceTypes: roles
    };
    
    return this.getEntities(page, limit, filters, 'mentions');
  }

  /**
   * Get recently updated entities
   */
  async getRecentEntities(
    page: number = 1,
    limit: number = 24
  ): Promise<{ entities: any[]; total: number }> {
    return this.getEntities(page, limit, undefined, 'recent');
  }

  /**
   * Get entities with most mentions
   */
  async getMostMentionedEntities(
    page: number = 1,
    limit: number = 24
  ): Promise<{ entities: Person[]; total: number }> {
    return this.getEntities(page, limit, undefined, 'mentions');
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
    console.log('Search cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ key: string; timestamp: number; age: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.searchCache.entries()).map(([key, value]) => ({
      key,
      timestamp: value.timestamp,
      age: now - value.timestamp
    }));

    return {
      size: this.searchCache.size,
      entries
    };
  }

  /**
   * Check if database is properly initialized
   */
  async isDatabaseReady(): Promise<boolean> {
    try {
      const stats = await databaseService.getStatistics();
      return stats.totalEntities > 0;
    } catch (error) {
      console.error('Database readiness check failed:', error);
      return false;
    }
  }

  /**
   * Get database size for monitoring
   */
  getDatabaseSize(): number {
    return databaseService.getDatabaseSize();
  }

  /**
   * Export data for backup or analysis
   */
  async exportData(
    format: 'json' | 'csv' = 'json',
    filters?: SearchFilters
  ): Promise<string> {
    try {
      // Get all entities (no pagination for export)
      const { entities } = await databaseService.getEntities(1, 100000, filters, 'name');
      
      if (format === 'csv') {
        return this.convertToCSV(entities);
      } else {
        return JSON.stringify(entities, null, 2);
      }
    } catch (error) {
      console.error('Data export failed:', error);
      throw new Error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert entities to CSV format
   */
  private convertToCSV(entities: any[]): string {
    const headers = [
      'ID',
      'Full Name',
      'Primary Role',
      'Secondary Roles',
      'Likelihood Level',
      'Mentions',
      'Current Status',
      'Connections Summary',
      'Spice Rating',
      'Spice Score',
      'File References Count',
      'Created At',
      'Updated At'
    ];

    const rows = entities.map(entity => [
      entity.id,
      `"${entity.fullName.replace(/"/g, '""')}"`,
      `"${(entity.primaryRole || '').replace(/"/g, '""')}"`,
      `"${(entity.secondaryRoles || []).join('; ').replace(/"/g, '""')}"`,
      entity.likelihoodLevel || '',
      entity.mentions || 0,
      `"${(entity.currentStatus || '').replace(/"/g, '""')}"`,
      `"${(entity.connectionsSummary || '').replace(/"/g, '""')}"`,
      entity.spiceRating || 0,
      entity.spiceScore || 0,
      (entity.fileReferences || []).length,
      entity.createdAt || '',
      entity.updatedAt || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

export const databaseDataService = DatabaseDataService.getInstance();