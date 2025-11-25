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
    if (filters.likelihoodScore && filters.likelihoodScore.length > 0) params.append('likelihood', filters.likelihoodScore[0]);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.minRedFlagIndex !== undefined) params.append('minRedFlagIndex', filters.minRedFlagIndex.toString());
    if (filters.maxRedFlagIndex !== undefined) params.append('maxRedFlagIndex', filters.maxRedFlagIndex.toString());
    if (page > 1) params.append('page', page.toString());
    if (limit !== 24) params.append('limit', limit.toString());

    const url = `${API_BASE_URL}/entities${params.toString() ? `?${params.toString()}` : ''}`;
    return this.fetchWithErrorHandling<PaginatedResponse>(url);
  }

  async getEntity(id: string): Promise<Person> {
    const url = `${API_BASE_URL}/entities/${id}`;
    return this.fetchWithErrorHandling<Person>(url);
  }

  async search(query: string, limit: number = 20): Promise<{ entities: Person[], documents: any[] }> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (limit !== 20) params.append('limit', limit.toString());

    const url = `${API_BASE_URL}/search?${params.toString()}`;
    return this.fetchWithErrorHandling<{ entities: Person[], documents: any[] }>(url);
  }

  async searchEntities(query: string, limit: number = 20): Promise<Person[]> {
    const result = await this.search(query, limit);
    return result.entities || [];
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
    return this.fetchWithErrorHandling<any[]>(url);
  }

  async getDocument(id: string): Promise<any> {
    const url = `${API_BASE_URL}/documents/${id}`;
    return this.fetchWithErrorHandling<any>(url);
  }

  async getDocuments(filters: any = {}, page: number = 1, limit: number = 50): Promise<any> {
    const params = new URLSearchParams();
    if (page > 1) params.append('page', page.toString());
    if (limit !== 50) params.append('limit', limit.toString());
    if (filters.fileType && filters.fileType.length > 0) params.append('fileType', filters.fileType.join(','));
    if (filters.spiceLevel?.min) params.append('minSpice', filters.spiceLevel.min.toString());
    if (filters.spiceLevel?.max) params.append('maxSpice', filters.spiceLevel.max.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);

    const url = `${API_BASE_URL}/documents?${params.toString()}`;
    return this.fetchWithErrorHandling<any>(url);
  }

  async healthCheck(): Promise<{ status: string; timestamp: string; database: string }> {
    const url = `${API_BASE_URL}/health`;
    return this.fetchWithErrorHandling<{ status: string; timestamp: string; database: string }>(url);
  }
}

export const apiClient = new ApiClient();