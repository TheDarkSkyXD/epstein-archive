import Database from 'better-sqlite3';
import { SearchFilters, SortOption } from '../types';
import { join } from 'path';
import { statSync } from 'fs';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database.Database;
  private readonly DB_PATH = join(process.cwd(), 'epstein-archive.db');

  private constructor() {
    this.db = new Database(this.DB_PATH, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
      timeout: 30000, // 30 second timeout for large operations
    });
    
    // Enable foreign keys and optimize for performance
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    this.db.pragma('synchronous = NORMAL'); // Balance between safety and performance
    this.db.pragma('cache_size = -1000000'); // 1GB cache size in KB
    this.db.pragma('temp_store = MEMORY'); // Use memory for temp tables
    this.db.pragma('mmap_size = 30000000000'); // 30GB memory-mapped file I/O
    
    this.initializeDatabase();
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initializeDatabase(): void {
    // Create tables if they don't exist
    this.db.exec(`
      -- Main entities table
      CREATE TABLE IF NOT EXISTS entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        primary_role TEXT,
        secondary_roles TEXT,
        likelihood_level TEXT CHECK(likelihood_level IN ('HIGH', 'MEDIUM', 'LOW')),
        mentions INTEGER DEFAULT 0,
        current_status TEXT,
        connections_summary TEXT,
        spice_rating INTEGER CHECK(spice_rating >= 0 AND spice_rating <= 5),
        spice_score INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Evidence types lookup
      CREATE TABLE IF NOT EXISTS evidence_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type_name TEXT UNIQUE NOT NULL,
        description TEXT
      );

      -- Entity evidence types (many-to-many)
      CREATE TABLE IF NOT EXISTS entity_evidence_types (
        entity_id INTEGER,
        evidence_type_id INTEGER,
        PRIMARY KEY (entity_id, evidence_type_id),
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        FOREIGN KEY (evidence_type_id) REFERENCES evidence_types(id) ON DELETE CASCADE
      );

      -- Documents table
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        title TEXT,
        file_path TEXT NOT NULL UNIQUE,
        file_type TEXT,
        file_size INTEGER,
        date_created TEXT,
        date_modified TEXT,
        content_preview TEXT,
        evidence_type TEXT,
        mentions_count INTEGER DEFAULT 0,
        content TEXT,
        metadata_json TEXT,
        word_count INTEGER,
        spice_rating INTEGER,
        content_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Entity mentions in documents (many-to-many relationship)
      CREATE TABLE IF NOT EXISTS entity_mentions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id INTEGER NOT NULL,
        document_id INTEGER NOT NULL,
        mention_context TEXT NOT NULL,
        mention_type TEXT DEFAULT 'mention',
        page_number INTEGER,
        position_in_text INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        context_type TEXT DEFAULT 'mention',
        context_text TEXT DEFAULT '',
        keyword TEXT,
        position_start INTEGER,
        position_end INTEGER,
        significance_score INTEGER DEFAULT 1,
        ai_summary TEXT,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      );

      -- Timeline events
      CREATE TABLE IF NOT EXISTS timeline_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id INTEGER NOT NULL,
        event_date TEXT,
        event_description TEXT,
        event_type TEXT,
        document_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
      );

      -- Full-text search virtual table for entities
      CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
        full_name,
        primary_role,
        secondary_roles,
        connections_summary,
        content='entities',
        content_rowid='id'
      );

      -- Full-text search virtual table for documents
      CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
        file_name,
        content_preview,
        evidence_type,
        content,
        content='documents',
        content_rowid='id'
      );

      -- Performance indexes
      CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(full_name);
      CREATE INDEX IF NOT EXISTS idx_entities_mentions ON entities(mentions DESC);
      CREATE INDEX IF NOT EXISTS idx_entities_spice_rating ON entities(spice_rating DESC);
      CREATE INDEX IF NOT EXISTS idx_entities_likelihood ON entities(likelihood_level);
      CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity ON entity_mentions(entity_id);
      CREATE INDEX IF NOT EXISTS idx_entity_mentions_document ON entity_mentions(document_id);
      CREATE INDEX IF NOT EXISTS idx_entity_mentions_context ON entity_mentions(context_type);
      CREATE INDEX IF NOT EXISTS idx_documents_filename ON documents(file_name);
      CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(date_created);
      CREATE INDEX IF NOT EXISTS idx_timeline_events_date ON timeline_events(event_date DESC);
      CREATE INDEX IF NOT EXISTS idx_timeline_events_type ON timeline_events(event_type);
      
      -- Media items table
      CREATE TABLE IF NOT EXISTS media_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id INTEGER,
        document_id INTEGER,
        file_path TEXT NOT NULL,
        file_type TEXT,
        title TEXT,
        description TEXT,
        verification_status TEXT DEFAULT 'unverified',
        spice_rating INTEGER DEFAULT 1,
        metadata_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_media_items_entity ON media_items(entity_id);
      CREATE INDEX IF NOT EXISTS idx_media_items_spice ON media_items(spice_rating DESC);
    `);

    // Create triggers to keep FTS tables in sync
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS entities_fts_insert AFTER INSERT ON entities BEGIN
        INSERT INTO entities_fts(rowid, full_name, primary_role, secondary_roles, connections_summary)
        VALUES (NEW.id, NEW.full_name, NEW.primary_role, NEW.secondary_roles, NEW.connections_summary);
      END;

      CREATE TRIGGER IF NOT EXISTS entities_fts_update AFTER UPDATE ON entities BEGIN
        UPDATE entities_fts SET 
          full_name = NEW.full_name,
          primary_role = NEW.primary_role,
          secondary_roles = NEW.secondary_roles,
          connections_summary = NEW.connections_summary
        WHERE rowid = OLD.id;
      END;

      CREATE TRIGGER IF NOT EXISTS entities_fts_delete AFTER DELETE ON entities BEGIN
        DELETE FROM entities_fts WHERE rowid = OLD.id;
      END;

      CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents BEGIN
        INSERT INTO documents_fts(rowid, file_name, content_preview, evidence_type, content)
        VALUES (NEW.id, NEW.file_name, NEW.content_preview, NEW.evidence_type, NEW.content);
      END;

      CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents BEGIN
        UPDATE documents_fts SET 
          file_name = NEW.file_name,
          content_preview = NEW.content_preview,
          evidence_type = NEW.evidence_type,
          content = NEW.content
        WHERE rowid = OLD.id;
      END;

      CREATE TRIGGER IF NOT EXISTS documents_fts_delete AFTER DELETE ON documents BEGIN
        DELETE FROM documents_fts WHERE rowid = OLD.id;
      END;
    `);

    // Create entity_summary view (SQLite-compatible aggregation with DISTINCT via subquery)
    this.db.exec(`
      DROP VIEW IF EXISTS entity_summary;
      
      CREATE VIEW entity_summary AS
      SELECT 
          e.id,
          e.full_name,
          e.primary_role,
          e.likelihood_level,
          e.mentions,
          e.spice_rating,
          e.spice_score,
          e.title,
          e.role,
          e.title_variants,
          (
            SELECT GROUP_CONCAT(type_name)
            FROM (
              SELECT DISTINCT et.type_name AS type_name
              FROM entity_evidence_types eet2
              JOIN evidence_types et ON eet2.evidence_type_id = et.id
              WHERE eet2.entity_id = e.id
            ) AS distinct_types
          ) AS evidence_types,
          COUNT(DISTINCT em.document_id) as document_count,
          COUNT(DISTINCT em.id) as mention_count
      FROM entities e
      LEFT JOIN entity_mentions em ON e.id = em.entity_id
      GROUP BY e.id;
    `);
  }

  // Bulk insert entities with prepared statements for performance
  async bulkInsertEntities(entities: any[]): Promise<void> {
    const insertEntity = this.db.prepare(`
      INSERT INTO entities (full_name, primary_role, secondary_roles, likelihood_level, mentions, 
                           current_status, connections_summary, spice_rating, spice_score)
      VALUES (@full_name, @primary_role, @secondary_roles, @likelihood_level, @mentions,
              @current_status, @connections_summary, @spice_rating, @spice_score)
    `);

    const insertDocument = this.db.prepare(`
      INSERT INTO documents (file_name, file_path, file_type, file_size, date_created, date_modified, content_preview, evidence_type, content, metadata_json, word_count, spice_rating, content_hash)
      VALUES (@file_name, @file_path, @file_type, @file_size, @date_created, @date_modified, @content_preview, @evidence_type, @content, @metadata_json, @word_count, @spice_rating, @content_hash)
    `);

    const insertMention = this.db.prepare(`
      INSERT INTO entity_mentions (entity_id, document_id, mention_context, mention_type, page_number, position_in_text)
      VALUES (@entity_id, @document_id, @mention_context, @mention_type, @page_number, @position_in_text)
    `);

    const getEvidenceTypeId = this.db.prepare('SELECT id FROM evidence_types WHERE type_name = ?');
    
    const insertEntityEvidence = this.db.prepare(`
      INSERT OR IGNORE INTO entity_evidence_types (entity_id, evidence_type_id)
      VALUES (@entity_id, @evidence_type_id)
    `);

    const transaction = this.db.transaction((entitiesData: any[]) => {
      for (const entityData of entitiesData) {
        const entityResult = insertEntity.run({
          full_name: entityData.fullName,
          primary_role: entityData.primaryRole,
          secondary_roles: entityData.secondaryRoles ? entityData.secondaryRoles.join(', ') : null,
          likelihood_level: entityData.likelihoodLevel,
          mentions: entityData.mentions || 0,
          current_status: entityData.currentStatus,
          connections_summary: entityData.connectionsSummary,
          spice_rating: entityData.spiceRating,
          spice_score: entityData.spiceScore || 0
        });

        const entityId = entityResult.lastInsertRowid;

        // Insert evidence types
        if (entityData.evidenceTypes && Array.isArray(entityData.evidenceTypes)) {
            for (const typeName of entityData.evidenceTypes) {
                const typeRow = getEvidenceTypeId.get(typeName) as { id: number } | undefined;
                if (typeRow) {
                    insertEntityEvidence.run({
                        entity_id: entityId,
                        evidence_type_id: typeRow.id
                    });
                }
            }
        }

        // Insert documents and mentions
        if (entityData.fileReferences && entityData.fileReferences.length > 0) {
          for (const fileRef of entityData.fileReferences) {
            // Check if document already exists to avoid duplicates
            // We use a simple check here. For high performance with millions of rows, 
            // we might want to cache recent document IDs or use INSERT OR IGNORE with a returning clause if supported.
            // Since we added a UNIQUE index on file_path, we can use that.
            
            let documentId: number | bigint;
            
            const existingDoc = this.db.prepare('SELECT id FROM documents WHERE file_path = ?').get(fileRef.filePath) as { id: number } | undefined;
            
            if (existingDoc) {
                documentId = existingDoc.id;
            } else {
                const docResult = insertDocument.run({
                  file_name: fileRef.filename || fileRef.fileName,
                  file_path: fileRef.filePath,
                  file_type: fileRef.fileType,
                  file_size: fileRef.fileSize,
                  date_created: fileRef.dateCreated,
                  date_modified: fileRef.dateModified,
                  content_preview: fileRef.content ? fileRef.content.substring(0, 200) : '',
                  evidence_type: fileRef.evidenceType || 'document',
                  content: fileRef.content,
                  metadata_json: fileRef.metadataJson,
                  word_count: fileRef.wordCount,
                  spice_rating: fileRef.spiceRating,
                  content_hash: fileRef.contentHash
                });
                documentId = docResult.lastInsertRowid;
            }

            // Insert mention
            insertMention.run({
              entity_id: entityId,
              document_id: documentId,
              context_text: fileRef.contextText || fileRef.context || fileRef.mentionContext || 'Mentioned in document',
              context_type: fileRef.contextType || fileRef.mentionType || 'mention',
              keyword: fileRef.keyword,
              position_start: fileRef.positionStart,
              position_end: fileRef.positionEnd,
              significance_score: fileRef.significanceScore || 1
            });
          }
        }
      }
    });

    transaction(entities);
  }

  // Expose transaction capability
  transaction<T>(fn: (...args: any[]) => T): (...args: any[]) => T {
    return this.db.transaction(fn);
  }

  // Get media items for an entity
  async getMediaItems(entityId: string): Promise<any[]> {
    const query = `
      SELECT 
        id,
        entity_id as entityId,
        document_id as documentId,
        file_path as filePath,
        file_type as fileType,
        title,
        description,
        verification_status as verificationStatus,
        spice_rating as spiceRating,
        metadata_json as metadataJson,
        created_at as createdAt
      FROM media_items
      WHERE entity_id = ?
      ORDER BY spice_rating DESC, created_at DESC
    `;
    
    const mediaItems = this.db.prepare(query).all(entityId) as any[];
    
    return mediaItems.map(item => {
      let metadata = {};
      try {
        if (item.metadataJson) {
          metadata = JSON.parse(item.metadataJson);
        }
      } catch (e) {
        console.error('Error parsing metadata for media item', item.id, e);
      }
      
      return {
        ...item,
        metadata
      };
    });
  }

  // Get paginated media items
  async getMediaItemsPaginated(
    page: number = 1,
    limit: number = 24,
    filters?: { entityId?: string, verificationStatus?: string, minSpiceRating?: number }
  ): Promise<{ mediaItems: any[]; total: number }> {
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (filters?.entityId) {
      whereConditions.push('entity_id = ?');
      params.push(filters.entityId);
    }

    if (filters?.verificationStatus) {
      whereConditions.push('verification_status = ?');
      params.push(filters.verificationStatus);
    }

    if (filters?.minSpiceRating) {
      whereConditions.push('spice_rating >= ?');
      params.push(filters.minSpiceRating);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        id,
        entity_id as entityId,
        document_id as documentId,
        file_path as filePath,
        file_type as fileType,
        title,
        description,
        verification_status as verificationStatus,
        spice_rating as spiceRating,
        metadata_json as metadataJson,
        created_at as createdAt
      FROM media_items
      ${whereClause}
      ORDER BY spice_rating DESC, created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `SELECT COUNT(*) as total FROM media_items ${whereClause}`;
    
    const totalResult = this.db.prepare(countQuery).get(...params) as { total: number };
    const mediaItems = this.db.prepare(query).all(...params, limit, offset) as any[];

    return {
      mediaItems: mediaItems.map(item => {
        let metadata = {};
        try {
          if (item.metadataJson) {
            metadata = JSON.parse(item.metadataJson);
          }
        } catch (e) {
          console.error('Error parsing metadata for media item', item.id, e);
        }
        
        return {
          ...item,
          metadata
        };
      }),
      total: totalResult.total
    };
  }

  // Get paginated entities using the optimized entity_summary view
  async getEntities(
    page: number = 1,
    limit: number = 24,
    filters?: SearchFilters,
    sortBy?: SortOption
  ): Promise<{ entities: any[]; total: number }> {
    const whereConditions: string[] = [];
    let params: any = {};

    // Build dynamic WHERE conditions based on filters
    if (filters?.searchTerm) {
      whereConditions.push(`(
        full_name LIKE @searchTerm OR 
        primary_role LIKE @searchTerm
      )`);
      params.searchTerm = `%${filters.searchTerm}%`;
    }

    if (filters?.likelihoodScore && filters.likelihoodScore.length > 0) {
      whereConditions.push(`likelihood_level IN (${filters.likelihoodScore.map(() => '?').join(',')})`);
      params = { ...params, ...filters.likelihoodScore };
    }

    // Red Flag Index filtering
    if (filters?.minRedFlagIndex !== undefined) {
      whereConditions.push('spice_rating >= @minRedFlagIndex');
      params.minRedFlagIndex = filters.minRedFlagIndex;
    }

    if (filters?.maxRedFlagIndex !== undefined) {
      whereConditions.push('spice_rating <= @maxRedFlagIndex');
      params.maxRedFlagIndex = filters.maxRedFlagIndex;
    }

    // Evidence type filtering temporarily disabled due to view changes
    // TODO: Re-implement evidence type filtering with proper joins
    if (filters?.evidenceTypes && filters.evidenceTypes.length > 0) {
      // Skip evidence type filtering for now
      console.warn('Evidence type filtering temporarily disabled');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    let orderByClause = 'ORDER BY ';
    switch (sortBy) {
      case 'name':
        orderByClause += 'full_name ASC';
        break;
      case 'mentions':
        orderByClause += 'mentions DESC';
        break;
      case 'spice':
        orderByClause += 'spice_rating DESC, spice_score DESC';
        break;
      case 'recent':
        orderByClause += 'id DESC';
        break;
      default:
        // Default sort: Spice Rating DESC, then Risk (Likelihood) DESC
        orderByClause += 'spice_rating DESC, spice_score DESC, likelihood_level DESC';
        break;
    }

    // Query from the view
    const query = `
      SELECT *, document_count
      FROM entity_summary
      ${whereClause}
      ${orderByClause}
      LIMIT @limit OFFSET @offset
    `;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM entity_summary ${whereClause}`;
    const totalResult = this.db.prepare(countQuery).get(params) as { total: number };

    const offset = (page - 1) * limit;
    const results = this.db.prepare(query).all({ ...params, limit, offset }) as any[];

    const entities = results.map(row => ({
      id: row.id.toString(),
      fullName: row.full_name,
      primaryRole: row.primary_role,
      secondaryRoles: [], // View doesn't have secondary_roles, could add to view or fetch separately if critical.
      likelihoodLevel: row.likelihood_level,
      mentions: row.mentions,
      currentStatus: null, // Not in view
      connectionsSummary: null, // Not in view
      spiceRating: row.spice_rating,
      spiceScore: row.spice_score,
      title: row.primary_role, // Fallback to primary_role as title
      role: row.primary_role,
      titleVariants: [], // Fallback to empty array
      documentCount: row.document_count,
      mentionCount: row.mention_count,
      evidence_types: row.evidence_types ? row.evidence_types.split(',') : [], // Map to snake_case for frontend
      files: row.document_count, // Map document_count to files for PersonCard
      fileReferences: [], // Not populated in list view for performance
    }));

    return { entities, total: totalResult.total };
  }

  // Get single entity with all related data
  async getEntityById(id: string): Promise<any> {
    const query = `
      SELECT 
        e.id,
        e.full_name as fullName,
        e.primary_role as primaryRole,
        e.secondary_roles as secondaryRoles,
        e.likelihood_level as likelihoodLevel,
        e.mentions,
        e.current_status as currentStatus,
        e.connections_summary as connectionsSummary,
        e.spice_rating as spiceRating,
        e.spice_score as spiceScore,
        e.title as title,
        e.role as role,
        e.title_variants as titleVariants,
        e.created_at as createdAt,
        e.updated_at as updatedAt,
        (
          SELECT GROUP_CONCAT(type_name)
          FROM (
            SELECT DISTINCT et.type_name
            FROM entity_evidence_types eet
            JOIN evidence_types et ON eet.evidence_type_id = et.id
            WHERE eet.entity_id = e.id
          )
        ) as evidenceTypes
      FROM entities e
      WHERE e.id = ?
    `;
    
    const entity = this.db.prepare(query).get(id) as any;
    
    if (!entity) return null;

    const parsedFileReferences = this.getEntityDocuments(id);
    
    return {
      id: entity.id.toString(),
      fullName: entity.fullName,
      primaryRole: entity.primaryRole,
      secondaryRoles: entity.secondaryRoles ? entity.secondaryRoles.split(', ') : [],
      likelihoodLevel: entity.likelihoodLevel,
      mentions: entity.mentions,
      currentStatus: entity.currentStatus,
      connectionsSummary: entity.connectionsSummary,
      spiceRating: entity.spiceRating,
      spiceScore: entity.spiceScore,
      title: entity.title || entity.role || 'Unknown',
      role: entity.role || 'Unknown',
      titleVariants: entity.titleVariants ? JSON.parse(entity.titleVariants) : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      fileReferences: parsedFileReferences
    };
  }

  // Get documents for a specific entity
  getEntityDocuments(entityId: string): any[] {
    const filesQuery = `
      SELECT DISTINCT 
        d.id, 
        d.file_name as fileName, 
        d.file_path as filePath, 
        d.file_type as fileType,
        d.file_size as fileSize,
        d.date_created as dateCreated,
        d.content_preview as contentPreview,
        d.evidence_type as evidenceType,
        d.spice_rating as spiceRating,
        d.metadata_json as metadataJson,
        em.context_text as contextText,
        em.ai_summary as aiSummary,
        em.page_number as pageNumber,
        em.position_in_text as position
      FROM documents d
      JOIN entity_mentions em ON d.id = em.document_id
      WHERE em.entity_id = ?
      ORDER BY d.date_created DESC
    `;
    
    const fileReferences = this.db.prepare(filesQuery).all(entityId) as any[];
    return fileReferences.map(file => {
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
        metadata
      };
    });
  }

  // Full-text search across entities and documents
  async search(query: string, limit: number = 50): Promise<{ entities: any[]; documents: any[] }> {
    const searchTerm = query.trim();
    
    if (!searchTerm) {
      return { entities: [], documents: [] };
    }
    
    try {
      // Search entities using FTS
    const entityQuery = `
      SELECT 
        e.id,
        e.full_name as fullName,
        e.primary_role as primaryRole,
        e.secondary_roles as secondaryRoles,
        e.likelihood_level as likelihoodLevel,
        e.mentions,
        e.current_status as currentStatus,
        e.connections_summary as connectionsSummary,
        e.spice_rating as spiceRating,
        e.spice_score as spiceScore,
        e.created_at as createdAt,
        e.updated_at as updatedAt
      FROM entities e
      JOIN entities_fts ef ON e.id = ef.rowid
      WHERE entities_fts MATCH @searchTerm
      ORDER BY bm25(entities_fts) DESC
      LIMIT @limit
    `;
    
    const entities = this.db.prepare(entityQuery).all({ 
      searchTerm: `"${searchTerm}"*`,
      limit 
    }) as any[];

    // Search documents using FTS
    const documentQuery = `
      SELECT 
        d.id,
        d.file_name as fileName,
        d.file_path as filePath,
        d.file_type as fileType,
        d.file_size as fileSize,
        d.date_created as dateCreated,
        d.word_count as wordCount,
        d.spice_rating as spiceRating,
        d.created_at as createdAt
      FROM documents d
      JOIN documents_fts df ON d.id = df.rowid
      WHERE documents_fts MATCH @searchTerm
      ORDER BY bm25(documents_fts) DESC
      LIMIT @limit
    `;
      
    const documents = this.db.prepare(documentQuery).all({ 
      searchTerm: `"${searchTerm}"*`,
      limit 
    }) as any[];

    return {
      entities: entities.map(row => ({
        id: row.id.toString(),
        fullName: row.fullName,
        primaryRole: row.primaryRole,
        secondaryRoles: row.secondaryRoles ? row.secondaryRoles.split(', ') : [],
        likelihoodLevel: row.likelihoodLevel,
        mentions: row.mentions,
        currentStatus: row.currentStatus,
        connectionsSummary: row.connectionsSummary,
        spiceRating: row.spiceRating,
        spiceScore: row.spiceScore,
        title: row.title,
        role: row.primaryRole,
        titleVariants: row.titleVariants ? JSON.parse(row.titleVariants) : [],
        contexts: [],
        spicyPassages: [],
        fileReferences: [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      })),
      documents: documents.map(row => ({
        id: row.id.toString(),
        fileName: row.fileName,
        filePath: row.filePath,
        fileType: row.fileType,
        fileSize: row.fileSize,
        dateCreated: row.dateCreated,
        wordCount: row.wordCount,
        spiceRating: row.spiceRating,
        createdAt: row.createdAt
      }))
    };
    } catch (error) {
      console.error('Search error:', error);
      return { entities: [], documents: [] };
    }
  }

  // Get statistics for dashboard
  async getStatistics(): Promise<{
    totalEntities: number;
    totalDocuments: number;
    totalMentions: number;
    averageSpiceRating: number;
    topRoles: { role: string; count: number }[];
    likelihoodDistribution: { level: string; count: number }[];
  }> {
    const stats = this.db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM entities) as totalEntities,
        (SELECT COUNT(*) FROM documents) as totalDocuments,
        (SELECT COUNT(*) FROM entity_mentions) as totalMentions,
        (SELECT AVG(spice_rating) FROM entities) as averageSpiceRating
    `).get() as any;

    const topRoles = this.db.prepare(`
      SELECT primary_role as role, COUNT(*) as count
      FROM entities
      WHERE primary_role IS NOT NULL
      GROUP BY primary_role
      ORDER BY count DESC
      LIMIT 10
    `).all() as { role: string; count: number }[];

    const likelihoodDistribution = this.db.prepare(`
      SELECT likelihood_level as level, COUNT(*) as count
      FROM entities
      WHERE likelihood_level IS NOT NULL
      GROUP BY likelihood_level
    `).all() as { level: string; count: number }[];

    return {
      totalEntities: stats.totalEntities,
      totalDocuments: stats.totalDocuments,
      totalMentions: stats.totalMentions,
      averageSpiceRating: Math.round(stats.averageSpiceRating * 100) / 100,
      topRoles,
      likelihoodDistribution
    };
  }

  // Close database connection
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }

  // Get database size for monitoring
  getDatabaseSize(): number {
    try {
      const stats = statSync(this.DB_PATH);
      return stats.size;
    } catch {
      return 0;
    }
  }

  // Check if database is initialized
  isInitialized(): boolean {
    return this.db && this.db.open;
  }

  // Get paginated documents
  async getDocuments(
    page: number = 1,
    limit: number = 50,
    filters?: any,
    sortBy?: string
  ): Promise<{ documents: any[]; total: number }> {
    const offset = (page - 1) * limit;
    const whereConditions: string[] = [];
    let params: any = {};

    // Build WHERE clause
    if (filters?.fileType && filters.fileType.length > 0) {
      whereConditions.push(`file_type IN (${filters.fileType.map(() => '?').join(',')})`);
      params = { ...params, ...filters.fileType };
    }

    if (filters?.spiceLevel) {
      if (filters.spiceLevel.min) {
        whereConditions.push('spice_rating >= @minSpice');
        params.minSpice = filters.spiceLevel.min;
      }
      if (filters.spiceLevel.max) {
        whereConditions.push('spice_rating <= @maxSpice');
        params.maxSpice = filters.spiceLevel.max;
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    let orderByClause = 'ORDER BY date_created DESC';
    if (sortBy === 'spice') {
      orderByClause = 'ORDER BY spice_rating DESC';
    } else if (sortBy === 'size') {
      orderByClause = 'ORDER BY file_size DESC';
    } else if (sortBy === 'type') {
      orderByClause = 'ORDER BY file_type ASC';
    }

    const query = `
      SELECT 
        id,
        file_name as fileName,
        file_path as filePath,
        file_type as fileType,
        file_size as fileSize,
        date_created as dateCreated,
        date_modified as dateModified,
        content_preview as contentPreview,
        evidence_type as evidenceType,
        spice_rating as spiceRating,
        word_count as wordCount,
        metadata_json as metadataJson,
        content
      FROM documents
      ${whereClause}
      ${orderByClause}
      LIMIT @limit OFFSET @offset
    `;

    const countQuery = `SELECT COUNT(*) as total FROM documents ${whereClause}`;
    
    try {
      const totalResult = this.db.prepare(countQuery).get(params) as { total: number };
      const documents = this.db.prepare(query).all({ ...params, limit, offset }) as any[];

      return {
        documents: documents.map(doc => {
          let metadata = {};
          try {
            if (doc.metadataJson) {
              metadata = JSON.parse(doc.metadataJson);
            }
          } catch (e) {
            console.error('Error parsing metadata for doc', doc.id, e);
          }
          return {
            ...doc,
            id: doc.id.toString(),
            title: doc.fileName, // Fallback title
            metadata,
            // Ensure we have a valid date
            dateCreated: doc.dateCreated || new Date().toISOString()
          };
        }),
        total: totalResult.total
      };
    } catch (error) {
      console.error('Error fetching documents:', error);
      return { documents: [], total: 0 };
    }
  }

  // Get all articles
  async getTimelineEvents() {
    try {
      const events = this.db.prepare(`
        SELECT * FROM timeline_events 
        ORDER BY event_date DESC
      `).all();
      
      return events.map((event: any) => ({
        ...event,
        entities: event.people_involved ? JSON.parse(event.people_involved) : [],
        date: event.event_date
      }));
    } catch (error) {
      console.error('Error getting timeline events:', error);
      return [];
    }
  }

  async getArticles(): Promise<any[]> {
    const articles = this.db.prepare(`
      SELECT * FROM articles 
      ORDER BY spice_rating DESC, published_date DESC
    `).all();
    return articles;
  }

  // Get document by ID with full content
  async getDocumentById(id: string): Promise<any | null> {
    const query = `
      SELECT 
        id,
        file_name as fileName,
        file_path as filePath,
        file_type as fileType,
        file_size as fileSize,
        date_created as dateCreated,
        date_modified as dateModified,
        content_hash as contentHash,
        word_count as wordCount,
        spice_rating as spiceRating,
        metadata_json as metadataJson,
        content,
        evidence_type as evidenceType
      FROM documents
      WHERE id = ?
    `;

    const document = this.db.prepare(query).get(id) as any;
    
    if (!document) return null;

    // Parse metadata if it's a JSON string
    if (document.metadataJson && typeof document.metadataJson === 'string') {
      try {
        document.metadata = JSON.parse(document.metadataJson);
      } catch (e) {
        console.error('Error parsing document metadata:', e);
        document.metadata = {};
      }
    }

    return document;
  }

  getBlackBookEntries() {
    return this.db.prepare(`
      SELECT
        bb.id,
        bb.person_id,
        bb.entry_text,
        bb.phone_numbers,
        bb.addresses,
        bb.email_addresses,
        bb.notes,
        p.full_name as person_name
      FROM black_book_entries bb
      LEFT JOIN people p ON bb.person_id = p.id
      ORDER BY p.full_name ASC
    `).all();
  }

  getBlackBookReviewEntries() {
    try {
      const entries = this.db.prepare(`
        SELECT 
          bb.id,
          bb.person_id,
          bb.entry_text,
          bb.phone_numbers,
          bb.addresses,
          bb.email_addresses,
          p.full_name as original_name,
          p.full_name as cleaned_name,
          p.needs_review
        FROM black_book_entries bb
        LEFT JOIN people p ON bb.person_id = p.id
        WHERE p.needs_review = 1
        ORDER BY bb.id ASC
      `).all();
      
      return entries;
    } catch (error) {
      console.error('Error fetching review entries:', error);
      return [];
    }
  }

  getBlackBookReviewStats() {
    try {
      const stats = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN needs_review = 1 THEN 1 END) as remaining,
          COUNT(CASE WHEN needs_review = 0 OR manually_reviewed = 1 THEN 1 END) as reviewed
        FROM people
        WHERE id IN (SELECT person_id FROM black_book_entries)
      `).get();
      
      return stats;
    } catch (error) {
      console.error('Error fetching review stats:', error);
      return { total: 0, remaining: 0, reviewed: 0 };
    }
  }

  updateBlackBookReview(entryId: number, correctedName: string, action: 'approve' | 'skip' | 'delete') {
    try {
      // Get person_id from black_book_entry
      const entry = this.db.prepare(`
        SELECT person_id FROM black_book_entries WHERE id = ?
      `).get(entryId) as { person_id: number } | undefined;
      
      if (!entry) {
        throw new Error('Entry not found');
      }
      
      if (action === 'approve') {
        // Update name and mark as reviewed
        this.db.prepare(`
          UPDATE people 
          SET full_name = ?, needs_review = 0, manually_reviewed = 1
          WHERE id = ?
        `).run(correctedName, entry.person_id);
        
        // Log the action
        this.db.prepare(`
          INSERT INTO data_quality_log (operation, entity_type, entity_id, details)
          VALUES (?, ?, ?, ?)
        `).run('black_book_review', 'person', entry.person_id, JSON.stringify({ action: 'approve', correctedName }));
        
      } else if (action === 'skip') {
        // Just mark as manually reviewed but keep needs_review flag
        this.db.prepare(`
          UPDATE people SET manually_reviewed = 1 WHERE id = ?
        `).run(entry.person_id);
        
      } else if (action === 'delete') {
        // Mark as deleted (soft delete)
        this.db.prepare(`
          UPDATE people SET needs_review = 0, manually_reviewed = 1, full_name = '[DELETED]' WHERE id = ?
        `).run(entry.person_id);
        
        this.db.prepare(`
          INSERT INTO data_quality_log (operation, entity_type, entity_id, details)
          VALUES (?, ?, ?, ?)
        `).run('black_book_review', 'person', entry.person_id, JSON.stringify({ action: 'delete' }));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  }

  async getDocumentPages(id: string): Promise<{ pages: string[] }> {
    const doc = await this.getDocumentById(id);
    if (!doc || !doc.filePath) return { pages: [] };

    // Extract filename without extension
    const filename = doc.fileName.replace(/\.[^/.]+$/, "");
    
    // Try to find the page number in the filename
    // Format is usually NAME_OF_DOC_PageNumber
    // e.g. HOUSE_OVERSIGHT_010477
    const match = filename.match(/_(\d+)$/);
    if (!match) return { pages: [] };
    
    const startPage = parseInt(match[1], 10);
    
    if (!doc.filePath.includes('Epstein Estate Documents - Seventh Production')) {
        return { pages: [] };
    }

    const baseDirParts = doc.filePath.split('Epstein Estate Documents - Seventh Production/');
    if (baseDirParts.length < 2) return { pages: [] };
    
    const relativePath = baseDirParts[1].replace('TEXT/', 'IMAGES/');
    const baseDir = relativePath.split('/').slice(0, -1).join('/');
    
    const absoluteBaseDir = join('/Users/veland/Downloads/Epstein Files/Epstein Estate Documents - Seventh Production', baseDir);
    
    const pages: string[] = [];
    let currentPage = startPage;
    let pageFound = true;
    
    // Limit to 100 pages to prevent infinite loops if logic fails
    while (pageFound && pages.length < 100) {
        // Reconstruct filename with current page number
        const prefix = filename.substring(0, filename.lastIndexOf('_'));
        const pageStr = currentPage.toString().padStart(match[1].length, '0');
        const currentFilename = `${prefix}_${pageStr}.jpg`;
        const absolutePath = join(absoluteBaseDir, currentFilename);
        
        try {
            statSync(absolutePath);
            // File exists
            pages.push(`/files/${baseDir}/${currentFilename}`);
            currentPage++;
        } catch (e) {
            pageFound = false;
        }
    }
    
    return { pages };
  }

  // Execute raw SQL (used by migration scripts)
  exec(sql: string): void {
    this.db.exec(sql);
  }

  // Prepare a statement (used by migration scripts)
  prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }
}

export const databaseService = DatabaseService.getInstance();