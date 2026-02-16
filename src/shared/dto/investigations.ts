export interface InvestigationEvidenceListItemDto {
  id: number;
  type: string;
  title: string;
  description: string;
  source_path: string;
  metadata_json: string | null;
  investigation_evidence_id: number;
  relevance: string;
  extracted_at: string;
  extracted_by: string | null;
}

export interface InvestigationEvidenceListResponseDto {
  data: InvestigationEvidenceListItemDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface InvestigationCaseEvidenceItemDto {
  id: number;
  type: string;
  title: string;
  description: string;
  source_path: string;
  metadata_json: string | null;
  investigation_evidence_id?: number;
  document_id?: number | null;
  media_item_id?: number | null;
  red_flag_rating: number;
  relevance: string;
  added_at: string;
  added_by: string | null;
  notes: string;
  target_type?: 'document' | 'entity' | 'media' | null;
  target_id?: number | null;
  ingest_run_id?: string | number | null;
  evidence_ladder?: string | null;
  pipeline_version?: string | null;
  evidence_pack?: unknown;
  was_agentic?: boolean;
}

export interface InvestigationEvidenceByTypeResponseDto {
  all: InvestigationCaseEvidenceItemDto[];
  byType: Record<string, InvestigationCaseEvidenceItemDto[]>;
  counts: Record<string, number>;
  total: number;
}
