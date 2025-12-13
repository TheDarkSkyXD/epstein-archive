/// <reference types="vite/client" />
import { Person } from '../types';
import { PaginatedResponse, SearchFilters } from './optimizedDataLoader';

const API_BASE_URL = (typeof window !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || (typeof process !== 'undefined' && process.env?.VITE_API_URL) || '/api';

class ApiClient {
  private async fetchWithErrorHandling<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.fetchWithErrorHandling<T>(url);
  }

  async getEntities(filters: SearchFilters = {}, page: number = 1, limit: number = 24): Promise<PaginatedResponse> {
    const params = new URLSearchParams();
    
    if (filters.searchTerm) params.append('search', filters.searchTerm);
    if (filters.evidenceTypes && filters.evidenceTypes.length > 0) params.append('role', filters.evidenceTypes[0]);
    // Support both 'likelihood' and 'likelihoodScore' filter property names
    const likelihoodValue = (filters as any).likelihood || filters.likelihoodScore;
    if (likelihoodValue && Array.isArray(likelihoodValue) && likelihoodValue.length > 0) {
      params.append('likelihood', likelihoodValue[0]);
    } else if (likelihoodValue && typeof likelihoodValue === 'string') {
      params.append('likelihood', likelihoodValue);
    }
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.minRedFlagIndex !== undefined) params.append('minRedFlagIndex', filters.minRedFlagIndex.toString());
    if (filters.maxRedFlagIndex !== undefined) params.append('maxRedFlagIndex', filters.maxRedFlagIndex.toString());
    if (filters.entityType && filters.entityType !== 'all') params.append('type', filters.entityType);
    if (page > 1) params.append('page', page.toString());
    if (limit !== 24) params.append('limit', limit.toString());

    const url = `${API_BASE_URL}/entities${params.toString() ? `?${params.toString()}` : ''}`;
    const resp = await this.fetchWithErrorHandling<PaginatedResponse>(url);
    const data = Array.isArray((resp as any).data) ? (resp as any).data : [];
    const normalized = data.map((e: any) => ({
      ...e,
      name: e.name ?? e.fullName ?? e.full_name,
      fullName: e.fullName ?? e.name ?? e.full_name,
      red_flag_rating: e.red_flag_rating ?? e.redFlagRating ?? e.spiceRating ?? 0,
      files: e.files ?? e.documentCount ?? 0,
      blackBookEntry: e.blackBookEntry || null,
    }));    return { ...(resp as any), data: normalized };
  }

  async getEntity(id: string): Promise<Person> {
    const url = `${API_BASE_URL}/entities/${id}`;
    const e = await this.fetchWithErrorHandling<any>(url);
    return {
      ...e,
      name: e.name ?? e.fullName ?? e.full_name,
      fullName: e.fullName ?? e.name ?? e.full_name,
      red_flag_rating: e.red_flag_rating ?? e.redFlagRating ?? e.spiceRating ?? 0,
      blackBookEntry: e.blackBookEntry || null,
    } as Person;
  }
  async search(query: string, limit: number = 20): Promise<{ entities: Person[], documents: any[] }> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (limit !== 20) params.append('limit', limit.toString());

    const url = `${API_BASE_URL}/search?${params.toString()}`;
    const r = await this.fetchWithErrorHandling<any>(url);
    const ents = Array.isArray(r.entities) ? r.entities.map((e: any) => ({
      ...e,
      name: e.name ?? e.fullName ?? e.full_name,
      fullName: e.fullName ?? e.name ?? e.full_name,
      red_flag_rating: e.red_flag_rating ?? e.redFlagRating ?? e.spiceRating ?? 0,
      blackBookEntry: e.blackBookEntry || null,
    })) : [];
    return { entities: ents as Person[], documents: r.documents || [] };
  }

  async searchEntities(query: string, limit: number = 20): Promise<Person[]> {
    const result = await this.search(query, limit);
    return result.entities || [];
  }

  async createEntity(data: any): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/entities`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createRelationship(data: any): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/relationships`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getStats(): Promise<any> {
    const url = `${API_BASE_URL}/stats`;
    return this.fetchWithErrorHandling<any>(url);
  }

  async getDocumentPages(id: string): Promise<{ pages: string[], total: number }> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${id}/pages`);
      if (!response.ok) throw new Error('Failed to fetch document pages');
      return await response.json();
    } catch (error) {
      console.error('Error fetching document pages:', error);
      return { pages: [], total: 0 };
    }
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

  async getInvestigations(params: { status?: string; ownerId?: string; page?: number; limit?: number } = {}): Promise<any> {
    const usp = new URLSearchParams();
    if (params.status) usp.append('status', params.status);
    if (params.ownerId) usp.append('ownerId', params.ownerId);
    if (params.page) usp.append('page', String(params.page));
    if (params.limit) usp.append('limit', String(params.limit));
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/investigations${usp.toString() ? `?${usp.toString()}` : ''}`);
  }

  async createInvestigation(body: { title: string; description?: string; ownerId: string; scope?: string; collaboratorIds?: string[] }): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/investigations`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async getInvestigation(id: string): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/investigations/${id}`);
  }

  async getDocuments(filters: any = {}, page: number = 1, limit: number = 50): Promise<any> {
    const params = new URLSearchParams();
    if (page > 1) params.append('page', page.toString());
    if (limit !== 50) params.append('limit', limit.toString());
    if (filters.fileType && filters.fileType.length > 0) params.append('fileType', filters.fileType.join(','));
    if (filters.redFlagLevel?.min) params.append('minRedFlag', filters.redFlagLevel.min.toString());
    if (filters.redFlagLevel?.max) params.append('maxRedFlag', filters.redFlagLevel.max.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);

    const url = `${API_BASE_URL}/documents?${params.toString()}`;
    return this.fetchWithErrorHandling<any>(url);
  }

  async healthCheck(): Promise<{ status: string; timestamp: string; database: string }> {
    const url = `${API_BASE_URL}/health`;
    return this.fetchWithErrorHandling<{ status: string; timestamp: string; database: string }>(url);
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
