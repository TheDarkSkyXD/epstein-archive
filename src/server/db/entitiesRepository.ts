import { getDb } from './connection.js';
import { SearchFilters, SortOption } from '../../types.js';

export interface EntityRepositoryResult {
  entities: any[];
  total: number;
}

export const entitiesRepository = {
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

    // 2. Likelihood Score (Red Flag Rating Mapping)
    if (filters?.likelihoodScore && filters.likelihoodScore.length > 0) {
      const ratingConditions: string[] = [];
      if (filters.likelihoodScore.includes('HIGH')) {
        ratingConditions.push('(red_flag_rating >= 4)');
      }
      if (filters.likelihoodScore.includes('MEDIUM')) {
        ratingConditions.push('(red_flag_rating >= 2 AND red_flag_rating < 4)');
      }
      if (filters.likelihoodScore.includes('LOW')) {
        ratingConditions.push('(red_flag_rating < 2 OR red_flag_rating IS NULL)');
      }
      if (ratingConditions.length > 0) {
        whereConditions.push(`(${ratingConditions.join(' OR ')})`);
      }
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

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 5. Sorting
    let orderByClause = '';
    switch (sortBy) {
      case 'name':
        orderByClause = 'ORDER BY full_name ASC';
        break;
      case 'recent':
        orderByClause = 'ORDER BY id DESC';
        break;
      case 'mentions':
        orderByClause = 'ORDER BY document_count DESC, red_flag_rating DESC, full_name ASC';
        break;
      case 'spice':
      case 'risk':
      case 'red_flag':
      default:
        orderByClause = 'ORDER BY red_flag_rating DESC, COALESCE(mentions, 0) DESC, full_name ASC';
        break;
    }

    // Use entities table directly (entity_summary view has stale document_count)
    const sourceTable = 'entities';

    // Count Query
    const countSql = `SELECT COUNT(*) as total FROM ${sourceTable} ${whereClause}`;
    const totalResult = db.prepare(countSql).get(params) as { total: number };

    // Data Query
    const offset = (page - 1) * limit;
    const sql = `
            SELECT *
            FROM ${sourceTable}
            ${whereClause}
            ${orderByClause}
            LIMIT @limit OFFSET @offset
        `;

    const entities = db.prepare(sql).all({ ...params, limit, offset });

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
  getEntityById: (id: string | number): any | null => {
    const db = getDb();
    const entity = db.prepare('SELECT * FROM entities WHERE id = ?').get(id) as any;

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
            LIMIT 50
        `,
      )
      .all(entity.id);

    // Check if this entity has an entry in the Black Book
    const blackBookEntry = db
      .prepare(
        `
            SELECT bb.*
            FROM black_book_entries bb
            WHERE bb.person_id = ?
            LIMIT 1
        `,
      )
      .get(entity.id) as any;
    return {
      ...entity,
      // Map DB fields to frontend expected camelCase
      fullName: entity.full_name,
      primaryRole: entity.primary_role,
      secondaryRoles: entity.secondary_roles ? entity.secondary_roles.split(', ') : [],
      likelihoodLevel: entity.likelihood_level,
      redFlagRating: entity.red_flag_rating,
      redFlagDescription: entity.red_flag_description,
      fileReferences,
      // Add Black Book information if available
      blackBookEntry: blackBookEntry
        ? {
            id: blackBookEntry.id,
            personId: blackBookEntry.person_id,
            entryText: blackBookEntry.entry_text,
            phoneNumbers: blackBookEntry.phone_numbers
              ? JSON.parse(blackBookEntry.phone_numbers)
              : [],
            addresses: blackBookEntry.addresses ? JSON.parse(blackBookEntry.addresses) : [],
            emailAddresses: blackBookEntry.email_addresses
              ? JSON.parse(blackBookEntry.email_addresses)
              : [],
            notes: blackBookEntry.notes,
          }
        : null,
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
      .prepare('SELECT id, full_name, primary_role as role FROM entities WHERE id=?')
      .get(entityId) as any;

    if (!entity) return null;

    const relationships = db
      .prepare(
        `
           SELECT 
             source_id, 
             target_id, 
             relationship_type as type,
             proximity_score,
             risk_score, 
             confidence, 
             NULL as metadata_json
           FROM entity_relationships 
           WHERE source_id=?
           ORDER BY proximity_score DESC
           LIMIT ?
         `,
      )
      .all(entityId, topN) as any[];

    const docs = db
      .prepare(
        `
           SELECT id, file_name as title, evidence_type, metadata_json, red_flag_rating, word_count, date_created
           FROM documents
           WHERE file_name LIKE ? OR content LIKE ?
           LIMIT ?
         `,
      )
      .all(`%${entity.full_name}%`, `%${entity.full_name}%`, topN) as any[];

    return {
      entity,
      relationships: relationships.map((r) => ({
        id: r.source_id,
        target_id: r.target_id,
        proximity: r.proximity_score,
        risk: r.risk_score,
        confidence: r.confidence,
        type: r.type,
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

    // Use FTS for more accurate matching
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
            d.md5_hash as contentHash,
            'Mentioned in document' as contextText,
            '' as aiSummary,
            0 as pageNumber,
            0 as position
          FROM documents d
          JOIN documents_fts fts ON d.id = fts.rowid
          WHERE fts.documents_fts MATCH ?
          ORDER BY d.red_flag_rating DESC, d.date_created DESC
          LIMIT 50
        `;

    const ftsQuery = `"${entityNameObj.name.replace(/"/g, '""')}"`;
    const fileReferences = db.prepare(filesQuery).all(ftsQuery) as any[];
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
};
