import { searchQueries } from '@epstein/db';
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
    const searchTerm = query.trim();
    if (!searchTerm) return { entities: [], documents: [] };

    const safeLimit = Math.min(200, Math.max(1, limit));
    const isPrefix = filters.mode === 'prefix';

    const tsArg = isPrefix ? buildPrefixQuery(searchTerm) : searchTerm;

    // ── Entities ─────────────────────────────────────────────────────────────
    const entityRows = isPrefix
      ? await searchQueries.searchEntitiesPrefix.run(
          { searchTerm: tsArg, limit: BigInt(safeLimit) },
          getApiPool(),
        )
      : await searchQueries.searchEntities.run(
          { searchTerm: tsArg, limit: BigInt(safeLimit) },
          getApiPool(),
        );

    // ── Documents ─────────────────────────────────────────────────────────────
    let minRedFlag: number | null = null;
    let maxRedFlag: number | null = null;

    if (filters.redFlagBand === 'high') {
      minRedFlag = 4;
    } else if (filters.redFlagBand === 'medium') {
      minRedFlag = 2;
      maxRedFlag = 3;
    } else if (filters.redFlagBand === 'low') {
      maxRedFlag = 1;
    }

    const docRows = isPrefix
      ? await searchQueries.searchDocumentsPrefix.run(
          {
            searchTerm: tsArg,
            limit: BigInt(safeLimit),
            evidenceType:
              filters.evidenceType && filters.evidenceType !== 'ALL'
                ? filters.evidenceType.toLowerCase()
                : null,
            minRedFlag,
            maxRedFlag,
          },
          getApiPool(),
        )
      : await searchQueries.searchDocuments.run(
          {
            searchTerm: tsArg,
            limit: BigInt(safeLimit),
            evidenceType:
              filters.evidenceType && filters.evidenceType !== 'ALL'
                ? filters.evidenceType.toLowerCase()
                : null,
            minRedFlag,
            maxRedFlag,
          },
          getApiPool(),
        );

    return {
      entities: entityRows.map((row) => {
        const aliases = parseEntityAliases(row.aliases);
        return {
          id: String(row.id),
          fullName: row.fullName,
          canonicalName: row.fullName,
          name: row.fullName,
          primaryRole: row.primaryRole,
          title: row.primaryRole,
          aliases,
          matchedAlias: resolveMatchedAlias(searchTerm, row.fullName || '', aliases),
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
      documents: docRows.map((row) => ({
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
    const searchTerm = query.trim();
    if (!searchTerm) return [];

    const safeLimit = Math.min(100, Math.max(1, limit));

    try {
      const rows = await searchQueries.searchSentences.run(
        { searchTerm, limit: BigInt(safeLimit) },
        getApiPool(),
      );
      return rows;
    } catch (error) {
      console.error('[searchRepository] searchSentences error:', error);
      return [];
    }
  },
};
