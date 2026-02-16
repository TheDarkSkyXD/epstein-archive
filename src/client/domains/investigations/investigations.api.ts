import { apiClient } from '../../services/apiClient';
import type {
  InvestigationEvidenceByTypeResponseDto,
  InvestigationEvidenceListResponseDto,
} from '@shared/dto/investigations';

export interface InvestigationListApiResponse {
  data: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const investigationsApi = {
  list: async (): Promise<InvestigationListApiResponse> => {
    return apiClient.getInvestigations();
  },

  getById: async (id: string): Promise<any> => {
    return apiClient.getInvestigation(id);
  },

  create: async (payload: {
    title: string;
    description?: string;
    ownerId: string;
    scope?: string;
  }): Promise<any> => {
    return apiClient.createInvestigation(payload);
  },

  getBoard: async (id: string, params?: { evidenceLimit?: number; hypothesisLimit?: number }) => {
    return apiClient.getInvestigationBoard(id, params);
  },

  getEvidencePage: async (
    id: string,
    params: { limit: number; offset: number },
  ): Promise<InvestigationEvidenceListResponseDto> => {
    return apiClient.getInvestigationEvidencePage(id, params);
  },

  getCaseFolder: async (id: string): Promise<InvestigationEvidenceByTypeResponseDto> => {
    return apiClient.get(`/investigations/${id}/evidence-by-type`, { useCache: false });
  },

  getHypotheses: async (id: string): Promise<any[]> => {
    return apiClient.get(`/investigations/${id}/hypotheses`, { useCache: false });
  },

  getNotebook: async (id: string): Promise<any> => {
    return apiClient.getInvestigationNotebook(id);
  },

  updateNotebook: async (
    id: string,
    payload: { order?: number[]; annotations?: any[] },
  ): Promise<any> => {
    return apiClient.updateInvestigationNotebook(id, payload);
  },

  getTimelineEvents: async (id: string): Promise<any[]> => {
    return apiClient.get(`/investigations/${id}/timeline-events`, { useCache: false });
  },

  addEvidence: async (id: string, payload: any): Promise<any> => {
    return apiClient.post(`/investigations/${id}/evidence`, payload);
  },

  removeEvidenceLink: async (investigationEvidenceId: number | string): Promise<any> => {
    return apiClient.delete(`/investigation/remove-evidence/${investigationEvidenceId}`);
  },
};
