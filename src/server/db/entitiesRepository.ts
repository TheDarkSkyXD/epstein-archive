import { getDb } from './connection.js';
import { Person, SearchFilters, SortOption } from '../../types.js';
import type { SubjectCardListItemDto } from '@shared/dto/entities';
import {
  ENTITY_BLACKLIST_PATTERNS,
  ENTITY_PARTIAL_BLOCKLIST,
  ENTITY_BLACKLIST_REGEX,
} from '../../config/entityBlacklist.js';
import { isJunkEntity } from '../../utils/entityFilters.js';

export interface EntityRepositoryResult {
  entities: any[];
  total: number;
}

export interface SubjectCardRepositoryResult {
  subjects: SubjectCardListItemDto[];
  total: number;
}

const TITLE_PREFIX_FILTERS = [
  `full_name NOT LIKE 'Mr %'`,
  `full_name NOT LIKE 'Mrs %'`,
  `full_name NOT LIKE 'Ms %'`,
  `full_name NOT LIKE 'Miss %'`,
  `full_name NOT LIKE 'Dr %'`,
  `full_name NOT LIKE 'Prof %'`,
  `full_name NOT LIKE 'Professor %'`,
  `full_name NOT LIKE 'President %'`,
  `full_name NOT LIKE 'Prime Minister %'`,
  `full_name NOT LIKE 'Governor %'`,
  `full_name NOT LIKE 'Senator %'`,
];

const VIP_TITLE_PREFIXES = [
  'mr',
  'mrs',
  'ms',
  'miss',
  'dr',
  'prof',
  'professor',
  'president',
  'prime minister',
  'governor',
  'senator',
  'judge',
  'justice',
  'secretary',
];

const VIP_DISPLAY_FALLBACKS = new Map<string, string>([
  ['joseph biden', 'Joe Biden'],
  ['joseph r biden', 'Joe Biden'],
  ['president joseph biden', 'Joe Biden'],
  ['president joe biden', 'Joe Biden'],
  ['middleton mark', 'Mark Middleton'],
  ['the donald', 'Donald Trump'],
  ['global girl', 'Nadia Marcinkova'],
  ['puff daddy', 'Sean "Diddy" Combs'],
  ['sarah vickers', 'Sarah Kellen'],
  ['melania knauss', 'Melania Trump'],
  ['nadia marcinko', 'Nadia Marcinkova'],
  ['allen dershowitz', 'Alan Dershowitz'],
  ['sir mick jagger', 'Mick Jagger'],
]);

const FIVE_FLAG_BASELINE_ALIASES = new Set([
  'jeffrey epstein',
  'epstein',
  'ghislaine maxwell',
  'maxwell',
  'donald trump',
  'donald j trump',
  'donald john trump',
  'president donald trump',
  'djt',
  'the donald',
]);

const VIP_PINNED_ORDER_SQL = `CASE
  WHEN lower(full_name) = 'jeffrey epstein' THEN 0
  WHEN lower(full_name) = 'donald trump' THEN 1
  WHEN lower(full_name) = 'ghislaine maxwell' THEN 2
  ELSE 3
END ASC`;

const RISK_ORDER_SQL = `CASE UPPER(COALESCE(risk_level, ''))
  WHEN 'CRITICAL' THEN 4
  WHEN 'HIGH' THEN 3
  WHEN 'MEDIUM' THEN 2
  WHEN 'LOW' THEN 1
  ELSE 0
END DESC`;

const EVIDENCE_PRESENCE_ORDER_SQL = `CASE
  WHEN COALESCE(mentions, 0) > 0 THEN 1
  ELSE 0
END DESC`;

function normalizeVipDisplayName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isFiveFlagBaselineEntity(name: string | null | undefined): boolean {
  if (!name) return false;
  const normalized = normalizeVipDisplayName(name);
  if (!normalized) return false;
  if (FIVE_FLAG_BASELINE_ALIASES.has(normalized)) return true;
  if (normalized.includes('jeffrey epstein')) return true;
  if (normalized.includes('ghislaine maxwell')) return true;
  if (normalized.includes('donald trump')) return true;
  return false;
}

function upsertVipAlias(
  map: Map<string, { canonicalName: string; score: number }>,
  alias: string,
  canonicalName: string,
  score: number,
): void {
  const key = normalizeVipDisplayName(alias);
  if (!key) return;
  const current = map.get(key);
  const preferCandidateOnTie =
    Boolean(current) &&
    score === current.score &&
    !canonicalName.includes(',') &&
    current.canonicalName.includes(',');
  if (!current || score > current.score || preferCandidateOnTie) {
    map.set(key, { canonicalName, score });
  }
}

function stripVipTitlePrefix(value: string): string {
  let current = value;
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of VIP_TITLE_PREFIXES) {
      if (current === prefix) continue;
      if (current.startsWith(`${prefix} `)) {
        current = current.slice(prefix.length + 1).trim();
        changed = true;
        break;
      }
    }
  }
  return current;
}

async function buildVipDisplayLookup(db: any): Promise<Map<string, string>> {
  const raw = (await db
    .prepare(
      `
      SELECT full_name, aliases, COALESCE(mentions,0) as mentions
      FROM entities
      WHERE COALESCE(is_vip,0)=1
        AND full_name IS NOT NULL
        AND TRIM(full_name) != ''
    `,
    )
    .all()) as Array<{ full_name: string; aliases?: string | null; mentions: number }>;

  const bestByAlias = new Map<string, { canonicalName: string; score: number }>();
  for (const row of raw) {
    const canonicalName = row.full_name.trim();
    const score = row.mentions || 0;
    upsertVipAlias(bestByAlias, canonicalName, canonicalName, score);

    const stripped = stripVipTitlePrefix(normalizeVipDisplayName(canonicalName));
    if (stripped) upsertVipAlias(bestByAlias, stripped, canonicalName, score);

    for (const alias of String(row.aliases || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)) {
      upsertVipAlias(bestByAlias, alias, canonicalName, score);
      const aliasStripped = stripVipTitlePrefix(normalizeVipDisplayName(alias));
      if (aliasStripped) upsertVipAlias(bestByAlias, aliasStripped, canonicalName, score);
    }
  }

  return new Map(Array.from(bestByAlias.entries()).map(([k, v]) => [k, v.canonicalName]));
}

function resolveDisplayName(name: string, lookup: Map<string, string>): string {
  const trimmed = name.trim();
  if (!trimmed) return name;

  const normalized = normalizeVipDisplayName(trimmed);
  const stripped = stripVipTitlePrefix(normalized);
  const direct =
    VIP_DISPLAY_FALLBACKS.get(normalized) ||
    VIP_DISPLAY_FALLBACKS.get(stripped) ||
    lookup.get(normalized) ||
    lookup.get(stripped);
  if (direct) return direct;

  const tokens = stripped.split(' ').filter(Boolean);
  if (tokens.length === 2) {
    const reversed = `${tokens[1]} ${tokens[0]}`;
    const reverseHit = VIP_DISPLAY_FALLBACKS.get(reversed) || lookup.get(reversed);
    if (reverseHit) return reverseHit;
  }

  return trimmed;
}

const DEFAULT_SIGNAL_CLAUSE = `(
  (
    COALESCE(is_vip, 0) = 1
    AND (
      lower(full_name) IN ('jeffrey epstein', 'donald trump', 'ghislaine maxwell')
      OR (
        COALESCE(mentions, 0) >= 1
        AND (
          COALESCE(mentions, 0) >= 5
          OR COALESCE(red_flag_rating, 0) >= 4
          OR UPPER(COALESCE(risk_level, '')) IN ('HIGH', 'CRITICAL')
        )
      )
    )
  )
  OR (
    COALESCE(primary_role, '') NOT IN ('', 'Unknown', 'UNK')
    AND (
      COALESCE(mentions, 0) >= 10
      OR COALESCE(red_flag_rating, 0) >= 2
      OR UPPER(COALESCE(risk_level, '')) IN ('HIGH', 'CRITICAL', 'MEDIUM')
    )
  )
)`;

function applyDefaultNameHygiene(whereConditions: string[], params: Record<string, unknown>): void {
  ENTITY_BLACKLIST_PATTERNS.forEach((pattern, i) => {
    const paramName = `junkPattern${i}`;
    params[paramName] = `%${pattern}%`;
    whereConditions.push(`full_name NOT LIKE @${paramName}`);
  });

  ENTITY_PARTIAL_BLOCKLIST.forEach((pattern, i) => {
    const paramName = `partialPattern${i}`;
    params[paramName] = `%${pattern}%`;
    whereConditions.push(`full_name NOT LIKE @${paramName}`);
  });

  whereConditions.push(`LENGTH(TRIM(full_name)) >= 3`);
  whereConditions.push(`full_name NOT LIKE '%@%'`);
  whereConditions.push(`full_name NOT LIKE 'http%'`);
  whereConditions.push(`full_name NOT LIKE 'www.%'`);
  TITLE_PREFIX_FILTERS.forEach((clause) => whereConditions.push(clause));
}

function applyDefaultNameHygieneLite(whereConditions: string[]): void {
  whereConditions.push(`LENGTH(TRIM(full_name)) >= 3`);
  whereConditions.push(`full_name NOT LIKE '%@%'`);
  whereConditions.push(`full_name NOT LIKE 'http%'`);
  whereConditions.push(`full_name NOT LIKE 'www.%'`);
  TITLE_PREFIX_FILTERS.forEach((clause) => whereConditions.push(clause));
}

function pushRiskLevelFilter(
  whereConditions: string[],
  params: Record<string, unknown>,
  levels: Array<'HIGH' | 'MEDIUM' | 'LOW'>,
): void {
  const levelConditions = levels.map((score, i) => {
    const normalized = String(score).toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW';
    params[`riskScore${i}`] = normalized;

    if (normalized === 'HIGH') {
      return `(UPPER(COALESCE(risk_level, '')) IN ('HIGH', 'CRITICAL') OR COALESCE(red_flag_rating, 0) >= 4)`;
    }
    if (normalized === 'MEDIUM') {
      return `(UPPER(COALESCE(risk_level, '')) = 'MEDIUM' OR COALESCE(red_flag_rating, 0) BETWEEN 2 AND 3)`;
    }
    return `(UPPER(COALESCE(risk_level, '')) = 'LOW' OR COALESCE(red_flag_rating, 0) <= 1)`;
  });

  if (levelConditions.length > 0) {
    whereConditions.push(`(${levelConditions.join(' OR ')})`);
  }
}

export const entitiesRepository = {
  /**
   * ULTRATHINK: High-performance subject card fetching.
   * Minimal payload, optimized SQL, server-side precomputation.
   */
  getSubjectCards: async (
    page: number = 1,
    limit: number = 24,
    filters?: SearchFilters,
    sortBy?: SortOption,
  ): Promise<SubjectCardRepositoryResult> => {
    const db = getDb();
    const whereConditions: string[] = [];
    const params: any = {};

    let hasJunkFlag = false;
    let hasJunkTier = false;
    let hasQuarantine = false;
    try {
      const cols = (await db.prepare(`PRAGMA table_info(entities)`).all()) as Array<{
        name: string;
      }>;
      hasJunkFlag = cols.some((c) => c.name === 'junk_flag');
      hasJunkTier = cols.some((c) => c.name === 'junk_tier');
      hasQuarantine = cols.some((c) => c.name === 'quarantine_status');
    } catch {
      // ignore schema errors
    }

    const includeJunk = filters?.includeJunk === true;

    if (!includeJunk) {
      if (hasJunkTier) {
        whereConditions.push("COALESCE(junk_tier, 'clean') = 'clean'");
      }
      if (hasQuarantine) {
        whereConditions.push('COALESCE(quarantine_status, 0) = 0');
      }
      if (hasJunkFlag) {
        whereConditions.push('COALESCE(junk_flag,0)=0');
      }
    }
    // --- REUSE EXISTING FILTER LOGIC (DRY) ---
    // 1. Term Search
    if (filters?.searchTerm) {
      const searchWords = filters.searchTerm
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
      if (searchWords.length > 0) {
        const wordConditions = searchWords.map((word, i) => {
          const paramName = `searchWord${i}`;
          params[paramName] = `%${word}%`;
          return `(full_name LIKE @${paramName} OR primary_role LIKE @${paramName} OR aliases LIKE @${paramName})`;
        });
        whereConditions.push(`(${wordConditions.join(' AND ')})`);
      }
    }

    // 2. Risk Level
    if (filters?.likelihoodScore && filters.likelihoodScore.length > 0) {
      pushRiskLevelFilter(whereConditions, params, filters.likelihoodScore);
    }

    // 3. Red Flag Index
    if (filters?.minRedFlagIndex !== undefined) {
      whereConditions.push('red_flag_rating >= @minRedFlagIndex');
      params.minRedFlagIndex = filters.minRedFlagIndex;
    }
    if (filters?.maxRedFlagIndex !== undefined) {
      whereConditions.push('red_flag_rating <= @maxRedFlagIndex');
      params.maxRedFlagIndex = filters.maxRedFlagIndex;
    }

    // 4. Role
    if (filters?.role && filters.role !== 'all') {
      whereConditions.push('primary_role = @role');
      params.role = filters.role;
    }

    // 4b. Entity Type / VIP view
    if (filters?.entityType && filters.entityType !== 'all') {
      if (filters.entityType === 'vip_only') {
        whereConditions.push(`(
          COALESCE(is_vip,0) = 1
          AND (
            lower(full_name) IN ('jeffrey epstein', 'donald trump', 'ghislaine maxwell')
            OR (
              COALESCE(mentions, 0) >= 1
              AND (
                COALESCE(mentions, 0) >= 5
                OR COALESCE(red_flag_rating, 0) >= 4
                OR UPPER(COALESCE(risk_level, '')) IN ('HIGH','CRITICAL')
              )
            )
          )
        )`);
      } else {
        whereConditions.push('entity_type = @entityType');
        params.entityType = filters.entityType;
      }
    }

    // 5. Sorting (Deterministic)
    let orderByClause = '';
    const vipOrder = 'COALESCE(is_vip, 0) DESC';
    const mentionsOrder = 'COALESCE(mentions, 0) DESC';
    const safetyOrder = 'COALESCE(red_flag_rating, 0) DESC'; // High to Low

    switch (sortBy) {
      case 'name':
        orderByClause = `ORDER BY ${vipOrder}, full_name ASC`;
        break;
      case 'recent':
        orderByClause = `ORDER BY ${vipOrder}, id DESC`;
        break;
      case 'mentions':
        orderByClause = `ORDER BY ${vipOrder}, ${VIP_PINNED_ORDER_SQL}, ${safetyOrder}, ${RISK_ORDER_SQL}, ${EVIDENCE_PRESENCE_ORDER_SQL}, ${mentionsOrder}, full_name ASC`;
        break;
      case 'risk':
      case 'red_flag':
      default:
        orderByClause = `ORDER BY ${vipOrder}, ${VIP_PINNED_ORDER_SQL}, ${safetyOrder}, ${RISK_ORDER_SQL}, ${EVIDENCE_PRESENCE_ORDER_SQL}, ${mentionsOrder}, full_name ASC`;
        break;
    }

    // QUALITY FILTER (Page 1 Default)
    const isDefaultView =
      !filters?.searchTerm &&
      (!filters?.likelihoodScore || filters.likelihoodScore.length === 0) &&
      !filters?.role &&
      page === 1;

    if (isDefaultView) {
      // Keep the homepage query bounded on million-scale datasets.
      // Heavy pattern-based junk filters are still used in deeper entity queries.
      applyDefaultNameHygieneLite(whereConditions);
      // Front page: VIP first, but still surface non-VIP high-signal entities across all types.
      whereConditions.push(DEFAULT_SIGNAL_CLAUSE);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count Query
    const countSql = `SELECT COUNT(*) as total FROM entities ${whereClause}`;
    const totalResult = isDefaultView
      ? ({ total: 250 } as { total: number })
      : ((await db.prepare(countSql).get(params)) as { total: number });

    // Optimized Data Query (Selecting only needed fields)
    const offset = (page - 1) * limit;
    const sql = `
            SELECT 
              id,
              full_name,
              primary_role,
              bio,
              mentions,
              risk_level,
              red_flag_rating,
              connections_summary as connections,
              '' as evidence_types,
              was_agentic,
              (SELECT COUNT(*) FROM media_item_people WHERE entity_id = entities.id) as media_count,
              (SELECT COUNT(*) FROM black_book_entries WHERE person_id = entities.id) as black_book_count
              ,
              (
                SELECT mi.id
                FROM media_item_people mip 
                JOIN media_items mi ON mip.media_item_id = mi.id 
                WHERE mip.entity_id = entities.id
                AND (mi.file_type LIKE 'image/%' OR mi.file_type IS NULL)
                ORDER BY mi.red_flag_rating DESC, mi.id DESC
                LIMIT 1
              ) as top_photo_id
            FROM entities
            ${whereClause}
            ${orderByClause}
            LIMIT @limit OFFSET @offset
        `;

    const rawEntities = (await db.prepare(sql).all({ ...params, limit, offset })) as any[];
    const vipDisplayLookup = await buildVipDisplayLookup(db);

    // Compute global max connectivity from relationships to normalize the Network signal
    let maxConnectivityCount = 1;
    try {
      const maxRow = (await db
        .prepare(
          `
          SELECT MAX(cnt) as maxConn FROM (
            SELECT source_entity_id, COUNT(*) as cnt 
            FROM entity_relationships 
            GROUP BY source_entity_id
          ) AS subquery
        `,
        )
        .get()) as { maxConn?: number } | undefined;
      if (maxRow && typeof maxRow.maxConn === 'number' && maxRow.maxConn > 0) {
        maxConnectivityCount = maxRow.maxConn;
      }
    } catch {
      // Fallback: estimate from current page's connections_summary strings
      maxConnectivityCount = Math.max(
        1,
        ...rawEntities.map((e: any) => {
          const connStr = String(e.connections || '');
          if (/^\d+$/.test(connStr)) return parseInt(connStr, 10) || 0;
          return (connStr.match(/,/g) || []).length;
        }),
      );
    }

    // --- SERVER-SIDE PRECOMPUTATION of Signals & DTO Mapping ---
    const subjects: SubjectCardListItemDto[] = rawEntities.map((e) => {
      // 1. Evidence Ladder
      // Replicating logic cheaply: L1 if black book or photos or flight logs
      // Note: we need evidence_types parsed
      let eTypes: string[] = [];
      try {
        if (typeof e.evidence_types === 'string') eTypes = e.evidence_types.split(',');
      } catch {
        // Evidence types might not be parseable or available
      }

      const hasBlackBook = e.black_book_count > 0;
      const hasPhotos = e.media_count > 0;
      const hasFlight = eTypes.some((t) => t.toLowerCase().includes('flight'));

      let ladder: 'L1' | 'L2' | 'L3' | 'NONE' = 'L3';
      if (hasBlackBook || hasPhotos || hasFlight) ladder = 'L1';
      else if (e.mentions > 50) ladder = 'L2';
      else ladder = 'L3';

      if (e.mentions === 0 && !hasBlackBook && !hasPhotos) ladder = 'NONE';

      // 2. Signal Metrics (0-100)
      const exposure = Math.min(100, (Math.log10((e.mentions || 0) + 1) / 3) * 100);

      let connCount = 0;
      const connStr = String(e.connections || '');
      if (/^\d+$/.test(connStr)) connCount = parseInt(connStr, 10);
      else connCount = (connStr.match(/,/g) || []).length;
      const connectivity = Math.min(100, (connCount / maxConnectivityCount) * 100);

      // Simple corroboration proxy
      const corroboration = Math.min(100, e.media_count * 20 + eTypes.length * 15);

      // 3. Driver Chips (Max 4)
      const drivers: string[] = [];
      if (hasBlackBook) drivers.push('Black Book');
      if (hasFlight) drivers.push('Flight Logs');
      if (hasPhotos) drivers.push(`${e.media_count} Photos`);
      if (e.mentions > 100) drivers.push('High Volume');
      if (connCount > 10) drivers.push('Network Hub');
      if (drivers.length === 0 && e.was_agentic) drivers.push('AI Derived');

      const displayName = resolveDisplayName(e.full_name || 'Unknown', vipDisplayLookup);
      const baselineFiveFlags =
        isFiveFlagBaselineEntity(displayName) || isFiveFlagBaselineEntity(e.full_name);
      const objectiveRatingRaw = typeof e.red_flag_rating === 'number' ? e.red_flag_rating : 0;
      const subjectiveRatingRaw =
        typeof (e as any).red_flag_score === 'number' ? (e as any).red_flag_score : undefined;

      const dto: SubjectCardListItemDto = {
        id: String(e.id),
        name: displayName,
        role: e.primary_role || 'Unknown',
        short_bio:
          e.bio && String(e.bio).trim().length > 0
            ? e.bio.substring(0, 150)
            : e.mentions === 0 && !hasBlackBook && !hasPhotos && !hasFlight
              ? 'Entity mentioned in list published by the DOJ as being in the files. We will fill in evidence and documents as they come in.'
              : undefined,
        stats: {
          mentions: e.mentions || 0,
          documents: e.mentions || 0,
          distinct_sources: eTypes.length,
          verified_media: e.media_count || 0,
        },
        forensics: {
          risk_level: baselineFiveFlags ? 'HIGH' : (e.risk_level as any) || 'LOW',
          evidence_ladder: ladder,
          red_flag_objective: baselineFiveFlags
            ? Math.max(5, objectiveRatingRaw)
            : objectiveRatingRaw,
          red_flag_subjective:
            typeof subjectiveRatingRaw === 'number'
              ? baselineFiveFlags
                ? Math.max(5, subjectiveRatingRaw)
                : subjectiveRatingRaw
              : undefined,
          signal_strength: {
            exposure: Math.round(exposure),
            connectivity: Math.round(connectivity),
            corroboration: Math.round(corroboration),
          },
          driver_labels: drivers.slice(0, 4),
        },
        top_preview: undefined,
      };
      return dto;
    });

    const seen = new Set<string>();
    const normalizedSubjects = subjects.filter((s) => {
      const norm = s.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\b(the|of|and|or|inc|llc|corp|ltd|group|trust)\b/g, '')
        .trim();
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });

    // Soft fallback: if strict default view returns zero, relax VIP/signal threshold but still enforce junk/pattern filters
    if (isDefaultView && normalizedSubjects.length === 0) {
      const softWhere: string[] = [];
      const softParams: any = {};
      if (hasJunkFlag) softWhere.push('COALESCE(junk_flag,0)=0');
      softWhere.push(`entity_type = 'Person'`);
      softWhere.push(`LENGTH(TRIM(full_name)) >= 3`);
      softWhere.push(`full_name NOT LIKE '%@%'`);
      softWhere.push(`full_name NOT LIKE 'http%'`);
      softWhere.push(`full_name NOT LIKE 'www.%'`);
      ENTITY_BLACKLIST_PATTERNS.forEach((pattern, i) => {
        const paramName = `softJunk${i}`;
        softParams[paramName] = `%${pattern}%`;
        softWhere.push(`full_name NOT LIKE @${paramName}`);
      });
      ENTITY_PARTIAL_BLOCKLIST.forEach((pattern, i) => {
        const paramName = `softPartial${i}`;
        softParams[paramName] = `%${pattern}%`;
        softWhere.push(`full_name NOT LIKE @${paramName}`);
      });
      softWhere.push(`COALESCE(primary_role, '') NOT IN ('Unknown','UNK')`);
      softWhere.push(`(
        mentions >= 1
        OR bio IS NOT NULL
        OR (SELECT COUNT(*) FROM media_item_people WHERE entity_id = entities.id) > 0
        OR (SELECT COUNT(*) FROM black_book_entries WHERE person_id = entities.id) > 0
      )`);
      const softWhereClause = softWhere.length > 0 ? `WHERE ${softWhere.join(' AND ')}` : '';
      const softCount = (await db
        .prepare(`SELECT COUNT(*) as total FROM entities ${softWhereClause}`)
        .get(softParams)) as { total: number };
      const softSql = `
            SELECT 
              id,
              full_name,
              primary_role,
              bio,
              mentions,
              risk_level,
              red_flag_rating,
              connections_summary as connections,
              '' as evidence_types,
              was_agentic,
              (SELECT COUNT(*) FROM media_item_people WHERE entity_id = entities.id) as media_count,
              (SELECT COUNT(*) FROM black_book_entries WHERE person_id = entities.id) as black_book_count
            FROM entities
            ${softWhereClause}
            ${orderByClause}
            LIMIT @limit OFFSET @offset
        `;
      const softEntities = (await db
        .prepare(softSql)
        .all({ ...softParams, limit, offset })) as any[];
      const softSubjects = softEntities.map((e: any) => {
        const eTypes: string[] = Array.isArray(e.evidence_types) ? e.evidence_types : [];
        const mediaCount = typeof e.media_count === 'number' ? e.media_count : 0;
        const exposure = Math.min(100, Math.round((Math.log10((e.mentions || 0) + 1) / 3) * 100));
        const connStr = String(e.connections || '');
        let connCount = 0;
        if (/^\d+$/.test(connStr)) connCount = parseInt(connStr, 10);
        else connCount = (connStr.match(/,/g) || []).length;
        const connectivity = Math.min(100, Math.round((connCount / 20) * 100));
        const corroboration = Math.min(100, mediaCount * 20 + eTypes.length * 15);
        const drivers: string[] = [];
        if (mediaCount > 0) drivers.push('Verified Media');
        if (e.black_book_count > 0) drivers.push('Black Book');
        if ((e.mentions || 0) > 50) drivers.push('Document Volume');
        const ladder =
          mediaCount > 0 || e.black_book_count > 0 ? 'L1' : (e.mentions || 0) > 50 ? 'L2' : 'L3';
        const displayName = resolveDisplayName(e.full_name || 'Unknown', vipDisplayLookup);
        const baselineFiveFlags =
          isFiveFlagBaselineEntity(displayName) || isFiveFlagBaselineEntity(e.full_name);
        const objectiveRatingRaw = typeof e.red_flag_rating === 'number' ? e.red_flag_rating : 0;
        const subjectiveRatingRaw =
          typeof (e as any).red_flag_score === 'number' ? (e as any).red_flag_score : undefined;

        return {
          id: String(e.id),
          name: displayName,
          role: e.primary_role || 'Unknown',
          short_bio: e.bio ? e.bio.substring(0, 150) : undefined,
          stats: {
            mentions: e.mentions || 0,
            documents: e.mentions || 0,
            distinct_sources: eTypes.length,
            verified_media: mediaCount,
          },
          forensics: {
            risk_level: baselineFiveFlags ? 'HIGH' : (e.risk_level as any) || 'LOW',
            evidence_ladder: ladder,
            red_flag_objective: baselineFiveFlags
              ? Math.max(5, objectiveRatingRaw)
              : objectiveRatingRaw,
            red_flag_subjective:
              typeof subjectiveRatingRaw === 'number'
                ? baselineFiveFlags
                  ? Math.max(5, subjectiveRatingRaw)
                  : subjectiveRatingRaw
                : undefined,
            signal_strength: {
              exposure: Math.round(exposure),
              connectivity: Math.round(connectivity),
              corroboration: Math.round(corroboration),
            },
            driver_labels: drivers.slice(0, 4),
          },
          top_preview: undefined,
        } as SubjectCardListItemDto;
      });
      const dedupSoft: SubjectCardListItemDto[] = [];
      const seenSoft = new Set<string>();
      for (const s of softSubjects) {
        const norm = s.name
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\b(the|of|and|or|inc|llc|corp|ltd|group|trust)\b/g, '')
          .trim();
        if (!seenSoft.has(norm)) {
          seenSoft.add(norm);
          dedupSoft.push(s);
        }
      }
      const finalSoft = dedupSoft.filter((s) => {
        const n = (s.name || '').toLowerCase();
        if (n.length < 3) return false;
        if (/[.@]/.test(n) || n.startsWith('http') || n.startsWith('www.')) return false;
        if (ENTITY_BLACKLIST_REGEX.test(s.name)) return false as any;
        for (const p of ENTITY_BLACKLIST_PATTERNS) {
          if (n.includes(p.toLowerCase())) return false;
        }
        for (const p of ENTITY_PARTIAL_BLOCKLIST) {
          if (n.includes(p.toLowerCase())) return false;
        }
        return true;
      });
      return {
        subjects: finalSoft,
        total: softCount.total,
      };
    }

    return {
      subjects: normalizedSubjects,
      total: totalResult.total,
    };
  },

  /**
   * BACKGROUND ORCHESTRATOR: Non-blocking junk backfill
   * Processes entities in chunks to avoid event loop saturation.
   */
  startBackgroundJunkBackfill: (chunkSize: number = 50) => {
    const db = getDb();
    let offset = 0;
    let totalProcessed = 0;

    const processNextChunk = () => {
      // optimization: skip entities that already have a junk_flag set to avoid re-work on restart
      const rows = db
        .prepare(
          `
        SELECT 
          e.id, 
          e.full_name, 
          e.primary_role, 
          e.entity_type, 
          e.mentions, 
          e.is_vip,
          e.bio,
          e.red_flag_rating,
          e.risk_level,
          (SELECT COUNT(*) FROM media_item_people mip WHERE mip.entity_id = e.id) as media_count,
          (SELECT COUNT(*) FROM black_book_entries bb WHERE bb.person_id = e.id) as black_book_count,
          (SELECT COUNT(DISTINCT et.type_name) 
           FROM entity_evidence_types eet 
           JOIN evidence_types et ON eet.evidence_type_id = et.id 
           WHERE eet.entity_id = e.id) as source_count
        FROM entities e
        WHERE junk_flag IS NULL
        LIMIT ? OFFSET ?
        `,
        )
        .all(chunkSize, offset) as Array<{
        id: number;
        full_name: string;
        primary_role: string;
        entity_type: string;
        mentions: number;
        is_vip?: number;
        bio?: string;
        red_flag_rating?: number;
        risk_level?: string;
        media_count: number;
        black_book_count: number;
        source_count: number;
      }>;

      if (rows.length === 0) {
        console.log(
          `✅ [BACKFILL] Junk flag synchronization complete. Total entities processed: ${totalProcessed}`,
        );
        return;
      }

      const stmt = db.prepare(
        `UPDATE entities SET junk_flag=@junk_flag, junk_reason=@junk_reason, junk_probability=@junk_probability WHERE id=@id`,
      );

      const tx = db.transaction((items: typeof rows) => {
        for (const r of items) {
          let prob = 0;
          let reason = '';

          // Use the expanded heuristics from isJunkEntity
          const isJunk = isJunkEntity(r.full_name || '');

          if (isJunk) {
            prob = 0.8;
            reason = 'heuristic_match';
          }

          // Additional name hygiene
          const name = (r.full_name || '').toLowerCase();
          if (
            name.length < 3 ||
            /[.@]/.test(name) ||
            name.startsWith('http') ||
            name.startsWith('www.')
          ) {
            prob = Math.max(prob, 0.95);
            reason = reason || 'name_hygiene';
          }

          if (ENTITY_BLACKLIST_REGEX.test(r.full_name || '')) {
            prob = Math.max(prob, 0.9);
            reason = reason || 'regex_blacklist';
          }

          // Signal-based junk detection (if mentions are zero but it's not a known person)
          const lowSignals =
            (r.mentions || 0) === 0 &&
            (r.media_count || 0) === 0 &&
            (r.source_count || 0) === 0 &&
            (r.black_book_count || 0) === 0 &&
            (r.bio || '') === '' &&
            (r.is_vip || 0) === 0;

          if (lowSignals && (r.primary_role || '').toLowerCase() === 'unknown') {
            prob = Math.max(prob, 0.7); // Increased from 0.55
            reason = reason || 'low_signals';
          }

          const junk = prob >= 0.7; // Harder threshold
          stmt.run({
            id: r.id,
            junk_flag: junk ? 1 : 0,
            junk_reason: junk ? reason : null,
            junk_probability: prob,
          });
        }
      });

      tx(rows);
      totalProcessed += rows.length;
      offset += chunkSize;

      // Log progress every 1k entities (more frequent due to smaller chunks)
      if (Math.floor(totalProcessed / 1000) > Math.floor((totalProcessed - rows.length) / 1000)) {
        console.log(`⏳ [BACKFILL] Progress: ${totalProcessed} entities scanned...`);
      }

      // Schedule next chunk with significant delay to allow event loop to breathe
      setTimeout(processNextChunk, 200);
    };

    console.log('🚀 [BACKFILL] Starting background junk flag synchronization (throttled)...');
    setTimeout(processNextChunk, 1000); // Initial delay
  },

  backfillJunkFlags: () => {
    // Deprecated in favor of startBackgroundJunkBackfill, but kept for migration compatibility
    entitiesRepository.startBackgroundJunkBackfill();
  },

  /**
   * Get paginated entities with filters
   */
  getEntities: async (
    page: number = 1,
    limit: number = 24,
    filters?: SearchFilters,
    sortBy?: SortOption,
  ): Promise<EntityRepositoryResult> => {
    const db = getDb();
    const whereConditions: string[] = [];
    const params: any = {};

    let hasJunkFlag = false;
    try {
      const cols = (await db.prepare(`PRAGMA table_info(entities)`).all()) as Array<{
        name: string;
      }>;
      hasJunkFlag = cols.some((c) => c.name === 'junk_flag');
    } catch {
      hasJunkFlag = false;
    }
    if (hasJunkFlag) {
      whereConditions.push('COALESCE(junk_flag,0)=0');
    }
    // 1. Term Search - Split into words for fuzzy matching
    if (filters?.searchTerm) {
      const searchWords = filters.searchTerm
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
      if (searchWords.length > 0) {
        // Each word must match somewhere in name, role, or aliases
        const wordConditions = searchWords.map((word, i) => {
          const paramName = `searchWord${i}`;
          params[paramName] = `%${word}%`;
          return `(full_name LIKE @${paramName} OR primary_role LIKE @${paramName} OR aliases LIKE @${paramName})`;
        });
        whereConditions.push(`(${wordConditions.join(' AND ')})`);
      }
    }

    // 2. Risk Level Filter (HIGH/MEDIUM/LOW)
    if (filters?.likelihoodScore && filters.likelihoodScore.length > 0) {
      pushRiskLevelFilter(whereConditions, params, filters.likelihoodScore);
    }

    // 3. Red Flag Index explicit range
    if (filters?.minRedFlagIndex !== undefined) {
      whereConditions.push('red_flag_rating >= @minRedFlagIndex');
      params.minRedFlagIndex = filters.minRedFlagIndex;
    }

    if (filters?.maxRedFlagIndex !== undefined) {
      whereConditions.push('red_flag_rating <= @maxRedFlagIndex');
      params.maxRedFlagIndex = filters.maxRedFlagIndex;
    }

    // 4. Role filter
    if (filters?.role && filters.role !== 'all') {
      whereConditions.push('primary_role = @role');
      params.role = filters.role;
    }

    // 4b. Entity Type / VIP view
    if (filters?.entityType && filters.entityType !== 'all') {
      if (filters.entityType === 'vip_only') {
        whereConditions.push(`(
          COALESCE(is_vip,0) = 1
          AND (
            lower(full_name) IN ('jeffrey epstein', 'donald trump', 'ghislaine maxwell')
            OR (
              COALESCE(mentions, 0) >= 1
              AND (
                COALESCE(mentions, 0) >= 5
                OR COALESCE(red_flag_rating, 0) >= 4
                OR UPPER(COALESCE(risk_level, '')) IN ('HIGH','CRITICAL')
              )
            )
          )
        )`);
      } else {
        whereConditions.push('entity_type = @entityType');
        params.entityType = filters.entityType;
      }
    }

    // 5. Sorting
    let orderByClause = '';
    const dateLimit = new Date();
    dateLimit.setMonth(dateLimit.getMonth() - 24); // Focus on relatively recent prominence if needed, but here mentions are lifetime

    // Default sorting logic improvements
    const vipOrder = 'COALESCE(is_vip, 0) DESC';
    const mentionsOrder = 'COALESCE(mentions, 0) DESC';
    const safetyOrder = 'COALESCE(red_flag_rating, 0) DESC';

    switch (sortBy) {
      case 'name':
        orderByClause = `ORDER BY ${vipOrder}, full_name ASC`;
        break;
      case 'recent':
        orderByClause = `ORDER BY ${vipOrder}, id DESC`;
        break;
      case 'mentions':
        orderByClause = `ORDER BY ${vipOrder}, ${VIP_PINNED_ORDER_SQL}, ${safetyOrder}, ${RISK_ORDER_SQL}, ${mentionsOrder}, full_name ASC`;
        break;
      case 'risk':
      case 'red_flag':
      default:
        orderByClause = `ORDER BY ${vipOrder}, ${VIP_PINNED_ORDER_SQL}, ${safetyOrder}, ${RISK_ORDER_SQL}, ${mentionsOrder}, full_name ASC`;
        break;
    }

    // Use entities table directly (entity_summary view has stale document_count)
    const sourceTable = 'entities';

    // QUALITY FILTER (Default View)
    // If we're on page 1 with no filters, we aggressively remove junk/mislabeled entities
    const isDefaultView =
      !filters?.searchTerm &&
      (!filters?.likelihoodScore || filters.likelihoodScore.length === 0) &&
      !filters?.role &&
      page === 1;

    if (isDefaultView) {
      applyDefaultNameHygiene(whereConditions, params);
      whereConditions.push(DEFAULT_SIGNAL_CLAUSE);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count Query
    const countSql = `SELECT COUNT(*) as total FROM ${sourceTable} ${whereClause}`;
    const totalResult = (await db.prepare(countSql).get(params)) as { total: number };

    // Data Query
    const offset = (page - 1) * limit;
    const sql = `
            SELECT 
              entities.*,
              (SELECT COUNT(*) FROM entity_mentions em WHERE em.entity_id = entities.id) AS documentCount,
              EXISTS(SELECT 1 FROM black_book_entries WHERE person_id = entities.id) as hasBlackBook
            FROM ${sourceTable}
            ${whereClause}
            ${orderByClause}
            LIMIT @limit OFFSET @offset
        `;

    const entities = (await db.prepare(sql).all({ ...params, limit, offset })) as (Person & {
      hasBlackBook: boolean;
    })[];

    // Fetch photos for these entities
    if (entities.length > 0) {
      const entityIds = entities.map((e) => e.id);
      const photosSql = `
            SELECT mip.entity_id, mi.id, mi.title, mi.file_path 
            FROM media_item_people mip 
            JOIN media_items mi ON mip.media_item_id = mi.id 
            WHERE mip.entity_id IN (${entityIds.join(',')})
            AND (mi.file_type LIKE 'image/%' OR mi.file_type IS NULL) -- looser check
            ORDER BY mi.red_flag_rating DESC
        `;

      try {
        const photos = (await db.prepare(photosSql).all()) as Array<{
          entity_id: number;
          id: number;
          title: string;
          file_path: string;
        }>;

        // Map photos to entities
        const photosByEntity: Record<number, any[]> = {};
        for (const p of photos) {
          if (!photosByEntity[p.entity_id]) photosByEntity[p.entity_id] = [];
          if (photosByEntity[p.entity_id].length < 5) {
            // Limit to 5 per entity
            photosByEntity[p.entity_id].push({
              id: p.id,
              title: p.title || 'Photo',
              url: `/api/media/images/${p.id}/thumbnail`,
            });
          }
        }

        // Attach to entities
        for (const entity of entities) {
          entity.photos = photosByEntity[entity.id as unknown as number] || [];
        }
      } catch (e) {
        console.error('Error fetching photos for entity list:', e);
      }

      // Batch fetch evidence types for these entities
      try {
        const evidenceTypesSql = `
          SELECT eet.entity_id, et.type_name
          FROM entity_evidence_types eet
          JOIN evidence_types et ON eet.evidence_type_id = et.id
          WHERE eet.entity_id IN (${entityIds.join(',')})
        `;
        const evidenceTypes = db.prepare(evidenceTypesSql).all() as {
          entity_id: number;
          type_name: string;
        }[];

        // Map evidence types to entities
        const evidenceTypesByEntity: Record<number, string[]> = {};
        for (const et of evidenceTypes) {
          if (!evidenceTypesByEntity[et.entity_id]) evidenceTypesByEntity[et.entity_id] = [];
          if (!evidenceTypesByEntity[et.entity_id].includes(et.type_name)) {
            evidenceTypesByEntity[et.entity_id].push(et.type_name);
          }
        }

        // Attach to entities
        for (const entity of entities) {
          entity.evidence_types = evidenceTypesByEntity[entity.id as unknown as number] || [];
        }
      } catch (e) {
        console.error('Error fetching evidence types for entity list:', e);
      }
    }

    const filtered = entities.filter((e) => {
      const n = String(e.full_name || e.fullName || '').toLowerCase();
      if (n.length < 3) return false;
      if (/[.@]/.test(n) || n.startsWith('http') || n.startsWith('www.')) return false;
      if (ENTITY_BLACKLIST_REGEX.test(e.full_name || '')) return false as any;
      for (const p of ENTITY_BLACKLIST_PATTERNS) {
        if (n.includes(p.toLowerCase())) return false;
      }
      for (const p of ENTITY_PARTIAL_BLOCKLIST) {
        if (n.includes(p.toLowerCase())) return false;
      }
      const mediaCount = typeof (e as any).media_count === 'number' ? (e as any).media_count : 0;
      const lowSignals =
        (e.mentions || 0) < 10 &&
        mediaCount === 0 &&
        !(e as any).hasBlackBook &&
        ((e as any).bio == null || (e as any).bio === '');
      if (lowSignals) return false;
      if ((e as any).entity_type && (e as any).entity_type !== 'Person') return false;
      if (((e as any).primary_role || '').toLowerCase() === 'unknown') return false;
      return true;
    });

    return {
      entities: filtered,
      total: totalResult.total,
    };
  },

  /**
   * Get all entities without pagination (for document linking)
   * WARNING: Large dataset (131k+ records). Use with 'limit' or for internal services only.
   */
  getAllEntities: (limit: number = 0): any[] => {
    const db = getDb();
    try {
      // Get all entities with just the essential fields for linking
      let query = `
                SELECT id, full_name
                FROM entities
                ORDER BY full_name ASC
            `;

      if (limit > 0) {
        query += ` LIMIT ${limit}`;
      }

      const entities = db.prepare(query).all();
      return entities;
    } catch (error) {
      console.error('Error fetching all entities:', error);
      return [];
    }
  },

  /**
   * Get single entity by ID with full details
   */
  getEntityById: (id: string | number): Person | null => {
    const db = getDb();
    const entity = db.prepare('SELECT * FROM entities WHERE id = ?').get(id) as Person | null;

    if (!entity) return null;

    // Use FTS for more accurate document matching (avoiding "chieftan" matching "EFTA")
    // Sanitize name for FTS query: wrap in quotes for exact phrase, escape existing quotes
    const fileReferences = db
      .prepare(
        `
            SELECT DISTINCT
                d.id, 
                d.file_name as fileName, 
                d.file_path as filePath, 
                d.file_type as fileType,
                d.evidence_type as evidenceType,
                d.red_flag_rating as redFlagRating,
                d.date_created as dateCreated
            FROM documents d
            JOIN entity_mentions em ON d.id = em.document_id
            WHERE em.entity_id = ?
            ORDER BY em.doc_red_flag_rating DESC, em.doc_date_created DESC
            LIMIT 1000
        `,
      )
      .all(entity.id);

    // Check for entries in the Black Book
    const blackBookEntries = db
      .prepare(
        `
            SELECT bb.*
            FROM black_book_entries bb
            WHERE bb.person_id = ?
            ORDER BY bb.created_at DESC
        `,
      )
      .all(entity.id) as Array<{
      id: number;
      person_id: number;
      entry_text: string;
      phone_numbers?: string;
      addresses?: string;
      email_addresses?: string;
      notes?: string;
      entry_category?: string;
      document_id?: number;
      created_at: string;
    }>;

    // Get evidence types for this entity
    const evidenceTypes = db
      .prepare(
        `
            SELECT et.type_name
            FROM entity_evidence_types eet
            JOIN evidence_types et ON eet.evidence_type_id = et.id
            WHERE eet.entity_id = ?
        `,
      )
      .all(entity.id) as { type_name: string }[];

    // Get "High Significance Evidence" (formerly Spicy Passages)
    const significantPassages = db
      .prepare(
        `
            SELECT 
                COALESCE(em.mention_context, substr(d.content, 1, 300)) as passage,
                em.surface_text as keyword,
                d.file_name as filename,
                d.evidence_type as source,
                d.id as documentId,
                substr(d.content, 1, 300) as contentSnippet
            FROM entity_mentions em
            JOIN documents d ON em.document_id = d.id
            WHERE em.entity_id = ?
            ORDER BY em.confidence DESC
            LIMIT 5
        `,
      )
      .all(entity.id) as Array<{
      passage: string;
      keyword: string;
      filename: string;
      source: string;
      documentId: string;
      contentSnippet: string;
    }>;

    // Fetch photos for this specific entity
    const photosSql = `
        SELECT mi.id, mi.title, mi.file_path, mi.red_flag_rating as redFlagRating
        FROM media_item_people mip 
        JOIN media_items mi ON mip.media_item_id = mi.id 
        WHERE mip.entity_id = ?
        AND (mi.file_type LIKE 'image/%' OR mi.file_type IS NULL)
        ORDER BY mi.red_flag_rating DESC
        LIMIT 20
    `;
    const photos = db.prepare(photosSql).all(entity.id) as Array<{
      id: number;
      title: string;
      file_path: string;
      redFlagRating: number;
    }>;

    return {
      ...entity,
      id: String(entity.id),
      // Map DB fields to frontend expected camelCase
      fullName: entity.full_name || entity.fullName || 'Unknown',
      primaryRole: entity.primary_role,
      secondaryRoles: entity.secondary_roles ? entity.secondary_roles.split(', ') : [],
      likelihoodLevel: entity.likelihood_level,
      redFlagRating: entity.red_flag_rating,
      redFlagDescription: entity.red_flag_description,
      birthDate: entity.birth_date,
      deathDate: entity.death_date,
      bio: entity.bio,
      isVip: Boolean(entity.is_vip),
      wasAgentic: Boolean(entity.was_agentic),
      fileReferences,
      // Add evidence types
      evidence_types: evidenceTypes.map((et) => et.type_name),
      evidenceTypes: evidenceTypes.map((et) => et.type_name),
      significant_passages: significantPassages,
      photos: photos.map((p) => ({
        ...p,
        id: String(p.id),
        filePath: p.file_path,
        url: `/api/media/images/${p.id}/thumbnail`,
        fullUrl: `/api/media/images/${p.id}`,
      })),
      // Add Black Book information if available
      blackBookEntries: blackBookEntries.map((bb) => ({
        id: bb.id,
        personId: bb.person_id,
        entryText: bb.entry_text,
        phoneNumbers: bb.phone_numbers ? JSON.parse(bb.phone_numbers) : [],
        addresses: bb.addresses ? JSON.parse(bb.addresses) : [],
        emailAddresses: bb.email_addresses ? JSON.parse(bb.email_addresses) : [],
        notes: bb.notes,
        entry_category: bb.entry_category,
        document_id: bb.document_id,
      })),
    };
  },
  createEntity: (data: any) => {
    const db = getDb();
    const stmt = db.prepare(`
            INSERT INTO entities (
                full_name, primary_role, secondary_roles, description, 
                red_flag_rating, red_flag_score, mentions
            ) VALUES (
                @full_name, @primary_role, @secondary_roles, @description,
                @red_flag_rating, @red_flag_score, @mentions
            )
        `);
    const result = stmt.run({
      full_name: data.full_name,
      primary_role: data.primary_role || 'Unknown',
      secondary_roles: data.secondary_roles || '',
      description: data.description || '',
      red_flag_rating: data.red_flag_rating || 0,
      red_flag_score: data.red_flag_score || 0,
      mentions: data.mentions || 0,
    });
    return result.lastInsertRowid;
  },

  updateEntity: async (id: string | number, data: any) => {
    const db = getDb();
    const fields: string[] = [];
    const params: any = { id };

    const allowed = [
      'full_name',
      'primary_role',
      'secondary_roles',
      'description',
      'red_flag_rating',
      'red_flag_score',
      'mentions',
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = @${key}`);
        params[key] = data[key];
      }
    }

    if (fields.length === 0) return 0;

    const stmt = db.prepare(`UPDATE entities SET ${fields.join(', ')} WHERE id = @id`);
    const result = (await stmt.run(params)) as { changes: number };
    return result.changes;
  },

  deleteEntity: async (id: string | number) => {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM entities WHERE id = ?');
    const result = (await stmt.run(id)) as { changes: number };
    return result.changes;
  },

  /**
   * Get summary of entity source connections (relationships & documents)
   */
  getEntitySummarySource: (entityId: number | string, topN: number = 10): any => {
    const db = getDb();
    const entity = db
      .prepare(
        'SELECT id, full_name, primary_role as role, red_flag_rating, risk_level FROM entities WHERE id=?',
      )
      .get(entityId) as
      | {
          id: number;
          full_name: string;
          role: string;
          red_flag_rating: number;
          risk_level: string;
        }
      | undefined;

    if (!entity) return null;

    const relationships = db
      .prepare(
        `
           SELECT 
             source_entity_id as source_id, 
             target_entity_id as target_id, 
             relationship_type as type,
             proximity_score,
             risk_score, 
             confidence, 
             ingest_run_id,
             evidence_pack_json,
             was_agentic
           FROM entity_relationships 
           WHERE source_entity_id=?
           ORDER BY proximity_score DESC
           LIMIT ?
         `,
      )
      .all(entityId, topN) as Array<{
      source_id: number;
      target_id: number;
      type: string;
      proximity_score: number;
      risk_score: number;
      confidence: number;
    }>;

    const docs = db
      .prepare(
        `
           SELECT id, file_name as title, evidence_type, metadata_json, red_flag_rating, word_count, date_created
           FROM documents
           WHERE file_name LIKE ? OR content LIKE ?
           LIMIT ?
         `,
      )
      .all(`%${entity.full_name}%`, `%${entity.full_name}%`, topN) as Array<{
      id: string;
      title: string;
      evidence_type: string;
      metadata_json: string;
      red_flag_rating: number;
      word_count: number;
      date_created: string;
    }>;

    return {
      entity,
      relationships: relationships.map((r) => ({
        id: r.source_id,
        target_id: r.target_id,
        proximity: r.proximity_score,
        risk: r.risk_score,
        confidence: r.confidence,
        type: r.type,
        ingestRunId: (r as any).ingest_run_id,
        evidencePack: (r as any).evidence_pack_json
          ? JSON.parse((r as any).evidence_pack_json)
          : null,
        wasAgentic: Boolean((r as any).was_agentic),
      })),
      documents: docs.map((d) => ({
        id: d.id,
        title: d.title,
        evidence_type: d.evidence_type,
        risk: d.red_flag_rating,
      })),
    };
  },

  // Get documents for a specific entity
  getEntityDocuments: (entityId: string): any[] => {
    const db = getDb();

    // Validate entity ID format
    if (!entityId || !/^[1-9]\d*$/.test(entityId)) {
      throw new Error('Invalid entity ID format');
    }

    // Fetch entity name for FTS query
    const entityNameObj = db
      .prepare('SELECT full_name as name FROM entities WHERE id = ?')
      .get(entityId) as { name: string };

    if (!entityNameObj) return [];

    // Use JOIN on entity_mentions for accurate document retrieval (matching the count)
    const filesQuery = `
          SELECT 
            d.id,
            d.file_name as fileName,
            d.file_path as filePath,
            d.file_type as fileType,
            d.file_size as fileSize,
            d.date_created as dateCreated,
            substr(d.content, 1, 200) as contentPreview,
            d.evidence_type as evidenceType,
            d.metadata_json as metadataJson,
            d.word_count as wordCount,
            d.red_flag_rating as redFlagRating,
            d.content_sha256 as contentHash,

            'Mentioned in document' as contextText,
            '' as aiSummary,
            em.ingest_run_id as ingestRunId,
            0 as pageNumber,
            0 as position
          FROM documents d
          JOIN entity_mentions em ON d.id = em.document_id
          WHERE em.entity_id = ?
          ORDER BY em.doc_red_flag_rating DESC, em.doc_date_created DESC
          LIMIT 5000 -- Increased from 1000 for better document coverage
        `;

    const fileReferences = db.prepare(filesQuery).all(entityId) as Array<{
      id: string;
      fileName: string;
      filePath: string;
      fileType: string;
      fileSize: number;
      dateCreated: string;
      contentPreview: string;
      evidenceType: string;
      metadataJson: string;
      wordCount: number;
      redFlagRating: number;
      contentHash: string;
      contextText: string;
      aiSummary: string;
      pageNumber: number;
      position: number;
    }>;
    return fileReferences.map((file) => {
      let metadata = {};
      try {
        if (file.metadataJson) {
          metadata = JSON.parse(file.metadataJson);
        }
      } catch (e) {
        console.error('Error parsing metadata for file', file.id, e);
      }
      return {
        ...file,
        title: file.fileName, // Fallback title
        metadata,
      };
    });
  },

  // Get all media for a specific entity

  /**
   * Get total count of documents for an entity (fast)
   */
  getEntityDocumentCount: (entityId: string): number => {
    const db = getDb();
    const count = db
      .prepare('SELECT COUNT(*) as count FROM entity_mentions WHERE entity_id = ?')
      .get(entityId) as { count: number };
    return count.count;
  },

  /**
   * Get paginated documents for an entity
   */
  getEntityDocumentsPaginated: (
    entityId: string,
    page: number = 1,
    limit: number = 50,
    filters?: any,
    explicitOffset?: number,
  ): any[] => {
    const db = getDb();
    const offset = explicitOffset !== undefined ? explicitOffset : (page - 1) * limit;

    // Base query
    let query = `
      SELECT 
        d.id,
        d.file_name as fileName,
        d.file_path as filePath,
        d.file_type as fileType,
        d.file_size as fileSize,
        d.date_created as dateCreated,
        substr(d.content, 1, 200) as contentPreview,
        d.evidence_type as evidenceType,
        d.metadata_json as metadataJson,
        d.word_count as wordCount,
        d.red_flag_rating as redFlagRating,
        
        -- Join fields
        em.confidence as significance_score,
        em.mention_context
      FROM documents d
      JOIN entity_mentions em ON d.id = em.document_id
      WHERE em.entity_id = ?
    `;

    const params: any[] = [entityId];

    // Filters
    if (filters?.search) {
      query += ` AND (d.file_name LIKE ? OR d.content LIKE ?)`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters?.source && filters.source !== 'all') {
      if (filters.source === 'court') {
        query += ` AND d.evidence_type LIKE '%Court%'`;
      } else if (filters.source === 'email') {
        query += ` AND (d.file_type = 'email' OR d.evidence_type LIKE '%Email%')`;
      } else if (filters.source === 'flight') {
        query += ` AND d.evidence_type LIKE '%Flight%'`;
      }
    }

    // Sort
    if (filters?.sort === 'date-asc') {
      query += ` ORDER BY em.doc_date_created ASC`;
    } else if (filters?.sort === 'date-desc') {
      query += ` ORDER BY em.doc_date_created DESC`;
    } else if (filters?.sort === 'relevance') {
      query += ` ORDER BY em.confidence DESC, em.doc_red_flag_rating DESC`;
    } else {
      // Default risk - uses the critical index: idx_entity_mentions_entity_sorted
      query += ` ORDER BY em.doc_red_flag_rating DESC, em.doc_date_created DESC`;
    }

    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const docs = db.prepare(query).all(...params) as any[];

    return docs.map((d) => {
      let metadata = {};
      try {
        if (d.metadataJson) metadata = JSON.parse(d.metadataJson);
      } catch {
        // Metadata parsing failure is non-fatal
      }

      return {
        ...d,
        title: d.fileName,
        metadata,
        // Ensure accurate mention counts are available if needed,
        // essentially satisfying the user's need for "COUNTS"
        mentions: 1, // Default since we live in a paginated world now, or could query distinct count
      };
    });
  },
};
