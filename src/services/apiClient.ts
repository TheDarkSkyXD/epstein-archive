/// <reference types="vite/client" />
import { Person } from '../types';
import { PaginatedResponse, SearchFilters } from './optimizedDataLoader';

export interface EmailMailboxDTO {
  mailboxId: string;
  entityId: number | null;
  displayName: string;
  totalThreads: number;
  totalMessages: number;
  lastActivityAt: string | null;
  riskSummary: 'minimal' | 'low' | 'medium' | 'high' | null;
  isJunkSuppressed: boolean;
}

export interface EmailThreadDTO {
  threadId: string;
  subject: string;
  participants: string[];
  participantCount: number;
  lastMessageAt: string;
  snippet: string;
  messageCount: number;
  hasAttachments: boolean;
  linkedEntityIds: number[];
  risk: number | null;
  ladder: string | null;
  confidence: number | null;
}

export interface EmailThreadDetailsDTO {
  threadId: string;
  subject: string;
  messages: Array<{
    messageId: string;
    threadId: string;
    subject: string;
    from: string;
    to: string[];
    cc: string[];
    date: string;
    snippet: string;
    flags: { hasAttachments: boolean };
    attachmentsMeta: Array<{
      filename?: string;
      mimeType?: string;
      size?: number;
      linkedDocumentId?: string | number;
    }>;
    linkedEntities: Array<{ entityId: number; name: string; role: string | null }>;
    ingestRunId: number | null;
    pipelineVersion: string | null;
    confidence: number | null;
    ladder: string | null;
    wasAgentic: boolean;
    redFlagRating: number | null;
  }>;
}

export interface EmailMessageBodyDTO {
  messageId: string;
  cleanedText: string;
  cleanedHtml: string;
  extractedLinks: string[];
  extractedEntities: string[];
  mimeWarnings: string[];
  parseStatus: 'success' | 'partial' | 'failed';
  ingestRunId: number | null;
  pipelineVersion: string | null;
  sourceFile: { fileName: string | null; filePath: string | null };
  rawAvailable: boolean;
}

const API_BASE_URL =
  (typeof window !== 'undefined' &&
    typeof import.meta !== 'undefined' &&
    import.meta.env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
  '/api';

// --- In-Memory Cache with TTL ---
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_CACHE_TTL = 30000; // 30 seconds

// Add credentials to all requests to ensure cookies are sent
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

const FETCH_CONFIG = {
  credentials: 'include' as RequestCredentials,
};

function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check if expired
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

function setCachedData<T>(key: string, data: T, ttl: number = DEFAULT_CACHE_TTL): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }

  // Invalidate entries matching pattern
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

class ApiClient {
  private accessToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.map((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private async refreshToken(): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.addRefreshSubscriber((token: string) => {
          resolve(token);
        });
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();
      this.accessToken = data.accessToken;
      this.onTokenRefreshed(data.accessToken);
      return data.accessToken;
    } catch (error) {
      this.accessToken = null;
      this.isRefreshing = false;
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  private async fetchWithErrorHandling<T>(
    url: string,
    options?: RequestInit & { useCache?: boolean; cacheTtl?: number },
  ): Promise<T> {
    // Check cache for GET requests
    const shouldCache =
      options?.useCache !== false && (!options?.method || options.method === 'GET');

    if (shouldCache) {
      const cached = getCachedData<T>(url);
      if (cached) return cached;
    }

    const { useCache: _, cacheTtl, ...fetchOptions } = options || {};

    const executeRequest = async (token: string | null): Promise<Response> => {
      const headers = new Headers(fetchOptions?.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');

      return fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      });
    };

    // Performance monitoring
    const startTime = performance.now();

    try {
      let response = await executeRequest(this.accessToken);

      // Handle 401 - Unauthorized (Token expired)
      if (
        response.status === 401 &&
        !url.includes('/auth/login') &&
        !url.includes('/auth/refresh')
      ) {
        const newToken = await this.refreshToken();
        if (newToken) {
          response = await executeRequest(newToken);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Log performance metrics
      const duration = performance.now() - startTime;
      const payloadSize = JSON.stringify(data).length;

      // Import dynamically to avoid circular dependency
      if (typeof window !== 'undefined') {
        import('../utils/performanceMonitor.js')
          .then(({ PerformanceMonitor }) => {
            PerformanceMonitor.logAPICall(url, duration, payloadSize, response.status);
          })
          .catch(() => {
            // Silently fail if performance monitor not available
          });
      }

      if (shouldCache) {
        setCachedData(url, data, cacheTtl);
      }

      return data;
    } catch (error) {
      // Log failed API call
      const duration = performance.now() - startTime;
      if (typeof window !== 'undefined') {
        import('../utils/performanceMonitor.js')
          .then(({ PerformanceMonitor }) => {
            PerformanceMonitor.logAPICall(url, duration, 0, 0);
          })
          .catch(() => {});
      }

      if (error instanceof Error) throw error;
      throw new Error('Network error occurred');
    }
  }

  async get<T>(endpoint: string, options?: { useCache?: boolean; cacheTtl?: number }): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.fetchWithErrorHandling<T>(url, options);
  }

  async post<T>(endpoint: string, body?: any): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.fetchWithErrorHandling<T>(url, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
      useCache: false,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.fetchWithErrorHandling<T>(url, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
      useCache: false,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.fetchWithErrorHandling<T>(url, {
      method: 'DELETE',
      useCache: false,
    });
  }

  // Clear cache (useful after mutations)
  clearCache(pattern?: string): void {
    invalidateCache(pattern);
  }

  async getSubjects(
    filters: Record<string, any> = {},
    page = 1,
    limit = 24,
  ): Promise<{ subjects: any[]; total: number }> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters.search) queryParams.append('search', filters.search);
    if (filters.role) queryParams.append('role', filters.role);
    if (filters.entityType) queryParams.append('entityType', filters.entityType);
    if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
    if (filters.likelihood) {
      if (Array.isArray(filters.likelihood)) {
        filters.likelihood.forEach((l: string) => queryParams.append('likelihoodScore', l));
      } else {
        queryParams.append('likelihoodScore', filters.likelihood);
      }
    }
    // Cache bust to avoid stale front-page results during development
    queryParams.append('v', String(Date.now()));

    return this.fetchWithErrorHandling<{ subjects: any[]; total: number }>(
      `/api/subjects?${queryParams.toString()}`,
      { useCache: false },
    );
  }

  async getEntities(
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 24,
  ): Promise<PaginatedResponse> {
    const params = new URLSearchParams();

    if (filters.searchTerm) params.append('search', filters.searchTerm);
    if (filters.evidenceTypes && filters.evidenceTypes.length > 0)
      params.append('role', filters.evidenceTypes[0]);
    // Support both 'likelihood' and 'likelihoodScore' filter property names
    const likelihoodValue = (filters as any).likelihood || filters.likelihoodScore;
    if (likelihoodValue && Array.isArray(likelihoodValue) && likelihoodValue.length > 0) {
      params.append('likelihood', likelihoodValue[0]);
    } else if (likelihoodValue && typeof likelihoodValue === 'string') {
      params.append('likelihood', likelihoodValue);
    }
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.minRedFlagIndex !== undefined)
      params.append('minRedFlagIndex', filters.minRedFlagIndex.toString());
    if (filters.maxRedFlagIndex !== undefined)
      params.append('maxRedFlagIndex', filters.maxRedFlagIndex.toString());
    if (filters.entityType && filters.entityType !== 'all')
      params.append('type', filters.entityType);
    if (page > 1) params.append('page', page.toString());
    if (limit !== 24) params.append('limit', limit.toString());

    const url = `${API_BASE_URL}/entities${params.toString() ? `?${params.toString()}` : ''}`;
    const resp = await this.fetchWithErrorHandling<PaginatedResponse>(url);
    const data = Array.isArray((resp as any).data) ? (resp as any).data : [];
    const normalized = data.map((e: any) => ({
      ...e,
      name: e.name ?? e.fullName ?? e.full_name,
      fullName: e.fullName ?? e.name ?? e.full_name,
      red_flag_rating: e.red_flag_rating ?? e.redFlagRating ?? 0,
      files: e.files ?? e.documentCount ?? 0,
      blackBookEntry: e.blackBookEntry || null,
    }));
    return { ...(resp as any), data: normalized };
  }

  async getEntity(id: string): Promise<Person> {
    const url = `${API_BASE_URL}/entities/${id}`;
    const e = await this.fetchWithErrorHandling<any>(url);
    return {
      ...e,
      name: e.name ?? e.fullName ?? e.full_name,
      fullName: e.fullName ?? e.name ?? e.full_name,
      red_flag_rating: e.red_flag_rating ?? e.redFlagRating ?? 0,
      blackBookEntry: e.blackBookEntry || null,
    } as Person;
  }

  async getEntityCommunications(
    id: string,
    options?: {
      topic?: string;
      from?: string;
      to?: string;
      start?: string;
      end?: string;
      limit?: number;
    },
  ): Promise<{ data: any[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.topic) params.append('topic', options.topic);
    if (options?.from) params.append('from', options.from);
    if (options?.to) params.append('to', options.to);
    if (options?.start) params.append('start', options.start);
    if (options?.end) params.append('end', options.end);
    if (options?.limit != null) params.append('limit', String(options.limit));

    const query = params.toString();
    const url = `${API_BASE_URL}/entities/${id}/communications${query ? `?${query}` : ''}`;
    return this.fetchWithErrorHandling<{ data: any[]; total: number }>(url, { useCache: true });
  }

  async getDocumentThread(id: string): Promise<{ threadId: string; messages: any[] }> {
    const url = `${API_BASE_URL}/documents/${id}/thread`;
    return this.fetchWithErrorHandling<{ threadId: string; messages: any[] }>(url, {
      useCache: true,
    });
  }

  async getEmailMailboxes(
    params: { showSuppressedJunk?: boolean } = {},
  ): Promise<{ revisionKey: string; data: EmailMailboxDTO[] }> {
    const usp = new URLSearchParams();
    if (params.showSuppressedJunk) usp.append('showSuppressedJunk', '1');
    const url = `${API_BASE_URL}/emails/mailboxes${usp.toString() ? `?${usp.toString()}` : ''}`;
    return this.fetchWithErrorHandling<{ revisionKey: string; data: EmailMailboxDTO[] }>(url, {
      useCache: true,
      cacheTtl: 30000,
    });
  }

  async getEmailThreads(params: {
    mailboxId?: string;
    q?: string;
    tab?: 'all' | 'primary' | 'updates' | 'promotions';
    from?: string;
    to?: string;
    dateFrom?: string;
    dateTo?: string;
    hasAttachments?: boolean;
    minRisk?: number;
    cursor?: string | null;
    limit?: number;
    showSuppressedJunk?: boolean;
  }): Promise<{
    data: EmailThreadDTO[];
    meta: { total: number; limit: number; hasMore: boolean; nextCursor: string | null };
  }> {
    const usp = new URLSearchParams();
    if (params.mailboxId) usp.append('mailboxId', params.mailboxId);
    if (params.q) usp.append('q', params.q);
    if (params.tab) usp.append('tab', params.tab);
    if (params.from) usp.append('from', params.from);
    if (params.to) usp.append('to', params.to);
    if (params.dateFrom) usp.append('dateFrom', params.dateFrom);
    if (params.dateTo) usp.append('dateTo', params.dateTo);
    if (params.hasAttachments) usp.append('hasAttachments', '1');
    if (params.minRisk && params.minRisk > 0) usp.append('minRisk', String(params.minRisk));
    if (params.cursor) usp.append('cursor', params.cursor);
    if (params.limit) usp.append('limit', String(params.limit));
    if (params.showSuppressedJunk) usp.append('showSuppressedJunk', '1');
    const url = `${API_BASE_URL}/emails/threads${usp.toString() ? `?${usp.toString()}` : ''}`;
    return this.fetchWithErrorHandling(url, { useCache: true, cacheTtl: 30000 });
  }

  async getEmailThread(threadId: string): Promise<EmailThreadDetailsDTO> {
    const url = `${API_BASE_URL}/emails/threads/${encodeURIComponent(threadId)}`;
    return this.fetchWithErrorHandling<EmailThreadDetailsDTO>(url, {
      useCache: true,
      cacheTtl: 30000,
    });
  }

  async getEmailMessageBody(
    messageId: string,
    options: { showQuoted?: boolean } = {},
  ): Promise<EmailMessageBodyDTO> {
    const usp = new URLSearchParams();
    if (options.showQuoted) usp.append('showQuoted', '1');
    const url = `${API_BASE_URL}/emails/messages/${encodeURIComponent(messageId)}/body${usp.toString() ? `?${usp.toString()}` : ''}`;
    return this.fetchWithErrorHandling<EmailMessageBodyDTO>(url, {
      useCache: true,
      cacheTtl: 60000,
    });
  }

  async getEmailRawMessage(messageId: string): Promise<{
    messageId: string;
    raw: string;
    warning: string;
    determinism: string;
  }> {
    const url = `${API_BASE_URL}/emails/messages/${encodeURIComponent(messageId)}/raw`;
    return this.fetchWithErrorHandling(url, { useCache: true, cacheTtl: 60000 });
  }

  async getEmailThreadForMessage(
    messageId: string,
  ): Promise<{ messageId: string; threadId: string }> {
    const url = `${API_BASE_URL}/emails/messages/${encodeURIComponent(messageId)}/thread`;
    return this.fetchWithErrorHandling(url, { useCache: true, cacheTtl: 60000 });
  }

  async searchEmails(params: {
    q: string;
    scope?: 'global' | 'mailbox';
    mailboxId?: string;
    limit?: number;
  }): Promise<{
    scope: 'global' | 'mailbox';
    q: string;
    data: Array<{
      threadId: string;
      messageId: string;
      subject: string;
      from: string;
      date: string;
      snippet: string;
      highlights: Array<{ start: number; end: number }>;
    }>;
  }> {
    const usp = new URLSearchParams({ q: params.q });
    if (params.scope) usp.append('scope', params.scope);
    if (params.mailboxId) usp.append('mailboxId', params.mailboxId);
    if (params.limit) usp.append('limit', String(params.limit));
    const url = `${API_BASE_URL}/emails/search?${usp.toString()}`;
    return this.fetchWithErrorHandling(url, { useCache: false });
  }

  async search(
    query: string,
    limit: number = 20,
  ): Promise<{ entities: Person[]; documents: any[] }> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (limit !== 20) params.append('limit', limit.toString());

    const url = `${API_BASE_URL}/search?${params.toString()}`;
    const r = await this.fetchWithErrorHandling<any>(url);
    const ents = Array.isArray(r.entities)
      ? r.entities.map((e: any) => ({
          ...e,
          name: e.name ?? e.fullName ?? e.full_name,
          fullName: e.fullName ?? e.name ?? e.full_name,
          red_flag_rating: e.red_flag_rating ?? e.redFlagRating ?? 0,
          blackBookEntry: e.blackBookEntry || null,
        }))
      : [];
    return { entities: ents as Person[], documents: r.documents || [] };
  }

  async searchEntities(query: string, limit: number = 20): Promise<Person[]> {
    const result = await this.search(query, limit);
    return result.entities || [];
  }

  async createEntity(data: any): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/entities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createRelationship(data: any): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/relationships`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getStats(): Promise<any> {
    const url = `${API_BASE_URL}/stats`;
    return this.fetchWithErrorHandling<any>(url);
  }

  async getDocumentPages(id: string): Promise<{ pages: string[]; total: number }> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${id}/pages`);
      if (!response.ok) throw new Error('Failed to fetch document pages');
      return await response.json();
    } catch (error) {
      console.error('Error fetching document pages:', error);
      return { pages: [], total: 0 };
    }
  }

  async getEntityGraph(entityId: string, depth: number = 2): Promise<any> {
    const url = `${API_BASE_URL}/entities/${entityId}/graph?depth=${depth}`;
    return this.fetchWithErrorHandling<any>(url);
  }

  async getEntityDocuments(entityId: string): Promise<any[]> {
    const url = `${API_BASE_URL}/entities/${entityId}/documents`;
    const response = await this.fetchWithErrorHandling<any>(url);

    // Handle both array (dev/legacy) and paginated object (prod) formats
    if (Array.isArray(response)) {
      return response;
    } else if (response && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  }

  async getEntityMedia(entityId: string): Promise<any[]> {
    const url = `${API_BASE_URL}/entities/${entityId}/media`;
    return this.fetchWithErrorHandling<any[]>(url);
  }

  async analyzeDocument(documentId: string): Promise<any> {
    const url = `${API_BASE_URL}/evidence/${documentId}/analyze`;
    return this.fetchWithErrorHandling<any>(url, { method: 'POST' });
  }

  async getEvidenceMetrics(documentId: string): Promise<any> {
    const url = `${API_BASE_URL}/evidence/${documentId}/metrics`;
    return this.fetchWithErrorHandling<any>(url);
  }

  async getChainOfCustody(documentId: string): Promise<any> {
    const url = `${API_BASE_URL}/evidence/${documentId}/custody`;
    return this.fetchWithErrorHandling<any>(url);
  }

  async getDocument(id: string): Promise<any> {
    const url = `${API_BASE_URL}/documents/${id}`;
    const d = await this.fetchWithErrorHandling<any>(url);
    return {
      ...d,
      fileName: d.fileName ?? d.file_name,
      fileType: d.fileType ?? d.file_type,
      contentPreview: d.contentPreview ?? d.content_preview,
      redFlagRating: d.redFlagRating ?? d.red_flag_rating ?? 0,
      title: d.title ?? d.fileName ?? d.file_name,
    };
  }

  async getRelatedDocuments(id: string, limit: number = 10): Promise<any[]> {
    const url = `${API_BASE_URL}/documents/${id}/related?limit=${limit}`;
    return this.fetchWithErrorHandling<any[]>(url);
  }

  async getInvestigations(
    params: { status?: string; ownerId?: string; page?: number; limit?: number } = {},
  ): Promise<any> {
    const usp = new URLSearchParams();
    if (params.status) usp.append('status', params.status);
    if (params.ownerId) usp.append('ownerId', params.ownerId);
    if (params.page) usp.append('page', String(params.page));
    if (params.limit) usp.append('limit', String(params.limit));
    return this.fetchWithErrorHandling<any>(
      `${API_BASE_URL}/investigations${usp.toString() ? `?${usp.toString()}` : ''}`,
    );
  }

  async createInvestigation(body: {
    title: string;
    description?: string;
    ownerId: string;
    scope?: string;
    collaboratorIds?: string[];
  }): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/investigations`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getInvestigation(id: string): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/investigations/${id}`);
  }

  async getInvestigationBoard(
    id: string,
    params: { evidenceLimit?: number; hypothesisLimit?: number } = {},
  ): Promise<any> {
    const usp = new URLSearchParams();
    if (params.evidenceLimit) usp.append('evidenceLimit', String(params.evidenceLimit));
    if (params.hypothesisLimit) usp.append('hypothesisLimit', String(params.hypothesisLimit));
    return this.fetchWithErrorHandling<any>(
      `${API_BASE_URL}/investigations/${id}/board${usp.toString() ? `?${usp.toString()}` : ''}`,
      { useCache: false },
    );
  }

  async getInvestigationEvidencePage(
    id: string,
    params: { limit: number; offset: number },
  ): Promise<{ data: any[]; total: number; limit: number; offset: number }> {
    const usp = new URLSearchParams({
      limit: String(params.limit),
      offset: String(params.offset),
    });
    return this.fetchWithErrorHandling<{
      data: any[];
      total: number;
      limit: number;
      offset: number;
    }>(`${API_BASE_URL}/investigations/${id}/evidence?${usp.toString()}`, { useCache: false });
  }

  async getInvestigationNotebook(id: string): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/investigations/${id}/notebook`, {
      useCache: false,
    });
  }

  async updateInvestigationNotebook(
    id: string,
    payload: { order?: number[]; annotations?: any[] },
  ): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/investigations/${id}/notebook`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      useCache: false,
    });
  }

  async getDocuments(filters: any = {}, page: number = 1, limit: number = 50): Promise<any> {
    const params = new URLSearchParams();
    if (page > 1) params.append('page', page.toString());
    if (limit !== 50) params.append('limit', limit.toString());
    if (filters.fileType && filters.fileType.length > 0)
      params.append('fileType', filters.fileType.join(','));
    if (filters.redFlagLevel?.min) params.append('minRedFlag', filters.redFlagLevel.min.toString());
    if (filters.redFlagLevel?.max) params.append('maxRedFlag', filters.redFlagLevel.max.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.evidenceType) params.append('evidenceType', filters.evidenceType);

    const url = `${API_BASE_URL}/documents?${params.toString()}`;
    return this.fetchWithErrorHandling<any>(url);
  }

  async healthCheck(): Promise<{ status: string; timestamp: string; database: string }> {
    const url = `${API_BASE_URL}/health`;
    return this.fetchWithErrorHandling<{ status: string; timestamp: string; database: string }>(
      url,
    );
  }

  async getAllEntities(): Promise<any[]> {
    const url = `${API_BASE_URL}/entities/all`;
    try {
      const response = await this.fetchWithErrorHandling<any[]>(url);
      return response;
    } catch (error) {
      console.error('Error fetching all entities:', error);
      return [];
    }
  }
}

export const apiClient = new ApiClient();
