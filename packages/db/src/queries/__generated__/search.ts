/** Types generated for queries found in "src/queries/search.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'SearchEntities' parameters type */
export interface ISearchEntitiesParams {
  limit: NumberOrString;
  searchTerm: string;
}

/** 'SearchEntities' return type */
export interface ISearchEntitiesResult {
  aliases: string | null;
  fullName: string;
  id: string;
  primaryRole: string | null;
  rank: number | null;
  redFlagRating: number | null;
}

/** 'SearchEntities' query type */
export interface ISearchEntitiesQuery {
  params: ISearchEntitiesParams;
  result: ISearchEntitiesResult;
}

const searchEntitiesIR: any = {
  usedParamSet: { searchTerm: true, limit: true },
  params: [
    {
      name: 'searchTerm',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 209, b: 220 },
        { a: 306, b: 317 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 435, b: 441 }] },
  ],
  statement:
    "SELECT\n  e.id,\n  e.full_name          AS \"fullName\",\n  e.primary_role       AS \"primaryRole\",\n  e.aliases,\n  e.red_flag_rating    AS \"redFlagRating\",\n  ts_rank_cd(e.fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank\nFROM entities e\nWHERE e.fts_vector @@ websearch_to_tsquery('english', :searchTerm!)\n  AND COALESCE(e.junk_tier, 'clean') = 'clean'\n  AND COALESCE(e.quarantine_status, 0) = 0\nORDER BY rank DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   e.id,
 *   e.full_name          AS "fullName",
 *   e.primary_role       AS "primaryRole",
 *   e.aliases,
 *   e.red_flag_rating    AS "redFlagRating",
 *   ts_rank_cd(e.fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank
 * FROM entities e
 * WHERE e.fts_vector @@ websearch_to_tsquery('english', :searchTerm!)
 *   AND COALESCE(e.junk_tier, 'clean') = 'clean'
 *   AND COALESCE(e.quarantine_status, 0) = 0
 * ORDER BY rank DESC
 * LIMIT :limit!
 * ```
 */
export const searchEntities = new PreparedQuery<ISearchEntitiesParams, ISearchEntitiesResult>(
  searchEntitiesIR,
);

/** 'SearchEntitiesPrefix' parameters type */
export interface ISearchEntitiesPrefixParams {
  limit: NumberOrString;
  searchTerm: string;
}

/** 'SearchEntitiesPrefix' return type */
export interface ISearchEntitiesPrefixResult {
  aliases: string | null;
  fullName: string;
  id: string;
  primaryRole: string | null;
  rank: number | null;
  redFlagRating: number | null;
}

/** 'SearchEntitiesPrefix' query type */
export interface ISearchEntitiesPrefixQuery {
  params: ISearchEntitiesPrefixParams;
  result: ISearchEntitiesPrefixResult;
}

const searchEntitiesPrefixIR: any = {
  usedParamSet: { searchTerm: true, limit: true },
  params: [
    {
      name: 'searchTerm',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 199, b: 210 },
        { a: 286, b: 297 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 415, b: 421 }] },
  ],
  statement:
    "SELECT\n  e.id,\n  e.full_name          AS \"fullName\",\n  e.primary_role       AS \"primaryRole\",\n  e.aliases,\n  e.red_flag_rating    AS \"redFlagRating\",\n  ts_rank_cd(e.fts_vector, to_tsquery('english', :searchTerm!), 32) AS rank\nFROM entities e\nWHERE e.fts_vector @@ to_tsquery('english', :searchTerm!)\n  AND COALESCE(e.junk_tier, 'clean') = 'clean'\n  AND COALESCE(e.quarantine_status, 0) = 0\nORDER BY rank DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   e.id,
 *   e.full_name          AS "fullName",
 *   e.primary_role       AS "primaryRole",
 *   e.aliases,
 *   e.red_flag_rating    AS "redFlagRating",
 *   ts_rank_cd(e.fts_vector, to_tsquery('english', :searchTerm!), 32) AS rank
 * FROM entities e
 * WHERE e.fts_vector @@ to_tsquery('english', :searchTerm!)
 *   AND COALESCE(e.junk_tier, 'clean') = 'clean'
 *   AND COALESCE(e.quarantine_status, 0) = 0
 * ORDER BY rank DESC
 * LIMIT :limit!
 * ```
 */
export const searchEntitiesPrefix = new PreparedQuery<
  ISearchEntitiesPrefixParams,
  ISearchEntitiesPrefixResult
>(searchEntitiesPrefixIR);

/** 'SearchDocuments' parameters type */
export interface ISearchDocumentsParams {
  evidenceType?: string | null | void;
  limit: NumberOrString;
  maxRedFlag?: number | null | void;
  minRedFlag?: number | null | void;
  searchTerm: string;
}

/** 'SearchDocuments' return type */
export interface ISearchDocumentsResult {
  evidenceType: string | null;
  fileName: string | null;
  filePath: string | null;
  id: string;
  rank: number | null;
  redFlagRating: number | null;
  snippet: string | null;
}

/** 'SearchDocuments' query type */
export interface ISearchDocumentsQuery {
  params: ISearchDocumentsParams;
  result: ISearchDocumentsResult;
}

const searchDocumentsIR: any = {
  usedParamSet: {
    searchTerm: true,
    evidenceType: true,
    minRedFlag: true,
    maxRedFlag: true,
    limit: true,
  },
  params: [
    {
      name: 'searchTerm',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 321, b: 332 },
        { a: 486, b: 497 },
        { a: 584, b: 595 },
      ],
    },
    {
      name: 'evidenceType',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 605, b: 617 },
        { a: 654, b: 666 },
      ],
    },
    {
      name: 'minRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 682, b: 692 },
        { a: 731, b: 741 },
      ],
    },
    {
      name: 'maxRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 756, b: 766 },
        { a: 805, b: 815 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 848, b: 854 }] },
  ],
  statement:
    "SELECT\n  d.id,\n  d.file_name           AS \"fileName\",\n  d.file_path           AS \"filePath\",\n  d.evidence_type       AS \"evidenceType\",\n  d.red_flag_rating     AS \"redFlagRating\",\n  ts_headline('english',\n    coalesce(d.title, '') || ' ' || left(coalesce(d.content_refined, ''), 500),\n    websearch_to_tsquery('english', :searchTerm!),\n    'MaxWords=25,MinWords=8,ShortWord=3,HighlightAll=FALSE,MaxFragments=2'\n  ) AS snippet,\n  ts_rank_cd(d.fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank\nFROM documents d\nWHERE d.fts_vector @@ websearch_to_tsquery('english', :searchTerm!)\n  AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType::text)\n  AND (:minRedFlag::int IS NULL OR d.red_flag_rating >= :minRedFlag::int)\n  AND (:maxRedFlag::int IS NULL OR d.red_flag_rating <= :maxRedFlag::int)\nORDER BY rank DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   d.id,
 *   d.file_name           AS "fileName",
 *   d.file_path           AS "filePath",
 *   d.evidence_type       AS "evidenceType",
 *   d.red_flag_rating     AS "redFlagRating",
 *   ts_headline('english',
 *     coalesce(d.title, '') || ' ' || left(coalesce(d.content_refined, ''), 500),
 *     websearch_to_tsquery('english', :searchTerm!),
 *     'MaxWords=25,MinWords=8,ShortWord=3,HighlightAll=FALSE,MaxFragments=2'
 *   ) AS snippet,
 *   ts_rank_cd(d.fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank
 * FROM documents d
 * WHERE d.fts_vector @@ websearch_to_tsquery('english', :searchTerm!)
 *   AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType::text)
 *   AND (:minRedFlag::int IS NULL OR d.red_flag_rating >= :minRedFlag::int)
 *   AND (:maxRedFlag::int IS NULL OR d.red_flag_rating <= :maxRedFlag::int)
 * ORDER BY rank DESC
 * LIMIT :limit!
 * ```
 */
export const searchDocuments = new PreparedQuery<ISearchDocumentsParams, ISearchDocumentsResult>(
  searchDocumentsIR,
);

/** 'SearchDocumentsPrefix' parameters type */
export interface ISearchDocumentsPrefixParams {
  evidenceType?: string | null | void;
  limit: NumberOrString;
  maxRedFlag?: number | null | void;
  minRedFlag?: number | null | void;
  searchTerm: string;
}

/** 'SearchDocumentsPrefix' return type */
export interface ISearchDocumentsPrefixResult {
  evidenceType: string | null;
  fileName: string | null;
  filePath: string | null;
  id: string;
  rank: number | null;
  redFlagRating: number | null;
  snippet: string | null;
}

/** 'SearchDocumentsPrefix' query type */
export interface ISearchDocumentsPrefixQuery {
  params: ISearchDocumentsPrefixParams;
  result: ISearchDocumentsPrefixResult;
}

const searchDocumentsPrefixIR: any = {
  usedParamSet: {
    searchTerm: true,
    evidenceType: true,
    minRedFlag: true,
    maxRedFlag: true,
    limit: true,
  },
  params: [
    {
      name: 'searchTerm',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 311, b: 322 },
        { a: 466, b: 477 },
        { a: 554, b: 565 },
      ],
    },
    {
      name: 'evidenceType',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 575, b: 587 },
        { a: 624, b: 636 },
      ],
    },
    {
      name: 'minRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 652, b: 662 },
        { a: 701, b: 711 },
      ],
    },
    {
      name: 'maxRedFlag',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 726, b: 736 },
        { a: 775, b: 785 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 818, b: 824 }] },
  ],
  statement:
    "SELECT\n  d.id,\n  d.file_name           AS \"fileName\",\n  d.file_path           AS \"filePath\",\n  d.evidence_type       AS \"evidenceType\",\n  d.red_flag_rating     AS \"redFlagRating\",\n  ts_headline('english',\n    coalesce(d.title, '') || ' ' || left(coalesce(d.content_refined, ''), 500),\n    to_tsquery('english', :searchTerm!),\n    'MaxWords=25,MinWords=8,ShortWord=3,HighlightAll=FALSE,MaxFragments=2'\n  ) AS snippet,\n  ts_rank_cd(d.fts_vector, to_tsquery('english', :searchTerm!), 32) AS rank\nFROM documents d\nWHERE d.fts_vector @@ to_tsquery('english', :searchTerm!)\n  AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType::text)\n  AND (:minRedFlag::int IS NULL OR d.red_flag_rating >= :minRedFlag::int)\n  AND (:maxRedFlag::int IS NULL OR d.red_flag_rating <= :maxRedFlag::int)\nORDER BY rank DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   d.id,
 *   d.file_name           AS "fileName",
 *   d.file_path           AS "filePath",
 *   d.evidence_type       AS "evidenceType",
 *   d.red_flag_rating     AS "redFlagRating",
 *   ts_headline('english',
 *     coalesce(d.title, '') || ' ' || left(coalesce(d.content_refined, ''), 500),
 *     to_tsquery('english', :searchTerm!),
 *     'MaxWords=25,MinWords=8,ShortWord=3,HighlightAll=FALSE,MaxFragments=2'
 *   ) AS snippet,
 *   ts_rank_cd(d.fts_vector, to_tsquery('english', :searchTerm!), 32) AS rank
 * FROM documents d
 * WHERE d.fts_vector @@ to_tsquery('english', :searchTerm!)
 *   AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType::text)
 *   AND (:minRedFlag::int IS NULL OR d.red_flag_rating >= :minRedFlag::int)
 *   AND (:maxRedFlag::int IS NULL OR d.red_flag_rating <= :maxRedFlag::int)
 * ORDER BY rank DESC
 * LIMIT :limit!
 * ```
 */
export const searchDocumentsPrefix = new PreparedQuery<
  ISearchDocumentsPrefixParams,
  ISearchDocumentsPrefixResult
>(searchDocumentsPrefixIR);

/** 'SearchSentences' parameters type */
export interface ISearchSentencesParams {
  limit: NumberOrString;
  searchTerm: string;
}

/** 'SearchSentences' return type */
export interface ISearchSentencesResult {
  document_id: string | null;
  file_name: string | null;
  id: string;
  page_id: string | null;
  page_number: number | null;
  sentence_text: string | null;
  signal_score: number | null;
  snippet: string | null;
}

/** 'SearchSentences' query type */
export interface ISearchSentencesQuery {
  params: ISearchSentencesParams;
  result: ISearchSentencesResult;
}

const searchSentencesIR: any = {
  usedParamSet: { searchTerm: true, limit: true },
  params: [
    {
      name: 'searchTerm',
      required: true,
      transform: { type: 'scalar' },
      locs: [
        { a: 216, b: 227 },
        { a: 467, b: 478 },
        { a: 574, b: 585 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 604, b: 610 }] },
  ],
  statement:
    "SELECT\n  s.id,\n  s.document_id,\n  s.page_id,\n  s.sentence_text,\n  s.signal_score,\n  d.file_name,\n  COALESCE(p.page_number, 1) AS page_number,\n  ts_headline('english', s.sentence_text, websearch_to_tsquery('english', :searchTerm!),\n    'MaxWords=15,MinWords=5') AS snippet\nFROM document_sentences s\nJOIN documents d ON d.id = s.document_id\nLEFT JOIN document_pages p ON p.id = s.page_id\nWHERE to_tsvector('english', s.sentence_text) @@ websearch_to_tsquery('english', :searchTerm!)\nORDER BY ts_rank_cd(to_tsvector('english', s.sentence_text), websearch_to_tsquery('english', :searchTerm!), 32) DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   s.id,
 *   s.document_id,
 *   s.page_id,
 *   s.sentence_text,
 *   s.signal_score,
 *   d.file_name,
 *   COALESCE(p.page_number, 1) AS page_number,
 *   ts_headline('english', s.sentence_text, websearch_to_tsquery('english', :searchTerm!),
 *     'MaxWords=15,MinWords=5') AS snippet
 * FROM document_sentences s
 * JOIN documents d ON d.id = s.document_id
 * LEFT JOIN document_pages p ON p.id = s.page_id
 * WHERE to_tsvector('english', s.sentence_text) @@ websearch_to_tsquery('english', :searchTerm!)
 * ORDER BY ts_rank_cd(to_tsvector('english', s.sentence_text), websearch_to_tsquery('english', :searchTerm!), 32) DESC
 * LIMIT :limit!
 * ```
 */
export const searchSentences = new PreparedQuery<ISearchSentencesParams, ISearchSentencesResult>(
  searchSentencesIR,
);
