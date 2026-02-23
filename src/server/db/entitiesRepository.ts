import { entitiesQueries } from '@epstein/db';
import { Person, SearchFilters, SortOption } from '../../types.js';
import type { SubjectCardListItemDto } from '@shared/dto/entities';
import { getApiPool } from './connection.js';

export interface EntityRepositoryResult {
  entities: any[];
  total: number;
}

export interface SubjectCardRepositoryResult {
  subjects: SubjectCardListItemDto[];
  total: number;
}

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
  ['sir mick jagger', 'Mick Jagger'],
]);

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

function normalizeVipDisplayName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    current!.canonicalName.includes(',');
  if (!current || score > current.score || preferCandidateOnTie) {
    map.set(key, { canonicalName, score });
  }
}

async function buildVipDisplayLookup(): Promise<Map<string, string>> {
  const raw = await (entitiesQueries.getVipEntities as any).run(undefined, getApiPool());
  const bestByAlias = new Map<string, { canonicalName: string; score: number }>();

  for (const row of raw) {
    const canonicalName = row.full_name!.trim();
    const score = Number(row.mentions || 0);
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

export const entitiesRepository = {
  getSubjectCards: async (
    page: number = 1,
    limit: number = 24,
    filters?: SearchFilters,
    sortBy?: SortOption,
  ): Promise<SubjectCardRepositoryResult> => {
    const offset = (page - 1) * limit;
    const searchTerm = filters?.searchTerm ? `%${filters.searchTerm.trim()}%` : null;
    const riskLevels = filters?.likelihoodScore
      ? filters.likelihoodScore.map((s) => String(s).toUpperCase())
      : null;

    const rawEntities = await (entitiesQueries.getSubjectCards as any).run(
      {
        searchTerm,
        riskLevels,
        minRedFlag: filters?.minRedFlagIndex !== undefined ? filters.minRedFlagIndex : null,
        maxRedFlag: filters?.maxRedFlagIndex !== undefined ? filters.maxRedFlagIndex : null,
        role: filters?.role && filters.role !== 'all' ? filters.role : null,
        sortBy: sortBy || 'risk',
        limit: limit,
        offset: offset,
      },
      getApiPool(),
    );

    const countResult = await (entitiesQueries.countSubjectCards as any).run(
      {
        searchTerm,
        riskLevels,
      },
      getApiPool(),
    );

    const total = Number(countResult[0]?.total || 0);

    const maxConnResult = await (entitiesQueries.getMaxConnectivity as any).run(
      undefined,
      getApiPool(),
    );
    const maxConnectivityCount = Number(maxConnResult[0]?.maxConn || 1);

    const vipDisplayLookup = await buildVipDisplayLookup();

    const subjects: SubjectCardListItemDto[] = rawEntities.map((e) => {
      const mentions = Number(e.mentions || 0);
      const mediaCount = Number((e as any).mediaCount || 0);
      const blackBookCount = Number((e as any).blackBookCount || 0);

      let ladder: 'L1' | 'L2' | 'L3' | 'NONE' = 'L3';
      if (blackBookCount > 0 || mediaCount > 0) ladder = 'L1';
      else if (mentions > 50) ladder = 'L2';
      else if (mentions === 0) ladder = 'NONE';

      const exposure = Math.min(100, (Math.log10(mentions + 1) / 3) * 100);

      let connCount = 0;
      const connStr = String(e.connections || '');
      if (/^\d+$/.test(connStr)) connCount = parseInt(connStr, 10);
      else connCount = (connStr.match(/,/g) || []).length;
      const connectivity = Math.min(100, (connCount / maxConnectivityCount) * 100);

      const drivers: string[] = [];
      if (blackBookCount > 0) drivers.push('Black Book');
      if (mediaCount > 0) drivers.push('Media Mentions');

      return {
        id: String(e.id),
        name: e.fullName || 'Unknown',
        displayName: resolveDisplayName(e.fullName || 'Unknown', vipDisplayLookup),
        role: e.primaryRole || 'Unknown',
        bio: e.bio || '',
        mentions,
        riskLevel: (e.riskLevel as any) || 'LOW',
        redFlagRating: Number(e.redFlagRating || 0),
        ladder,
        signals: {
          exposure,
          connectivity,
          corroboration: Math.min(100, mediaCount * 20),
        },
        drivers: drivers.slice(0, 4),
        topPhotoId: (e as any).topPhotoId ? String((e as any).topPhotoId) : undefined,
      };
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

    return {
      subjects: normalizedSubjects,
      total,
    };
  },

  startBackgroundJunkBackfill: () => {
    /* No-op in Postgres version */
  },

  backfillJunkFlags: () => {
    /* No-op in Postgres version */
  },

  getEntities: async (
    page: number = 1,
    limit: number = 24,
    filters?: SearchFilters,
    sortBy?: SortOption,
  ): Promise<EntityRepositoryResult> => {
    const offset = (page - 1) * limit;
    const searchTerm = filters?.searchTerm ? `%${filters.searchTerm.trim()}%` : null;
    const riskLevels = filters?.likelihoodScore
      ? filters.likelihoodScore.map((s) => String(s).toUpperCase())
      : null;

    const rawEntities = await (entitiesQueries.getSubjectCards as any).run(
      {
        searchTerm,
        riskLevels,
        minRedFlag: filters?.minRedFlagIndex !== undefined ? filters.minRedFlagIndex : null,
        maxRedFlag: filters?.maxRedFlagIndex !== undefined ? filters.maxRedFlagIndex : null,
        role: filters?.role && filters.role !== 'all' ? filters.role : null,
        sortBy: sortBy || 'risk',
        limit: limit,
        offset: offset,
      },
      getApiPool(),
    );

    const countResult = await (entitiesQueries.countSubjectCards as any).run(
      {
        searchTerm,
        riskLevels,
      },
      getApiPool(),
    );

    const total = Number(countResult[0]?.total || 0);

    const mappedEntities = rawEntities.map((e) => ({
      ...e,
      id: String(e.id),
      fullName: e.fullName || 'Unknown',
      primaryRole: e.primaryRole || 'Unknown',
      mentions: Number(e.mentions || 0),
      redFlagRating: Number(e.redFlagRating || 0),
    }));

    const seen = new Set<string>();
    const normalizedEntities = mappedEntities.filter((e) => {
      const norm = e.fullName.toLowerCase().trim();
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });

    return {
      entities: normalizedEntities as any,
      total,
    };
  },

  getAllEntities: async (limit: number = 0): Promise<any[]> => {
    const rows = await (entitiesQueries.getSubjectCards as any).run(
      {
        searchTerm: null,
        riskLevels: null,
        minRedFlag: null,
        maxRedFlag: null,
        role: null,
        sortBy: 'name',
        limit: limit > 0 ? limit : 1000,
        offset: 0,
      },
      getApiPool(),
    );
    return rows;
  },

  getEntityById: async (id: string | number): Promise<Person | null> => {
    const entityId = Number(id);
    const rows = await (entitiesQueries.getEntityById as any).run({ id: entityId }, getApiPool());
    const entity = rows[0];

    if (!entity) return null;

    const mentions = await (entitiesQueries.getEntityMentions as any).run(
      { entityId, limit: 100 },
      getApiPool(),
    );
    const relationships = await (entitiesQueries.getEntityRelationships as any).run(
      { entityId },
      getApiPool(),
    );

    const vipDisplayLookup = await buildVipDisplayLookup();

    return {
      ...entity,
      id: String(entity.id),
      fullName: entity.full_name || '',
      displayName: resolveDisplayName(entity.full_name || '', vipDisplayLookup),
      primaryRole: entity.primary_role || 'Unknown',
      mentions: Number(entity.mentions || 0),
      redFlagRating: Number(entity.red_flag_rating || 0),
      isVip: Boolean(entity.is_vip),
      wasAgentic: Boolean(entity.was_agentic),
      fileReferences: mentions.map((m) => ({
        id: String(m.document_id),
        fileName: m.documentTitle,
        dateCreated: m.documentDate,
      })),
      significant_passages: mentions.slice(0, 5).map((m) => ({
        passage: m.mention_context || '',
        keyword: m.surface_text || '',
        filename: m.documentTitle || 'Document',
        documentId: String(m.document_id),
      })),
      relationships: relationships.map((r) => ({
        targetId: String(r.target_entity_id),
        targetName: r.targetName,
        targetRole: r.targetRole,
        type: r.relationship_type,
        confidence: Number(r.confidence || 0),
      })),
    } as any;
  },

  getEntitySummarySource: async (entityId: number | string, topN: number = 10): Promise<any> => {
    const id = Number(entityId);
    const rows = await (entitiesQueries.getEntityById as any).run({ id: id }, getApiPool());
    const entity = rows[0];

    if (!entity) return null;

    const relationships = await (entitiesQueries.getEntityRelationships as any).run(
      { entityId: id },
      getApiPool(),
    );
    const mentions = await (entitiesQueries.getEntityMentions as any).run(
      { entityId: id, limit: topN },
      getApiPool(),
    );

    return {
      entity: {
        ...entity,
        id: String(entity.id),
      },
      relationships: relationships.slice(0, topN).map((r) => ({
        targetId: String(r.target_entity_id),
        type: r.relationship_type,
        confidence: Number(r.confidence || 0),
      })),
      documents: mentions.map((m) => ({
        id: String(m.document_id),
        title: m.documentTitle,
        date: m.documentDate,
      })),
    };
  },

  getEntityDocuments: async (entityId: string): Promise<any[]> => {
    const id = Number(entityId);
    const mentions = await (entitiesQueries.getEntityMentions as any).run(
      { entityId: id, limit: 1000 },
      getApiPool(),
    );
    return mentions.map((m: any) => ({
      id: String(m.document_id),
      title: m.documentTitle,
      dateCreated: m.documentDate,
    }));
  },

  getEntityDocumentCount: async (entityId: string): Promise<number> => {
    const id = Number(entityId);
    const result = await (entitiesQueries.getEntityMentions as any).run(
      { entityId: id, limit: 1000 },
      getApiPool(),
    );
    return result.length;
  },

  getEntityDocumentsPaginated: async (
    entityId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<any[]> => {
    const id = Number(entityId);
    const mentions = await (entitiesQueries.getEntityMentions as any).run(
      { entityId: id, limit: 1000 },
      getApiPool(),
    );
    const slice = mentions.slice((page - 1) * limit, page * limit);
    return slice.map((m: any) => ({
      id: String(m.document_id),
      title: m.documentTitle,
      dateCreated: m.documentDate,
    }));
  },
};
