import { z } from 'zod';

export const investigationEvidenceListItemSchema = z.object({
  id: z.number(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  source_path: z.string(),
  metadata_json: z.string().nullable(),
  investigation_evidence_id: z.number(),
  relevance: z.string(),
  extracted_at: z.string(),
  extracted_by: z.string().nullable(),
});

export const investigationEvidenceListResponseSchema = z.object({
  data: z.array(investigationEvidenceListItemSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const investigationCaseEvidenceItemSchema = z.object({
  id: z.number(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  source_path: z.string(),
  metadata_json: z.string().nullable(),
  investigation_evidence_id: z.number().optional(),
  document_id: z.number().nullable().optional(),
  media_item_id: z.number().nullable().optional(),
  red_flag_rating: z.number(),
  relevance: z.string(),
  added_at: z.string(),
  added_by: z.string().nullable(),
  notes: z.string(),
  target_type: z.enum(['document', 'entity', 'media']).nullable().optional(),
  target_id: z.number().nullable().optional(),
  ingest_run_id: z.union([z.string(), z.number()]).nullable().optional(),
  evidence_ladder: z.string().nullable().optional(),
  pipeline_version: z.string().nullable().optional(),
  evidence_pack: z.unknown().optional(),
  was_agentic: z.boolean().optional(),
});

export const investigationEvidenceByTypeResponseSchema = z.object({
  all: z.array(investigationCaseEvidenceItemSchema),
  byType: z.record(z.array(investigationCaseEvidenceItemSchema)),
  counts: z.record(z.number()),
  total: z.number(),
});
