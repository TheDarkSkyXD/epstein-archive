import { z } from 'zod';

export const subjectCardStatsSchema = z.object({
  mentions: z.number(),
  documents: z.number(),
  distinct_sources: z.number(),
  verified_media: z.number(),
});

export const subjectCardForensicsSchema = z.object({
  risk_level: z.string(),
  evidence_ladder: z.enum(['L1', 'L2', 'L3', 'NONE']),
  red_flag_objective: z.number().optional(),
  red_flag_subjective: z.number().optional(),
  signal_strength: z.object({
    exposure: z.number(),
    connectivity: z.number(),
    corroboration: z.number(),
  }),
  driver_labels: z.array(z.string()),
});

export const subjectCardTopPreviewSchema = z
  .object({
    id: z.string(),
    type: z.enum(['document', 'flight_log', 'black_book', 'testimony']),
    title: z.string(),
    citation: z.string(),
    confidence: z.number(),
    year: z.number().optional(),
  })
  .optional();

export const subjectCardListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  short_bio: z.string().optional(),
  stats: subjectCardStatsSchema,
  forensics: subjectCardForensicsSchema,
  top_preview: subjectCardTopPreviewSchema,
  topPhotoId: z.string().optional(),
});

export const subjectsListResponseSchema = z.object({
  subjects: z.array(subjectCardListItemSchema),
  total: z.number(),
});

export const entityListItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  fullName: z.string(),
  bio: z.string().optional(),
  entity_type: z.string(),
  primaryRole: z.string(),
  secondaryRoles: z.array(z.string()),
  mentions: z.number(),
  files: z.number(),
  contexts: z.array(z.unknown()),
  evidence_types: z.array(z.string()),
  evidenceTypes: z.array(z.string()),
  photos: z.array(z.unknown()),
  significant_passages: z.array(z.unknown()),
  likelihood_score: z.string(),
  red_flag_score: z.number(),
  red_flag_rating: z.number(),
  red_flag_peppers: z.string(),
  red_flag_description: z.string(),
  connectionsToEpstein: z.string(),
});

export const entityListResponseSchema = z.object({
  data: z.array(entityListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});
