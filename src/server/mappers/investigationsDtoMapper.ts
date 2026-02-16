import type {
  InvestigationCaseEvidenceItemDto,
  InvestigationEvidenceByTypeResponseDto,
  InvestigationEvidenceListItemDto,
  InvestigationEvidenceListResponseDto,
} from '@shared/dto/investigations';

const safeMetadataJson = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (value == null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const normalizeTargetType = (value: unknown): 'document' | 'entity' | 'media' | null => {
  if (value === 'document' || value === 'entity' || value === 'media') return value;
  return null;
};

export const mapInvestigationEvidenceListItemDto = (
  row: any,
): InvestigationEvidenceListItemDto => ({
  id: Number(row.id || 0),
  type: String(row.type || 'document'),
  title: String(row.title || 'Untitled evidence'),
  description: String(row.description || ''),
  source_path: String(row.source_path || ''),
  metadata_json: safeMetadataJson(row.metadata_json),
  investigation_evidence_id: Number(row.investigation_evidence_id || row.id || 0),
  relevance: String(row.relevance || 'medium'),
  extracted_at: String(row.extracted_at || row.added_at || ''),
  extracted_by: row.extracted_by ? String(row.extracted_by) : null,
});

export const mapInvestigationEvidenceListResponseDto = (
  result: any,
): InvestigationEvidenceListResponseDto => ({
  data: Array.isArray(result?.data)
    ? result.data.map(mapInvestigationEvidenceListItemDto)
    : Array.isArray(result)
      ? result.map(mapInvestigationEvidenceListItemDto)
      : [],
  total: Number(result?.total || 0),
  limit: Number(result?.limit || 0),
  offset: Number(result?.offset || 0),
});

export const mapInvestigationCaseEvidenceItemDto = (
  row: any,
): InvestigationCaseEvidenceItemDto => ({
  id: Number(row.id || 0),
  type: String(row.type || 'other'),
  title: String(row.title || 'Untitled evidence'),
  description: String(row.description || ''),
  source_path: String(row.source_path || ''),
  metadata_json: safeMetadataJson(row.metadata_json),
  investigation_evidence_id:
    typeof row.investigation_evidence_id === 'number'
      ? row.investigation_evidence_id
      : Number(row.investigation_evidence_id || 0) || undefined,
  document_id:
    row.document_id == null
      ? null
      : Number.isFinite(Number(row.document_id))
        ? Number(row.document_id)
        : null,
  media_item_id:
    row.media_item_id == null
      ? null
      : Number.isFinite(Number(row.media_item_id))
        ? Number(row.media_item_id)
        : null,
  red_flag_rating: Number(row.red_flag_rating || 0),
  relevance: String(row.relevance || 'medium'),
  added_at: String(row.added_at || row.extracted_at || ''),
  added_by: row.added_by ? String(row.added_by) : null,
  notes: String(row.notes || ''),
  target_type: normalizeTargetType(row.target_type),
  target_id:
    row.target_id == null
      ? null
      : Number.isFinite(Number(row.target_id))
        ? Number(row.target_id)
        : null,
  ingest_run_id: row.ingest_run_id ?? null,
  evidence_ladder: row.evidence_ladder ? String(row.evidence_ladder) : null,
  pipeline_version: row.pipeline_version ? String(row.pipeline_version) : null,
  evidence_pack: row.evidence_pack ?? null,
  was_agentic: Boolean(row.was_agentic),
});

export const mapInvestigationEvidenceByTypeResponseDto = (
  payload: any,
): InvestigationEvidenceByTypeResponseDto => {
  const allItems = Array.isArray(payload?.all)
    ? payload.all.map(mapInvestigationCaseEvidenceItemDto)
    : [];

  const byType: Record<string, InvestigationCaseEvidenceItemDto[]> = {};
  for (const [type, items] of Object.entries(payload?.byType || {})) {
    byType[type] = Array.isArray(items)
      ? (items as any[]).map(mapInvestigationCaseEvidenceItemDto)
      : [];
  }

  const counts: Record<string, number> = {};
  for (const [type, items] of Object.entries(byType)) {
    counts[type] = Array.isArray(items) ? items.length : 0;
  }

  return {
    all: allItems,
    byType,
    counts,
    total: Number(payload?.total || allItems.length),
  };
};
