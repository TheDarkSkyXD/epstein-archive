export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SubjectCardStatsDto {
  mentions: number;
  documents: number;
  distinct_sources: number;
  verified_media: number;
}

export interface SubjectCardForensicsDto {
  risk_level: RiskLevel;
  evidence_ladder: 'L1' | 'L2' | 'L3' | 'NONE';
  red_flag_objective?: number;
  red_flag_subjective?: number;
  signal_strength: {
    exposure: number;
    connectivity: number;
    corroboration: number;
  };
  driver_labels: string[];
}

export interface SubjectCardTopPreviewDto {
  id: string;
  type: 'document' | 'flight_log' | 'black_book' | 'testimony';
  title: string;
  citation: string;
  confidence: number;
  year?: number;
}

export interface SubjectCardListItemDto {
  id: string;
  name: string;
  role: string;
  short_bio?: string;
  stats: SubjectCardStatsDto;
  forensics: SubjectCardForensicsDto;
  top_preview?: SubjectCardTopPreviewDto;
  topPhotoId?: string;
}

export interface SubjectsListResponseDto {
  subjects: SubjectCardListItemDto[];
  total: number;
}

export interface EntityListItemDto {
  id: number | string;
  name: string;
  fullName: string;
  bio?: string;
  entity_type: string;
  primaryRole: string;
  secondaryRoles: string[];
  mentions: number;
  files: number;
  contexts: Record<string, unknown>[];
  evidence_types: string[];
  evidenceTypes: string[];
  photos: Record<string, unknown>[];
  significant_passages: Record<string, unknown>[];
  likelihood_score: RiskLevel;
  red_flag_score: number;
  red_flag_rating: number;
  red_flag_peppers: string;
  red_flag_description: string;
  connectionsToEpstein: string;
}

export interface EntityListResponseDto {
  data: EntityListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
