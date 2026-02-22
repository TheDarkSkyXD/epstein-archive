import { getApiPool } from './connection.js';

const normalizeAliasValue = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parseEntityAliases = (aliases: string | null | undefined): string[] => {
  if (!aliases) return [];
  try {
    const parsed = JSON.parse(aliases);
    if (Array.isArray(parsed)) return parsed.map((e) => String(e || '').trim()).filter(Boolean);
  } catch {
    /* fall through */
  }
  return String(aliases)
    .split(/[;,|]/)
    .map((e) => e.trim())
    .filter(Boolean);
};

const resolveMatchedAlias = (
  searchTerm: string,
  canonicalName: string,
  aliases: string[],
): string | null => {
  const n = normalizeAliasValue(searchTerm);
  if (!n) return null;
  if (normalizeAliasValue(canonicalName) === n) return null;
  return (
    aliases.find((a) => normalizeAliasValue(a) === n) ||
    aliases.find((a) => normalizeAliasValue(a).includes(n)) ||
    null
  );
};

/**
 * Build a Postgres tsquery for autocomplete / prefix mode.
 * Only used when mode=prefix; default is websearch_to_tsquery.
 * Safe — strips non-alphanumeric characters before building.
 */
function buildPrefixQuery(phrase: string): string {
  const tokens = phrase
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9_]/g, ''))
    .filter((w) => w.length > 1);
  return tokens.length > 0 ? tokens.map((w) => `${w}:*`).join(' & ') : "'a'";
}

export const searchRepository = {
  search: async (
    query: string,
    limit: number = 50,
    filters: { evidenceType?: string; redFlagBand?: string; mode?: 'web' | 'prefix' } = {},
  ) => {
    const pool = getApiPool();
    const searchTerm = query.trim();
    if (!searchTerm) return { entities: [], documents: [] };

    const safeLimit = Math.min(200, Math.max(1, limit));
    const isPrefix = filters.mode === 'prefix';

    // websearch_to_tsquery handles: "quoted phrases", negation, OR, multi-word
    // to_tsquery(prefix) handles autocomplete (:* suffix)
    const tsFunc = isPrefix ? 'to_tsquery' : 'websearch_to_tsquery';
    const tsArg = isPrefix ? buildPrefixQuery(searchTerm) : searchTerm;

    // ── Entities ─────────────────────────────────────────────────────────────
    const entityRes = await pool.query<any>(
      `
      SELECT
        e.id,
        e.full_name          AS "fullName",
        e.primary_role       AS "primaryRole",
        e.aliases,
        e.red_flag_rating    AS "redFlagRating",
        ts_rank_cd(e.fts_vector, query, 32) AS rank
      FROM entities e, ${tsFunc}('english', $1) query
      WHERE e.fts_vector @@ query
        AND COALESCE(e.junk_tier, 'clean') = 'clean'
        AND COALESCE(e.quarantine_status, 0) = 0
      ORDER BY rank DESC
      LIMIT $2
    `,
      [tsArg, safeLimit],
    );

    // ── Documents ─────────────────────────────────────────────────────────────
    const docValues: any[] = [tsArg];
    let docSql = `
      SELECT
        d.id,
        d.file_name           AS "fileName",
        d.file_path           AS "filePath",
        d.evidence_type       AS "evidenceType",
        d.red_flag_rating     AS "redFlagRating",
        ts_headline('english',
          coalesce(d.title, '') || ' ' || left(coalesce(d.content, ''), 500),
          query,
          'MaxWords=25,MinWords=8,ShortWord=3,HighlightAll=FALSE,MaxFragments=2'
        ) AS snippet,
        ts_rank_cd(d.fts_vector, query, 32) AS rank
      FROM documents d, ${tsFunc}('english', $1) query
      WHERE d.fts_vector @@ query
    `;

    if (filters.evidenceType && filters.evidenceType !== 'ALL') {
      docValues.push(filters.evidenceType.toLowerCase());
      docSql += ` AND d.evidence_type = $${docValues.length}`;
    }
    if (filters.redFlagBand === 'high') docSql += ` AND d.red_flag_rating >= 4`;
    else if (filters.redFlagBand === 'medium')
      docSql += ` AND d.red_flag_rating >= 2 AND d.red_flag_rating < 4`;
    else if (filters.redFlagBand === 'low') docSql += ` AND d.red_flag_rating < 2`;

    docValues.push(safeLimit);
    docSql += ` ORDER BY rank DESC LIMIT $${docValues.length}`;

    const docRes = await pool.query<any>(docSql, docValues);

    return {
      entities: entityRes.rows.map((row) => {
        const aliases = parseEntityAliases(row.aliases);
        return {
          id: String(row.id),
          fullName: row.fullName,
          canonicalName: row.fullName,
          name: row.fullName,
          primaryRole: row.primaryRole,
          title: row.primaryRole,
          aliases,
          matchedAlias: resolveMatchedAlias(searchTerm, row.fullName, aliases),
          entityType: 'Person',
          secondaryRoles: [],
          likelihoodLevel: 0,
          mentions: 0,
          currentStatus: null,
          connectionsSummary: null,
          redFlagRating: row.redFlagRating,
          redFlagScore: null,
          redFlagIndicators: [],
          redFlagDescription: null,
          titleVariants: [],
          evidenceTypes: [],
        };
      }),
      documents: docRes.rows.map((row) => ({
        id: String(row.id),
        fileName: row.fileName,
        title: row.fileName,
        filePath: row.filePath,
        fileType: null,
        evidenceType: row.evidenceType,
        fileSize: null,
        dateCreated: null,
        wordCount: null,
        redFlagRating: row.redFlagRating,
        createdAt: null,
        snippet: row.snippet,
      })),
    };
  },

  searchSentences: async (query: string, limit: number = 20) => {
    const pool = getApiPool();
    const searchTerm = query.trim();
    if (!searchTerm) return [];

    const safeLimit = Math.min(100, Math.max(1, limit));

    try {
      const res = await pool.query<any>(
        `
        SELECT
          s.id,
          s.document_id,
          s.page_id,
          s.sentence_text,
          s.signal_score,
          d.file_name,
          COALESCE(p.page_number, 1) AS page_number,
          ts_headline('english', s.sentence_text, query,
            'MaxWords=15,MinWords=5') AS snippet
        FROM document_sentences s
        JOIN documents d ON d.id = s.document_id
        LEFT JOIN document_pages p ON p.id = s.page_id,
        websearch_to_tsquery('english', $1) query
        WHERE to_tsvector('english', s.sentence_text) @@ query
        ORDER BY ts_rank_cd(to_tsvector('english', s.sentence_text), query, 32) DESC
        LIMIT $2
      `,
        [searchTerm, safeLimit],
      );
      return res.rows;
    } catch (error) {
      console.error('[searchRepository] searchSentences error:', error);
      return [];
    }
  },
};
