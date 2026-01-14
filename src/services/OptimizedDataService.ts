import { Person } from '../types';
import { SearchFilters, PaginatedResponse } from './optimizedDataLoader';
export type { SearchFilters, PaginatedResponse } from './optimizedDataLoader';
import { apiClient } from './apiClient';

export class OptimizedDataService {
  private static instance: OptimizedDataService;
  private isInitialized: boolean = false;
  private statsCache: any | null = null;
  private readonly BASE_PAGE_SIZE = 24; // Base page size for grid layout
  private cache = new Map<string, any>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private prefetchCache = new Map<string, Promise<PaginatedResponse>>(); // For prefetching next pages

  static getInstance(): OptimizedDataService {
    if (!OptimizedDataService.instance) {
      OptimizedDataService.instance = new OptimizedDataService();
    }
    return OptimizedDataService.instance;
  }

  // Calculate optimal page size based on viewport
  private getPageSize(): number {
    // Adjust page size based on screen width for better performance
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) return 12; // Mobile: 12 items
      if (window.innerWidth < 1024) return 18; // Tablet: 18 items
      return this.BASE_PAGE_SIZE; // Desktop: 24 items
    }
    return this.BASE_PAGE_SIZE;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Test API connection
      const health = await apiClient.healthCheck();
      if (!(health.status === 'ok' || health.status === 'healthy')) {
        throw new Error('API server not ready');
      }

      this.isInitialized = true;
      console.log('OptimizedDataService initialized with API backend');
    } catch (error) {
      console.warn('API backend not available, falling back to JSON data files:', error);

      // Try to load from JSON files as fallback
      try {
        await this.loadDataFromJsonFiles();
        this.isInitialized = true;
        console.log('OptimizedDataService initialized with JSON file fallback');
      } catch (jsonError) {
        console.error('Failed to initialize with JSON files:', jsonError);
        throw jsonError;
      }
    }
  }

  private async loadDataFromJsonFiles(): Promise<void> {
    try {
      // Load people data from JSON file
      const peopleResponse = await fetch('/data/people.json');
      if (!peopleResponse.ok) {
        throw new Error(`Failed to load people data: ${peopleResponse.status}`);
      }

      const peopleData = await peopleResponse.json();
      console.log(`Loaded ${peopleData.length} people from JSON file`);

      // Store the data for use in getPaginatedData
      this.jsonFallbackData = {
        people: peopleData.map((person: any, index: number) => ({
          id: `person_${index}`,
          name: person.fullName,
          likelihood_score: person.likelihoodLevel || 'UNKNOWN',
          mentions: person.mentions || 0,
          files: person.fileReferences?.split(',').length || 0,
          evidence_types: (person.keyEvidence?.split(',') || []).map((type: string) => type.trim()),
          contexts: [], // Will be populated from evidence data
          spicy_passages: [], // Will be populated from evidence data
          spice_score: 0,
          spice_peppers: '🌶️',
          red_flag_rating: person.redFlagRating ?? 0,
          role: person.primaryRole || '',
          secondary_roles: person.secondaryRoles || '',
          status: person.currentStatus || '',
          fileReferences: person.fileReferences
            ? typeof person.fileReferences === 'string'
              ? []
              : person.fileReferences
            : [],
        })),
      };

      console.log('JSON fallback data prepared successfully');
    } catch (error) {
      console.error('Error loading JSON data files:', error);
      throw error;
    }
  }

  private jsonFallbackData: { people: any[] } | null = null;

  private getCacheKey(type: string, params: any): string {
    return `${type}:${JSON.stringify(params)}`;
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  async getPaginatedData(
    filters: SearchFilters = {},
    page: number = 1,
  ): Promise<PaginatedResponse> {
    await this.initialize();

    const pageSize = this.getPageSize();
    const cacheKey = this.getCacheKey('entities', { filters, page, pageSize });

    // Disable caching for searches to ensure fresh filtered results
    const cached = filters.searchTerm ? null : this.getCachedData<PaginatedResponse>(cacheKey);

    if (cached) {
      console.log(`Cache hit for entities page ${page}`);
      return cached;
    }

    // STRICT QUALITY FILTER for Page 1 default view
    // If no search, no specific filters, and page 1 -> We apply strict quality control
    const isDefaultView =
      !filters.searchTerm && !filters.evidenceTypes?.length && !filters.entityType && page === 1;

    // Check if we're already fetching this page (prefetch)
    if (this.prefetchCache.has(cacheKey)) {
      console.log(`Prefetch hit for entities page ${page}`);
      return this.prefetchCache.get(cacheKey)!;
    }

    // Implement retry mechanism with exponential backoff
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    // Create promise for this request
    const fetchPromise = (async () => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Try API first - the API now returns deduplicated data
          const apiFilters = {
            search: filters.searchTerm,
            role: filters.evidenceTypes?.[0], // Map first evidence type to role
            likelihood: filters.likelihoodScore, // Pass full array of likelihood scores
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
            entityType: filters.entityType,
            minRedFlagIndex: filters.minRedFlagIndex,
            maxRedFlagIndex: filters.maxRedFlagIndex,
          };

          const result = await apiClient.getEntities(apiFilters, page, pageSize);

          // Map API response to Person interface
          if (result.data) {
            const term = (filters.searchTerm || '').toLowerCase();
            result.data = result.data
              .map((person: any) => ({
                ...person,
                name: person.fullName || person.name,
                files: person.documentCount || person.files || 0,
                likelihood_score: person.likelihoodLevel || person.likelihood_score,
                role: person.primaryRole || person.role,
                title: person.title,
                title_variants: person.titleVariants || person.title_variants,
                red_flag_rating:
                  person.red_flag_rating ?? person.redFlagRating ?? person.spiceRating ?? 0,
                evidence_types: person.evidenceTypes || person.evidence_types || [],
              }))
              .filter((p) => (term ? (p.name || '').toLowerCase().includes(term) : true));

            // QUALITY FILTER: If default view, remove low-relevance noise
            if (isDefaultView) {
              result.data = result.data.filter((p: any) => {
                // Keep if: High/Medium risk OR > 2 mentions OR explicitly labeled Role
                const isRisk = (p.red_flag_rating || 0) >= 2;
                const isPopular = (p.mentions || 0) >= 3;
                const hasRole = p.role && p.role !== 'Person of Interest' && p.role !== 'Unknown';
                const isVerified =
                  p.likelihood_score === 'HIGH' || p.likelihood_score === 'CRITICAL';

                return isRisk || isPopular || hasRole || isVerified;
              });
            }
          }

          // Note: Server-side filtering by likelihoodScore (via red_flag_rating ranges) is now used.
          // No additional client-side filtering needed for likelihood.

          // Cache the result
          this.setCachedData(cacheKey, result);

          // Remove from prefetch cache since we've fulfilled it
          this.prefetchCache.delete(cacheKey);

          console.log(
            `Fetched page ${page} with ${result.data.length} deduplicated entities from API (${result.total} total unique)`,
          );
          return result;
        } catch (error) {
          console.warn(
            `API fetch failed (attempt ${attempt + 1}/${maxRetries + 1}), using JSON fallback data:`,
            error,
          );

          // If this isn't the last attempt, wait before retrying
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          // On final attempt, try without likelihood filter then apply client-side filtering
          try {
            const apiFiltersNoLikelihood = {
              search: filters.searchTerm,
              role: filters.evidenceTypes?.[0],
              likelihood: undefined,
              sortBy: filters.sortBy,
              sortOrder: filters.sortOrder,
              entityType: filters.entityType,
              minRedFlagIndex: filters.minRedFlagIndex,
              maxRedFlagIndex: filters.maxRedFlagIndex,
            };
            const result = await apiClient.getEntities(apiFiltersNoLikelihood, page, pageSize);
            if (result.data) {
              const term = (filters.searchTerm || '').toLowerCase();
              result.data = result.data
                .map((person: any) => ({
                  ...person,
                  name: person.fullName || person.name,
                  files: person.documentCount || person.files || 0,
                  likelihood_score: person.likelihoodLevel || person.likelihood_score,
                  role: person.primaryRole || person.role,
                  title: person.title,
                  title_variants: person.titleVariants || person.title_variants,
                  red_flag_rating:
                    person.red_flag_rating ?? person.redFlagRating ?? person.spiceRating ?? 0,
                  evidence_types: person.evidenceTypes || person.evidence_types || [],
                }))
                .filter((p) => (term ? (p.name || '').toLowerCase().includes(term) : true));
              if (filters.likelihoodScore && filters.likelihoodScore.length > 0) {
                const filterLevels = filters.likelihoodScore.map((l) => l.toUpperCase());
                result.data = result.data.filter((p: any) => {
                  const pLevel = (p.likelihood_score || '').toUpperCase();
                  return filterLevels.includes(pLevel);
                });
              }
            }
            this.setCachedData(cacheKey, result);
            this.prefetchCache.delete(cacheKey);
            return result;
          } catch (retryError) {
            console.warn(
              'Secondary API fetch without likelihood also failed; falling back to JSON data',
              retryError,
            );
          }

          // Use JSON fallback data if available (only after secondary attempt)
          if (this.jsonFallbackData && this.jsonFallbackData.people) {
            let filteredPeople = [...this.jsonFallbackData.people];

            // Apply filters
            if (filters.searchTerm) {
              const searchLower = filters.searchTerm.toLowerCase();
              filteredPeople = filteredPeople.filter(
                (person) =>
                  person.name.toLowerCase().includes(searchLower) ||
                  (person.connections && person.connections.toLowerCase().includes(searchLower)) ||
                  (person.role && person.role.toLowerCase().includes(searchLower)),
              );
            }

            if (filters.likelihoodScore && filters.likelihoodScore.length > 0) {
              filteredPeople = filteredPeople.filter((person) =>
                filters.likelihoodScore!.includes(person.likelihood_score),
              );
            }

            if (filters.evidenceTypes && filters.evidenceTypes.length > 0) {
              filteredPeople = filteredPeople.filter((person) =>
                person.evidence_types.some((type: string) => filters.evidenceTypes!.includes(type)),
              );
            }

            if (filters.minRedFlagIndex !== undefined) {
              filteredPeople = filteredPeople.filter(
                (person) => (person.red_flag_rating ?? 0) >= filters.minRedFlagIndex!,
              );
            }

            if (filters.maxRedFlagIndex !== undefined) {
              filteredPeople = filteredPeople.filter(
                (person) => (person.red_flag_rating ?? 0) <= filters.maxRedFlagIndex!,
              );
            }

            // Apply entity type filtering
            if (filters.entityType && filters.entityType !== 'all') {
              filteredPeople = filteredPeople.filter((person) => {
                // Map role/type to entity type
                // This is a heuristic since JSON data might not have explicit entity_type field
                // We assume 'Person' if not specified, or infer from role
                const type =
                  (person as any).entity_type ||
                  (person.role && person.role.includes('Organization') ? 'Organization' : 'Person');
                return type === filters.entityType;
              });
            }

            // Apply sorting
            if (filters.sortBy) {
              filteredPeople.sort((a, b) => {
                let aValue: any, bValue: any;

                switch (filters.sortBy) {
                  case 'name':
                    aValue = a.name;
                    bValue = b.name;
                    break;
                  case 'mentions':
                    aValue = a.mentions;
                    bValue = b.mentions;
                    break;
                  case 'spice':
                    // Weighted score: 30% mentions, 70% spice score
                    // This ensures high-profile targets (high mentions) with high risk bubble to the top
                    aValue = a.mentions * 0.3 + a.spice_score * 0.7;
                    bValue = b.mentions * 0.3 + b.spice_score * 0.7;
                    break;
                  case 'risk':
                    aValue = a.likelihood_score;
                    bValue = b.likelihood_score;
                    break;
                  default:
                    aValue = a.mentions;
                    bValue = b.mentions;
                }

                if (filters.sortOrder === 'asc') {
                  return aValue > bValue ? 1 : -1;
                } else {
                  return aValue < bValue ? 1 : -1;
                }
              });
            }

            // Apply pagination
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedData = filteredPeople.slice(startIndex, endIndex);

            const result: PaginatedResponse = {
              data: paginatedData,
              total: filteredPeople.length,
              page,
              totalPages: Math.ceil(filteredPeople.length / pageSize),
              pageSize,
            };

            // Cache the result
            this.setCachedData(cacheKey, result);
            this.prefetchCache.delete(cacheKey);

            console.log(
              `Fetched page ${page} with ${result.data.length} entities from JSON fallback (${filteredPeople.length} total)`,
            );
            return result;
          } else {
            console.error('No JSON fallback data available');
            throw error;
          }
        }
      }

      // This should never be reached, but TypeScript requires it
      throw new Error('Unexpected error in getPaginatedData');
    })();

    // Store promise in prefetch cache
    this.prefetchCache.set(cacheKey, fetchPromise);

    // Return the promise
    return fetchPromise;
  }

  // Prefetch next page for smoother pagination
  async prefetchNextPage(filters: SearchFilters = {}, currentPage: number): Promise<void> {
    const nextPage = currentPage + 1;
    const pageSize = this.getPageSize();
    const cacheKey = this.getCacheKey('entities', { filters, page: nextPage, pageSize });

    // Don't prefetch if already cached or being prefetched
    if (this.getCachedData(cacheKey) || this.prefetchCache.has(cacheKey)) {
      return;
    }

    // Create prefetch promise
    const prefetchPromise = this.getPaginatedData(filters, nextPage);

    // Store in prefetch cache
    this.prefetchCache.set(cacheKey, prefetchPromise);

    // Clean up prefetch cache after promise resolves
    prefetchPromise.finally(() => {
      this.prefetchCache.delete(cacheKey);
    });
  }

  async getPersonById(id: string): Promise<Person | null> {
    await this.initialize();

    const cacheKey = this.getCacheKey('person', { id });
    const cached = this.getCachedData<Person>(cacheKey);

    if (cached) {
      console.log(`Cache hit for person ${id}`);
      return cached;
    }

    try {
      const person = await apiClient.getEntity(id);

      // Cache the result
      this.setCachedData(cacheKey, person);

      console.log(`Fetched person ${id}: ${person.name}`);
      return person;
    } catch (error) {
      console.error(`Error fetching person ${id}:`, error);
      return null;
    }
  }

  async searchPeople(query: string): Promise<Person[]> {
    await this.initialize();

    if (!query.trim()) {
      return [];
    }

    const cacheKey = this.getCacheKey('search', { query });
    const cached = this.getCachedData<Person[]>(cacheKey);

    if (cached) {
      console.log(`Cache hit for search: "${query}"`);
      return cached;
    }

    try {
      const results = await apiClient.searchEntities(query, 50); // Limit to 50 results

      // Cache the result
      this.setCachedData(cacheKey, results);

      console.log(`Search "${query}" returned ${results.length} results`);
      return results;
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
      return [];
    }
  }

  async getStatistics(): Promise<any> {
    await this.initialize();

    if (this.statsCache) {
      return this.statsCache;
    }

    // Implement retry mechanism with exponential backoff
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const stats = await apiClient.getStats();
        this.statsCache = stats;

        // Clear stats cache after 5 minutes (TTL)
        setTimeout(() => {
          this.statsCache = null;
        }, this.CACHE_TTL);

        return stats;
      } catch (error) {
        console.error(
          `Error fetching statistics (attempt ${attempt + 1}/${maxRetries + 1}):`,
          error,
        );

        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async getAllPeople(): Promise<Person[]> {
    await this.initialize();

    const cacheKey = this.getCacheKey('allPeople', {});
    const cached = this.getCachedData<Person[]>(cacheKey);

    if (cached) {
      console.log('Cache hit for all people');
      return cached;
    }

    try {
      // This would be too many people to fetch at once, so we'll fetch first few pages
      const allPeople: Person[] = [];
      const maxPages = 10; // Limit to first 10 pages (240 people)

      for (let page = 1; page <= maxPages; page++) {
        const result = await this.getPaginatedData({}, page);
        allPeople.push(...result.data);

        if (page >= result.totalPages) break;
      }

      // Cache the result
      this.setCachedData(cacheKey, allPeople);

      console.log(`Fetched ${allPeople.length} people for "all people" request`);
      return allPeople;
    } catch (error) {
      console.error('Error fetching all people:', error);
      return [];
    }
  }

  // Clear all caches
  clearCache(): void {
    this.cache.clear();
    this.prefetchCache.clear();
    this.statsCache = null;
    console.log('All caches cleared');
  }
}

export const optimizedDataService = OptimizedDataService.getInstance();
