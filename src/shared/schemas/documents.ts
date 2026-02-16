import { z } from 'zod';

export const documentListItemSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  title: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  dateCreated: z.string().nullable(),
  evidenceType: z.string(),
  metadata: z.record(z.unknown()),
  redFlagRating: z.number(),
  wordCount: z.number(),
  entitiesCount: z.number(),
  keyEntities: z.array(z.string()),
  sourceType: z.string(),
  previewText: z.string(),
  previewKind: z.string(),
  whyFlagged: z.string(),
  entities_count: z.number(),
  key_entities: z.array(z.string()),
  source_type: z.string(),
  preview_text: z.string(),
  preview_kind: z.string(),
  why_flagged: z.string(),
});

export const documentsListResponseSchema = z.object({
  data: z.array(documentListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});
