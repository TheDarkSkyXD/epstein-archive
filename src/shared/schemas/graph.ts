import { z } from 'zod';

const graphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  risk: z.number(),
  connectionCount: z.number().optional(),
  memberCount: z.number().optional(),
  community: z.number().optional(),
});

const graphEdgeSchema = z.object({
  id: z.string().optional(),
  source: z.string(),
  target: z.string(),
  type: z.string(),
  weight: z.number(),
  confidence: z.number(),
  classification: z.string().nullable().optional(),
});

// Schema for GET /api/graph/global
export const graphGlobalResponseSchema = z.object({
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
});
