/** Types generated for queries found in "src/queries/relationships.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'GetRelationships' parameters type */
export interface IGetRelationshipsParams {
  entityId: NumberOrString;
  minConfidence?: number | null | void;
  minWeight?: number | null | void;
}

/** 'GetRelationships' return type */
export interface IGetRelationshipsResult {
  confidence: number | null;
  metadataJson: string | null;
  proximityScore: number | null;
  relationshipType: string;
  riskScore: number | null;
  sourceId: string;
  targetId: string;
}

/** 'GetRelationships' query type */
export interface IGetRelationshipsQuery {
  params: IGetRelationshipsParams;
  result: IGetRelationshipsResult;
}

const getRelationshipsIR: any = {
  usedParamSet: { entityId: true, minWeight: true, minConfidence: true },
  params: [
    {
      name: 'entityId',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 279, b: 288 },
        { a: 320, b: 329 },
      ],
    },
    {
      name: 'minWeight',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 347, b: 356 },
        { a: 395, b: 404 },
      ],
    },
    {
      name: 'minConfidence',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 414, b: 427 },
        { a: 452, b: 465 },
      ],
    },
  ],
  statement:
    'SELECT \n  source_entity_id as "sourceId", \n  target_entity_id as "targetId", \n  relationship_type as "relationshipType", \n  proximity_score as "proximityScore",\n  0 as "riskScore", \n  1 as confidence, \n  NULL as "metadataJson"\nFROM entity_relationships\nWHERE (source_entity_id = :entityId!::bigint OR target_entity_id = :entityId!::bigint)\n  AND (:minWeight::float IS NULL OR proximity_score >= :minWeight)\n  AND (:minConfidence::float IS NULL OR 1 >= :minConfidence)\nORDER BY proximity_score DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   source_entity_id as "sourceId",
 *   target_entity_id as "targetId",
 *   relationship_type as "relationshipType",
 *   proximity_score as "proximityScore",
 *   0 as "riskScore",
 *   1 as confidence,
 *   NULL as "metadataJson"
 * FROM entity_relationships
 * WHERE (source_entity_id = :entityId!::bigint OR target_entity_id = :entityId!::bigint)
 *   AND (:minWeight::float IS NULL OR proximity_score >= :minWeight)
 *   AND (:minConfidence::float IS NULL OR 1 >= :minConfidence)
 * ORDER BY proximity_score DESC
 * ```
 */
export const getRelationships = new PreparedQuery<IGetRelationshipsParams, IGetRelationshipsResult>(
  getRelationshipsIR,
);

/** 'RebuildAdjacencyCache' parameters type */
export type IRebuildAdjacencyCacheParams = void;

/** 'RebuildAdjacencyCache' return type */
export type IRebuildAdjacencyCacheResult = void;

/** 'RebuildAdjacencyCache' query type */
export interface IRebuildAdjacencyCacheQuery {
  params: IRebuildAdjacencyCacheParams;
  result: IRebuildAdjacencyCacheResult;
}

const rebuildAdjacencyCacheIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    "INSERT INTO entity_adjacency (entity_id, neighbor_id, weight, bridge_score, relationship_types)\nSELECT \n  s.canonical_id as entity_id,\n  t.canonical_id as neighbor_id,\n  MAX(er.proximity_score) as weight,\n  CASE WHEN s.community_id != t.community_id THEN 1.0 ELSE 0.0 END as bridge_score,\n  STRING_AGG(DISTINCT er.relationship_type, ',') as relationship_types\nFROM entity_relationships er\nJOIN entities s ON er.source_entity_id = s.id\nJOIN entities t ON er.target_entity_id = t.id\nWHERE s.canonical_id != t.canonical_id\nGROUP BY s.canonical_id, t.canonical_id, s.community_id, t.community_id\nON CONFLICT (entity_id, neighbor_id) DO UPDATE SET\n  weight = EXCLUDED.weight,\n  bridge_score = EXCLUDED.bridge_score,\n  relationship_types = EXCLUDED.relationship_types",
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO entity_adjacency (entity_id, neighbor_id, weight, bridge_score, relationship_types)
 * SELECT
 *   s.canonical_id as entity_id,
 *   t.canonical_id as neighbor_id,
 *   MAX(er.proximity_score) as weight,
 *   CASE WHEN s.community_id != t.community_id THEN 1.0 ELSE 0.0 END as bridge_score,
 *   STRING_AGG(DISTINCT er.relationship_type, ',') as relationship_types
 * FROM entity_relationships er
 * JOIN entities s ON er.source_entity_id = s.id
 * JOIN entities t ON er.target_entity_id = t.id
 * WHERE s.canonical_id != t.canonical_id
 * GROUP BY s.canonical_id, t.canonical_id, s.community_id, t.community_id
 * ON CONFLICT (entity_id, neighbor_id) DO UPDATE SET
 *   weight = EXCLUDED.weight,
 *   bridge_score = EXCLUDED.bridge_score,
 *   relationship_types = EXCLUDED.relationship_types
 * ```
 */
export const rebuildAdjacencyCache = new PreparedQuery<
  IRebuildAdjacencyCacheParams,
  IRebuildAdjacencyCacheResult
>(rebuildAdjacencyCacheIR);

/** 'GetEntityCanonical' parameters type */
export interface IGetEntityCanonicalParams {
  id: NumberOrString;
}

/** 'GetEntityCanonical' return type */
export interface IGetEntityCanonicalResult {
  cid: string | null;
}

/** 'GetEntityCanonical' query type */
export interface IGetEntityCanonicalQuery {
  params: IGetEntityCanonicalParams;
  result: IGetEntityCanonicalResult;
}

const getEntityCanonicalIR: any = {
  usedParamSet: { id: true },
  params: [{ name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 66, b: 69 }] }],
  statement: 'SELECT COALESCE(canonical_id, id) as cid FROM entities WHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COALESCE(canonical_id, id) as cid FROM entities WHERE id = :id!
 * ```
 */
export const getEntityCanonical = new PreparedQuery<
  IGetEntityCanonicalParams,
  IGetEntityCanonicalResult
>(getEntityCanonicalIR);

/** 'GetEntityDetailsAggregated' parameters type */
export interface IGetEntityDetailsAggregatedParams {
  canonicalId: NumberOrString;
}

/** 'GetEntityDetailsAggregated' return type */
export interface IGetEntityDetailsAggregatedResult {
  fullName: string | null;
  id: string | null;
  primaryRole: string | null;
  redFlagRating: number | null;
}

/** 'GetEntityDetailsAggregated' query type */
export interface IGetEntityDetailsAggregatedQuery {
  params: IGetEntityDetailsAggregatedParams;
  result: IGetEntityDetailsAggregatedResult;
}

const getEntityDetailsAggregatedIR: any = {
  usedParamSet: { canonicalId: true },
  params: [
    {
      name: 'canonicalId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 189, b: 201 }],
    },
  ],
  statement:
    'SELECT \n    canonical_id as id, \n    MAX(full_name) as "fullName", \n    MAX(primary_role) as "primaryRole", \n    MAX(red_flag_rating) as "redFlagRating"\nFROM entities \nWHERE canonical_id = :canonicalId!\nGROUP BY canonical_id',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     canonical_id as id,
 *     MAX(full_name) as "fullName",
 *     MAX(primary_role) as "primaryRole",
 *     MAX(red_flag_rating) as "redFlagRating"
 * FROM entities
 * WHERE canonical_id = :canonicalId!
 * GROUP BY canonical_id
 * ```
 */
export const getEntityDetailsAggregated = new PreparedQuery<
  IGetEntityDetailsAggregatedParams,
  IGetEntityDetailsAggregatedResult
>(getEntityDetailsAggregatedIR);

/** Query 'GetTopPhotoForEntity' is invalid, so its result is assigned type 'never'.
 *  */
export type IGetTopPhotoForEntityResult = never;

/** Query 'GetTopPhotoForEntity' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IGetTopPhotoForEntityParams = never;

const getTopPhotoForEntityIR: any = {
  usedParamSet: { entityId: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 111, b: 120 }] },
  ],
  statement:
    "SELECT mi.id\nFROM media_item_people mip\nJOIN media_items mi ON mip.media_item_id = mi.id\nWHERE mip.entity_id = :entityId!::bigint\nAND (mi.file_type LIKE 'image/%' OR mi.file_type IS NULL)\nORDER BY mi.red_flag_rating DESC, mi.id DESC\nLIMIT 1",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT mi.id
 * FROM media_item_people mip
 * JOIN media_items mi ON mip.media_item_id = mi.id
 * WHERE mip.entity_id = :entityId!::bigint
 * AND (mi.file_type LIKE 'image/%' OR mi.file_type IS NULL)
 * ORDER BY mi.red_flag_rating DESC, mi.id DESC
 * LIMIT 1
 * ```
 */
export const getTopPhotoForEntity = new PreparedQuery<
  IGetTopPhotoForEntityParams,
  IGetTopPhotoForEntityResult
>(getTopPhotoForEntityIR);

/** 'GetNeighborsCached' parameters type */
export interface IGetNeighborsCachedParams {
  entityId: NumberOrString;
  limit: NumberOrString;
}

/** 'GetNeighborsCached' return type */
export interface IGetNeighborsCachedResult {
  bridgeScore: number | null;
  proximityScore: number | null;
  relationshipTypes: string | null;
  targetId: string;
}

/** 'GetNeighborsCached' query type */
export interface IGetNeighborsCachedQuery {
  params: IGetNeighborsCachedParams;
  result: IGetNeighborsCachedResult;
}

const getNeighborsCachedIR: any = {
  usedParamSet: { entityId: true, limit: true },
  params: [
    { name: 'entityId', required: true, transform: { type: 'scalar' }, locs: [{ a: 184, b: 193 }] },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 241, b: 247 }] },
  ],
  statement:
    'SELECT \n  neighbor_id as "targetId",\n  weight as "proximityScore",\n  bridge_score as "bridgeScore",\n  relationship_types as "relationshipTypes"\nFROM entity_adjacency\nWHERE entity_id = :entityId!\nORDER BY bridge_score DESC, weight DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   neighbor_id as "targetId",
 *   weight as "proximityScore",
 *   bridge_score as "bridgeScore",
 *   relationship_types as "relationshipTypes"
 * FROM entity_adjacency
 * WHERE entity_id = :entityId!
 * ORDER BY bridge_score DESC, weight DESC
 * LIMIT :limit!
 * ```
 */
export const getNeighborsCached = new PreparedQuery<
  IGetNeighborsCachedParams,
  IGetNeighborsCachedResult
>(getNeighborsCachedIR);

/** 'GetRelationshipStats' parameters type */
export type IGetRelationshipStatsParams = void;

/** 'GetRelationshipStats' return type */
export interface IGetRelationshipStatsResult {
  avgConfidence: number | null;
  avgProximityScore: number | null;
  avgRiskScore: number | null;
  totalRelationships: string | null;
}

/** 'GetRelationshipStats' query type */
export interface IGetRelationshipStatsQuery {
  params: IGetRelationshipStatsParams;
  result: IGetRelationshipStatsResult;
}

const getRelationshipStatsIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT \n  COUNT(*) as "totalRelationships",\n  AVG(proximity_score) as "avgProximityScore",\n  0 as "avgRiskScore",\n  1 as "avgConfidence"\nFROM entity_relationships',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   COUNT(*) as "totalRelationships",
 *   AVG(proximity_score) as "avgProximityScore",
 *   0 as "avgRiskScore",
 *   1 as "avgConfidence"
 * FROM entity_relationships
 * ```
 */
export const getRelationshipStats = new PreparedQuery<
  IGetRelationshipStatsParams,
  IGetRelationshipStatsResult
>(getRelationshipStatsIR);

/** 'GetTopEntitiesByRelationshipCount' parameters type */
export interface IGetTopEntitiesByRelationshipCountParams {
  limit: NumberOrString;
}

/** 'GetTopEntitiesByRelationshipCount' return type */
export interface IGetTopEntitiesByRelationshipCountResult {
  count: string | null;
  entityId: string;
}

/** 'GetTopEntitiesByRelationshipCount' query type */
export interface IGetTopEntitiesByRelationshipCountQuery {
  params: IGetTopEntitiesByRelationshipCountParams;
  result: IGetTopEntitiesByRelationshipCountResult;
}

const getTopEntitiesByRelationshipCountIR: any = {
  usedParamSet: { limit: true },
  params: [
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 135, b: 141 }] },
  ],
  statement:
    'SELECT source_entity_id as "entityId", COUNT(*) as count\nFROM entity_relationships\nGROUP BY source_entity_id\nORDER BY count DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT source_entity_id as "entityId", COUNT(*) as count
 * FROM entity_relationships
 * GROUP BY source_entity_id
 * ORDER BY count DESC
 * LIMIT :limit!
 * ```
 */
export const getTopEntitiesByRelationshipCount = new PreparedQuery<
  IGetTopEntitiesByRelationshipCountParams,
  IGetTopEntitiesByRelationshipCountResult
>(getTopEntitiesByRelationshipCountIR);
