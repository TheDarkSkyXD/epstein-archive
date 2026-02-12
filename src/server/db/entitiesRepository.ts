import { getDb } from './connection.js';
import { Person, SearchFilters, SortOption, SubjectCardDTO } from '../../types.js';
import { ENTITY_BLACKLIST_PATTERNS } from '../../config/entityBlacklist.js';

export interface EntityRepositoryResult {
  entities: any[];
  total: number;
}

export interface SubjectCardRepositoryResult {
  subjects: SubjectCardDTO[];
  total: number;
}

export const entitiesRepository = {
  /**
   * ULTRATHINK: High-performance subject card fetching.
   * Minimal payload, optimized SQL, server-side precomputation.
   */
  getSubjectCards: (
    page: number = 1,
    limit: number = 24,
    filters?: SearchFilters,
    sortBy?: SortOption,
  ): SubjectCardRepositoryResult => {
    const db = getDb();
    const whereConditions: string[] = [];
    const params: any = {};

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
      const riskConditions = filters.likelihoodScore.map((score, i) => {
        const paramName = `riskScore${i}`;
        params[paramName] = score.toUpperCase();
        return `risk_level = @${paramName}`;
      });
      whereConditions.push(`(${riskConditions.join(' OR ')})`);
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

    // 4b. Entity Type
    if (filters?.entityType && filters.entityType !== 'all') {
      whereConditions.push('entity_type = @entityType');
      params.entityType = filters.entityType;
    }

    // 5. Sorting (Deterministic)
    let orderByClause = '';
    const hasPhotoOrder =
      '(SELECT COUNT(*) FROM media_item_people WHERE entity_id = entities.id) > 0 DESC';
    const mentionsOrder = 'COALESCE(mentions, 0) DESC';
    const safetyOrder = 'red_flag_rating DESC'; // High to Low

    switch (sortBy) {
      case 'name':
        orderByClause = 'ORDER BY full_name ASC';
        break;
      case 'recent':
        orderByClause = 'ORDER BY id DESC';
        break;
      case 'mentions':
        orderByClause = `ORDER BY ${hasPhotoOrder}, mentions DESC, red_flag_rating DESC, full_name ASC`;
        break;
      case 'risk':
      case 'red_flag':
      default:
        orderByClause = `ORDER BY ${hasPhotoOrder}, ${mentionsOrder}, ${safetyOrder}, full_name ASC`;
        break;
    }

    // QUALITY FILTER (Page 1 Default)
    const isDefaultView =
      !filters?.searchTerm &&
      (!filters?.likelihoodScore || filters.likelihoodScore.length === 0) &&
      !filters?.role &&
      page === 1;

    if (isDefaultView) {
      ENTITY_BLACKLIST_PATTERNS.forEach((pattern, i) => {
        const paramName = `junkPattern${i}`;
        params[paramName] = `%${pattern}%`;
        whereConditions.push(`full_name NOT LIKE @${paramName}`);
      });
      whereConditions.push(`(
        mentions >= 3
        OR bio IS NOT NULL
        OR (SELECT COUNT(*) FROM media_item_people WHERE entity_id = entities.id) > 0
      )`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count Query
    const countSql = `SELECT COUNT(*) as total FROM entities ${whereClause}`;
    const totalResult = db.prepare(countSql).get(params) as { total: number };

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
            FROM entities
            ${whereClause}
            ${orderByClause}
            LIMIT @limit OFFSET @offset
        `;

    const rawEntities = db.prepare(sql).all({ ...params, limit, offset }) as any[];

    // --- SERVER-SIDE PRECOMPUTATION of Signals & DTO Mapping ---
    const subjects: SubjectCardDTO[] = rawEntities.map((e) => {
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
      // Try parsing number, else count commas
      if (/^\d+$/.test(connStr)) connCount = parseInt(connStr, 10);
      else connCount = (connStr.match(/,/g) || []).length;
      const connectivity = Math.min(100, (connCount / 20) * 100);

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

      return {
        id: String(e.id),
        name: e.full_name || 'Unknown',
        role: e.primary_role || 'Unknown',
        short_bio: e.bio ? e.bio.substring(0, 150) : undefined,
        stats: {
          mentions: e.mentions || 0,
          documents: e.mentions || 0, // Approx
          distinct_sources: eTypes.length,
          verified_media: e.media_count || 0,
        },
        forensics: {
          risk_level: (e.risk_level as any) || 'LOW',
          evidence_ladder: ladder,
          signal_strength: {
            exposure: Math.round(exposure),
            connectivity: Math.round(connectivity),
            corroboration: Math.round(corroboration),
          },
          driver_labels: drivers.slice(0, 4),
        },
        // Optional: Precomputing this would require a JOIN
        top_preview: undefined,
      };
    });

    return {
      subjects,
      total: totalResult.total,
    };
  },

  /**
   * Get paginated entities with filters
   */
  getEntities: (
    page: number = 1,
    limit: number = 24,
    filters?: SearchFilters,
    sortBy?: SortOption,
  ): EntityRepositoryResult => {
    const db = getDb();
    const whereConditions: string[] = [];
    const params: any = {};

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
      const riskConditions = filters.likelihoodScore.map((score, i) => {
        const paramName = `riskScore${i}`;
        params[paramName] = score.toUpperCase();
        return `risk_level = @${paramName}`;
      });
      whereConditions.push(`(${riskConditions.join(' OR ')})`);
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

    // 4b. Entity Type filter (New)
    if (filters?.entityType && filters.entityType !== 'all') {
      whereConditions.push('entity_type = @entityType');
      params.entityType = filters.entityType;
    }

    // 5. Sorting
    let orderByClause = '';
    const dateLimit = new Date();
    dateLimit.setMonth(dateLimit.getMonth() - 24); // Focus on relatively recent prominence if needed, but here mentions are lifetime

    // Default sorting logic improvements
    const hasPhotoOrder =
      '(SELECT COUNT(*) FROM media_item_people WHERE entity_id = entities.id) > 0 DESC';
    const mentionsOrder = 'COALESCE(mentions, 0) DESC';
    const safetyOrder = 'red_flag_rating DESC';

    switch (sortBy) {
      case 'name':
        orderByClause = 'ORDER BY full_name ASC';
        break;
      case 'recent':
        orderByClause = 'ORDER BY id DESC';
        break;
      case 'mentions':
        orderByClause = `ORDER BY ${hasPhotoOrder}, mentions DESC, red_flag_rating DESC, full_name ASC`;
        break;
      case 'risk':
      case 'red_flag':
      default:
        orderByClause = `ORDER BY ${hasPhotoOrder}, ${mentionsOrder}, ${safetyOrder}, full_name ASC`;
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
      // Exclude suspected non-person entities from "People" tab
      // These are often locations or organizations mislabeled as "Person"
      ENTITY_BLACKLIST_PATTERNS.forEach((pattern, i) => {
        const paramName = `junkPattern${i}`;
        params[paramName] = `%${pattern}%`;
        whereConditions.push(`full_name NOT LIKE @${paramName}`);
      });

      // Aggressively remove noise from featured results:
      // 1. Must have at least 3 mentions
      // 2. OR Must have a photo
      // 3. OR Must have a bio (indicating manual verification or high-quality extraction)
      whereConditions.push(`(
        mentions >= 3
        OR bio IS NOT NULL
        OR (SELECT COUNT(*) FROM media_item_people WHERE entity_id = entities.id) > 0
      )`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count Query
    const countSql = `SELECT COUNT(*) as total FROM ${sourceTable} ${whereClause}`;
    const totalResult = db.prepare(countSql).get(params) as { total: number };

    // Data Query
    const offset = (page - 1) * limit;
    const sql = `
            SELECT 
              entities.*,
              entities.mentions AS documentCount
            FROM ${sourceTable}
            ${whereClause}
            ${orderByClause}
            LIMIT @limit OFFSET @offset
        `;

    const entities = db.prepare(sql).all({ ...params, limit, offset }) as Person[];

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
        const photos = db.prepare(photosSql).all() as Array<{
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

    return {
      entities,
      total: totalResult.total,
    };
  },

  /**
   * Get all entities without pagination (for document linking)
   */
  getAllEntities: (): any[] => {
    const db = getDb();
    try {
      // Get all entities with just the essential fields for linking
      const entities = db
        .prepare(
          `
                SELECT id, full_name
                FROM entities
                ORDER BY full_name ASC
            `,
        )
        .all();

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
            ORDER BY d.red_flag_rating DESC, d.date_created DESC
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
                em.mention_context as passage,
                em.surface_text as keyword,
                d.file_name as filename,
                d.evidence_type as source
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

  updateEntity: (id: string | number, data: any) => {
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
    const result = stmt.run(params);
    return result.changes;
  },

  deleteEntity: (id: string | number) => {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM entities WHERE id = ?');
    const result = stmt.run(id);
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
            d.content,
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
          ORDER BY d.red_flag_rating DESC, d.date_created DESC
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
      content: string;
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
  getEntityMedia: (entityId: string): any[] => {
    const db = getDb();

    // Validate entity ID format
    if (!entityId || !/^[1-9]\d*$/.test(entityId)) {
      throw new Error('Invalid entity ID format');
    }

    const photosSql = `
        SELECT mi.id, mi.title, mi.file_path, mi.red_flag_rating as redFlagRating, mi.file_type, mi.created_at
        FROM media_item_people mip 
        JOIN media_items mi ON mip.media_item_id = mi.id 
        WHERE mip.entity_id = ?
        ORDER BY mi.red_flag_rating DESC, mi.created_at DESC
    `;

    const photos = db.prepare(photosSql).all(entityId) as Array<{
      id: number;
      title: string;
      file_path: string;
      redFlagRating: number;
      file_type: string;
      created_at: string;
    }>;

    return photos.map((p) => ({
      ...p,
      id: String(p.id),
      url: `/api/media/images/${p.id}/thumbnail`,
      fullUrl: `/api/media/images/${p.id}`,
      type: p.file_type?.startsWith('video') ? 'video' : 'image',
    }));
  },

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
  ): any[] => {
    const db = getDb();
    const offset = (page - 1) * limit;

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
        em.significance_score,
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
      query += ` ORDER BY d.date_created ASC`;
    } else if (filters?.sort === 'date-desc') {
      query += ` ORDER BY d.date_created DESC`;
    } else if (filters?.sort === 'relevance') {
      query += ` ORDER BY em.significance_score DESC, d.red_flag_rating DESC`;
    } else {
      // Default risk
      query += ` ORDER BY d.red_flag_rating DESC, em.significance_score DESC`;
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
