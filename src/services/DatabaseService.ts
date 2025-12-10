import Database from 'better-sqlite3';
import { SearchFilters, SortOption } from '../types';
import { join } from 'path';
import { statSync } from 'fs';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database.Database;
  private readonly DB_PATH = process.env.DB_PATH || join(process.cwd(), 'epstein-archive.db');

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
    // Check if essential tables exist before creating them
    const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const tableNames = tables.map(t => t.name);
    
    // Only create tables if they don't exist
    if (!tableNames.includes('entities') || !tableNames.includes('documents')) {
      this.db.exec(`
        -- Main entities table
        CREATE TABLE IF NOT EXISTS entities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          type TEXT CHECK(type IN ('Person', 'Organization', 'Location', 'Unknown')) DEFAULT 'Unknown',
          role TEXT,
          description TEXT,
          red_flag_rating INTEGER DEFAULT 0,
          red_flag_score INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Evidence types lookup
        CREATE TABLE IF NOT EXISTS evidence_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type_name TEXT UNIQUE NOT NULL,
          description TEXT
        );

        -- Documents table
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          file_path TEXT NOT NULL UNIQUE,
          file_type TEXT,
          file_size INTEGER,
          date_created TEXT,
          evidence_type TEXT,
          content TEXT,
          metadata_json TEXT,
          word_count INTEGER,
          red_flag_rating INTEGER,
          md5_hash TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

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
        CREATE TABLE IF NOT EXISTS investigations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT DEFAULT (lower(hex(randomblob(16)))),
          title TEXT NOT NULL,
          description TEXT,
          owner_id TEXT,
          collaborator_ids TEXT,
          status TEXT DEFAULT 'open',
          scope TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS evidence_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          investigation_id INTEGER NOT NULL,
          document_id INTEGER,
          title TEXT,
          type TEXT,
          source_id TEXT,
          source TEXT,
          description TEXT,
          relevance TEXT,
          credibility TEXT,
          extracted_at DATETIME,
          extracted_by TEXT,
          authenticity_score INTEGER,
          hash TEXT,
          sensitivity TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE,
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS chain_of_custody (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          evidence_id INTEGER NOT NULL,
          date DATETIME NOT NULL,
          actor TEXT,
          action TEXT,
          notes TEXT,
          signature TEXT,
          FOREIGN KEY (evidence_id) REFERENCES evidence_items(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS investigation_timeline_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          investigation_id INTEGER NOT NULL,
          title TEXT,
          description TEXT,
          type TEXT,
          start_date TEXT,
          end_date TEXT,
          entities_json TEXT,
          documents_json TEXT,
          confidence INTEGER,
          importance TEXT,
          tags_json TEXT,
          location_json TEXT,
          sources_json TEXT,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS document_forensic_metrics (
          document_id INTEGER PRIMARY KEY,
          metrics_json TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        );
      `);
    }

    // Check if FTS tables exist before creating them
    const ftsTables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%fts%'").all() as { name: string }[];
    const ftsTableNames = ftsTables.map(t => t.name);
    
    // Only create FTS tables if they don't exist
    if (!ftsTableNames.includes('entities_fts') || !ftsTableNames.includes('documents_fts')) {
      try {
        this.db.exec(`
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
        `);
      } catch (e) {
        // FTS tables might already exist with different structure, continue anyway
        console.log('FTS tables may already exist, continuing...');
      }
    }
    
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
          e.red_flag_rating,
          e.red_flag_score,
          e.title as entity_type,
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
          0 as document_count,
          0 as mention_count
      FROM entities e
      GROUP BY e.id;
    `);
  }

  // Bulk insert entities with prepared statements for performance
  async bulkInsertEntities(entities: any[]): Promise<void> {
    const insertEntity = this.db.prepare(`
      INSERT INTO entities (full_name, primary_role, secondary_roles, likelihood_level, mentions, 
                           current_status, connections_summary, red_flag_rating, red_flag_score)
      VALUES (@full_name, @primary_role, @secondary_roles, @likelihood_level, @mentions,
              @current_status, @connections_summary, @red_flag_rating, @red_flag_score)
    `);

    const insertDocument = this.db.prepare(`
      INSERT INTO documents (title, file_path, file_type, file_size, date_created, content, metadata_json, word_count, red_flag_rating, md5_hash)
      VALUES (@title, @file_path, @file_type, @file_size, @date_created, @content, @metadata_json, @word_count, @red_flag_rating, @content_hash)
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
          red_flag_rating: entityData.redFlagRating,
          red_flag_score: entityData.redFlagScore || 0
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
                  file_name: fileRef.fileName,
                  file_path: fileRef.filePath || fileRef.path,
                  file_type: fileRef.fileType,
                  file_size: fileRef.fileSize || 0,
                  date_created: fileRef.dateCreated || new Date().toISOString(),
                  content: fileRef.content || '',
                  metadata_json: fileRef.metadataJson || '{}',
                  word_count: fileRef.wordCount || 0,
                  red_flag_rating: fileRef.redFlagRating || 0,
                  content_hash: fileRef.contentHash || ''
                });
                documentId = docResult.lastInsertRowid;
            }

            // Insert mention

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

  // Expose database for raw queries (use with caution)
  getDatabase(): Database.Database {
    return this.db;
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
        spiceRating: item.spiceRating,
        metadata
      };
    });
  }

  // Get all media items (for Evidence Media tab)
  async getAllMediaItems(): Promise<any[]> {
    const query = `
      SELECT 
        m.id,
        m.entity_id as entityId,
        m.document_id as documentId,
        m.file_path as filePath,
        m.file_type as fileType,
        m.title,
        m.description,
        m.verification_status as verificationStatus,
        m.spice_rating as spiceRating,
        m.metadata_json as metadataJson,
        m.created_at as createdAt,
        e.full_name as entityName
      FROM media_items m
      LEFT JOIN entities e ON m.entity_id = e.id
      ORDER BY m.spice_rating DESC, m.created_at DESC
    `;
    
    const mediaItems = this.db.prepare(query).all() as any[];
    
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
        spiceRating: item.spiceRating,
        metadata,
        relatedEntities: item.entityName ? [item.entityName] : []
      };
    });
  }    
  // Get single media item by ID
  getMediaItemById(id: number): any | undefined {
    const query = `
      SELECT * FROM media_items WHERE id = ?
    `;
    const item = this.db.prepare(query).get(id) as any;
    if (!item) return undefined;
    
    let metadata = {};
    try {
      if (item.metadata_json) {
        metadata = JSON.parse(item.metadata_json);
      }
    } catch (e) {
      console.error('Error parsing metadata for media item', item.id, e);
    }
    
    return {
      ...item,
      spiceRating: item.spice_rating,
      metadata
    };
  }

  // Get paginated media items
  async getMediaItemsPaginated(
    page: number = 1,
    limit: number = 24,
    filters?: { entityId?: string, verificationStatus?: string, minRedFlagRating?: number }
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

    if (filters?.minRedFlagRating) {
      whereConditions.push('red_flag_rating >= ?');
      params.push(filters.minRedFlagRating);
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
        red_flag_rating as redFlagRating,
        metadata_json as metadataJson,
        created_at as createdAt
      FROM media_items
      ${whereClause}
      ORDER BY red_flag_rating DESC, created_at DESC
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
          redFlagRating: item.redFlagRating,
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
    console.log('getEntities called with filters:', filters);
    console.log('DB_PATH:', this.DB_PATH);
    const whereConditions: string[] = [];
    const params: any = {};

    // Build dynamic WHERE conditions based on filters
    if (filters?.searchTerm) {
      whereConditions.push(`(
        name LIKE @searchTerm OR 
        role LIKE @searchTerm
      )`);
      params.searchTerm = `%${filters.searchTerm}%`;
    }

    // Likelihood score filter - maps to red_flag_rating ranges
    // HIGH = red_flag_rating 4-5, MEDIUM = 2-3, LOW = 0-1
    if (filters?.likelihoodScore && filters.likelihoodScore.length > 0) {
      const ratingConditions: string[] = [];
      
      if (filters.likelihoodScore.includes('HIGH')) {
        ratingConditions.push('(e.red_flag_rating >= 4)');
      }
      if (filters.likelihoodScore.includes('MEDIUM')) {
        ratingConditions.push('(e.red_flag_rating >= 2 AND e.red_flag_rating < 4)');
      }
      if (filters.likelihoodScore.includes('LOW')) {
        ratingConditions.push('(e.red_flag_rating < 2 OR e.red_flag_rating IS NULL)');
      }
      
      if (ratingConditions.length > 0) {
        whereConditions.push(`(${ratingConditions.join(' OR ')})`);
      }
    }

    // Red Flag Index filtering
    if (filters?.minRedFlagIndex !== undefined) {
      whereConditions.push('red_flag_rating >= @minRedFlagIndex');
      params.minRedFlagIndex = filters.minRedFlagIndex;
    }

    if (filters?.maxRedFlagIndex !== undefined) {
      whereConditions.push('red_flag_rating <= @maxRedFlagIndex');
      params.maxRedFlagIndex = filters.maxRedFlagIndex;
    }

    // Entity type filtering
    if (filters?.entityType) {
      whereConditions.push('type = @entityType');
      params.entityType = filters.entityType;
    }

    // Stub evidence type filter (cant join easily without mentions table)
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    // Default: RFI DESC → Mentions (document_count) DESC → Name ASC
    let orderByClause = '';
    switch (sortBy) {
      case 'name':
        orderByClause = 'ORDER BY e.name ASC';
        break;
      case 'recent':
        orderByClause = 'ORDER BY e.id DESC';
        break;
      case 'mentions':
        orderByClause = 'ORDER BY document_count DESC, e.red_flag_rating DESC, e.name ASC';
        break;
      case 'spice':
      case 'risk':
      default:
        // Primary: RFI, Secondary: Mentions, Tertiary: Name
        // Use explicit COALESCE(e.mentions, 0) instead of alias to ensure correct sorting behavior
        orderByClause = 'ORDER BY e.red_flag_rating DESC, COALESCE(e.mentions, 0) DESC, e.name ASC';
        break;
    }
    
    console.log(`[getEntities] Sort: ${sortBy}, OrderClause: ${orderByClause}`);

    // Query directly from entities table - use pre-computed mentions count for performance
    // The slow LIKE subquery was causing API timeouts
    const query = `
      SELECT 
        e.id, 
        e.name as full_name, 
        e.role as primary_role, 
        e.type as entity_type,
        e.red_flag_rating,
        e.description as red_flag_description,
        COALESCE(e.mentions, 0) as document_count
      FROM entities e
      ${whereClause}
      ${orderByClause}
      LIMIT @limit OFFSET @offset
    `;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM entities e ${whereClause}`;
    const totalResult = this.db.prepare(countQuery).get(params) as { total: number };

    const offset = (page - 1) * limit;
    const results = this.db.prepare(query).all({ ...params, limit, offset }) as any[];

    // Get evidence type distribution for entities (batch query for performance)
    const entityIds = results.map(r => r.id);
    const evidenceTypesMap = new Map<number, string[]>();
    
    if (entityIds.length > 0) {
      // Get evidence types for these entities based on documents mentioning them
      for (const row of results) {
        const evidenceQuery = `
          SELECT DISTINCT evidence_type 
          FROM documents 
          WHERE (content LIKE '%' || ? || '%' OR title LIKE '%' || ?)
          AND evidence_type IS NOT NULL
          LIMIT 5
        `;
        const types = this.db.prepare(evidenceQuery).all(row.full_name, row.full_name) as any[];
        evidenceTypesMap.set(row.id, types.map(t => t.evidence_type));
      }
    }

    const entities = results.map(row => ({
      id: row.id.toString(),
      name: row.full_name,
      fullName: row.full_name,
      primaryRole: row.primary_role || 'Unknown',
      title: row.primary_role || 'Unknown',
      entityType: row.entity_type || 'Person',
      secondaryRoles: [],
      likelihoodLevel: 'LOW',
      mentions: row.document_count || 0,
      currentStatus: null,
      connectionsSummary: null,
      redFlagRating: row.red_flag_rating !== null ? row.red_flag_rating : 0,
      redFlagScore: 0,
      redFlagIndicators: null,
      redFlagDescription: row.red_flag_description || '',
      redFlagPeppers: row.red_flag_rating !== null ? '🚩'.repeat(row.red_flag_rating) : '🏳️',
      evidence_types: evidenceTypesMap.get(row.id) || [],
      files: row.document_count || 0,
      fileReferences: []
    }));

    return { entities, total: totalResult.total };
  }

  // Get single entity with all related data
  // Get single entity with all related data
  async getEntityById(id: string): Promise<any> {
    // Validate ID format
    if (!id || !/^[1-9]\d*$/.test(id)) {
      throw new Error('Invalid entity ID format');
    }
    
    // Query direct from entities table using correct schema
    const query = `
      SELECT 
        e.id,
        e.name as fullName,
        e.role as primaryRole,
        e.type as entityType,
        e.red_flag_rating as redFlagRating,
        e.red_flag_score as redFlagScore,
        e.description as redFlagDescription
      FROM entities e
      WHERE e.id = ?
    `;
    
    const entity = this.db.prepare(query).get(parseInt(id, 10)) as any;
    
    if (!entity) return null;

    const parsedFileReferences = this.getEntityDocuments(id);
    
    return {
      id: entity.id.toString(),
      fullName: entity.fullName,
      name: entity.fullName, // Frontend expects name often
      primaryRole: entity.primaryRole,
      title: entity.primaryRole, // Fallback for PersonCard
      entityType: entity.entityType, // Fallback for PersonCard
      secondaryRoles: [],
      likelihoodLevel: 0,
      mentions: 0,
      currentStatus: null,
      connectionsSummary: null,
      redFlagRating: entity.redFlagRating || 0,
      redFlagScore: entity.redFlagScore,
      redFlagIndicators: [],
      redFlagDescription: entity.redFlagDescription,
      titleVariants: [],
      fileReferences: parsedFileReferences,
      evidenceTypes: [] // Prevent generic fallbacks
    };
  }

  // Get documents for a specific entity
  getEntityDocuments(entityId: string): any[] {
    // Validate entity ID format
    if (!entityId || !/^[1-9]\d*$/.test(entityId)) {
      throw new Error('Invalid entity ID format');
    }
    
        // Simplified query using LIKE operator since entity_mentions table is removed
    const entityNameObj = this.db.prepare('SELECT name FROM entities WHERE id = ?').get(entityId) as { name: string };
    
    if (!entityNameObj) return [];
    
    // Simple search for documents containing the entity name
    const filesQuery = `
      SELECT 
        d.id,
        d.title as fileName,
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
      WHERE d.content LIKE ? OR d.title LIKE ?
      ORDER BY d.red_flag_rating DESC, d.date_created DESC
      LIMIT 50
    `;
    
    const searchPattern = `%${entityNameObj.name}%`;
    const fileReferences = this.db.prepare(filesQuery).all(searchPattern, searchPattern) as any[];
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
  async search(query: string, limit: number = 50, filters: { evidenceType?: string, redFlagBand?: string } = {}): Promise<{ entities: any[]; documents: any[] }> {
    const searchTerm = query.trim();
    
    if (!searchTerm) {
      return { entities: [], documents: [] };
    }
    
    try {
      // Search entities using FTS
    const entityQuery = `
      SELECT 
        e.id,
        e.name as fullName,
        e.role as primaryRole,
        e.type as entityType,
        e.red_flag_rating as redFlagRating,
        e.red_flag_score as redFlagScore,
        e.description as redFlagDescription
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

    // Build document query with filters
    let documentQuery = `
      SELECT 
        d.id,
        d.title as fileName,
        d.file_path as filePath,
        d.file_type as fileType,
        d.evidence_type as evidenceType,
        d.file_size as fileSize,
        d.date_created as dateCreated,
        d.word_count as wordCount,
        d.red_flag_rating as redFlagRating
      FROM documents d
      JOIN documents_fts df ON d.id = df.rowid
      WHERE documents_fts MATCH @searchTerm
    `;

    const params: any = {
      searchTerm: `"${searchTerm}"*`,
      limit
    };

    if (filters.evidenceType && filters.evidenceType !== 'ALL') {
      documentQuery += ` AND d.evidence_type = @evidenceType`;
      params.evidenceType = filters.evidenceType.toLowerCase();
    }

    if (filters.redFlagBand) {
      if (filters.redFlagBand === 'high') {
        documentQuery += ` AND d.red_flag_rating >= 4`;
      } else if (filters.redFlagBand === 'medium') {
        documentQuery += ` AND d.red_flag_rating >= 2 AND d.red_flag_rating < 4`;
      } else if (filters.redFlagBand === 'low') {
        documentQuery += ` AND d.red_flag_rating < 2`;
      }
    }

    documentQuery += ` ORDER BY bm25(documents_fts) DESC LIMIT @limit`;
      
    const documents = this.db.prepare(documentQuery).all(params) as any[];

    return {
      entities: entities.map(row => ({
        id: row.id.toString(),
        fullName: row.fullName,
        name: row.fullName, // Helper
        primaryRole: row.primaryRole,
        title: row.primaryRole, // Fallback
        entityType: row.entityType,
        secondaryRoles: [],
        likelihoodLevel: 0,
        mentions: 0,
        currentStatus: null,
        connectionsSummary: null,
        redFlagRating: row.redFlagRating,
        redFlagScore: row.redFlagScore,
        redFlagIndicators: [],
        redFlagDescription: row.redFlagDescription,
        titleVariants: [],
        evidenceTypes: [] // Prevent fallback to 'Unknown' or invalid types
      })),
      documents: documents.map(row => ({
        id: row.id.toString(),
        fileName: row.fileName,
        title: row.fileName, // Helper
        filePath: row.filePath,
        fileType: row.fileType,
        evidenceType: row.evidenceType,
        fileSize: row.fileSize,
        dateCreated: row.dateCreated,
        wordCount: row.wordCount,
        redFlagRating: row.redFlagRating,
        createdAt: row.dateCreated
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
  totalUniqueRoles: number; // Added this line
  entitiesWithDocuments: number;
  documentsWithMetadata: number;
  activeInvestigations: number;
  topRoles: { role: string; count: number }[];
  topEntities: { name: string; mentions: number; spice: number }[];
  likelihoodDistribution: { level: string; count: number }[];
  redFlagDistribution?: { rating: number; count: number }[];
}> {
  const stats = this.db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM entities) as totalEntities,
      (SELECT COUNT(*) FROM documents) as totalDocuments,
      (SELECT COALESCE(SUM(mentions), 0) FROM entities) as totalMentions,
      (SELECT AVG(red_flag_rating) FROM entities) as averageSpiceRating,
      (SELECT COUNT(DISTINCT role) FROM entities WHERE role IS NOT NULL AND role != '') as totalUniqueRoles,
      (SELECT COUNT(*) FROM entities WHERE mentions > 0) as entitiesWithDocuments,
      (SELECT COUNT(*) FROM documents WHERE metadata_json IS NOT NULL AND Length(metadata_json) > 2) as documentsWithMetadata,
      (SELECT COUNT(*) FROM investigations WHERE status = 'active') as activeInvestigations
  `).get() as any;

  const topRoles = this.db.prepare(`
    SELECT role, COUNT(*) as count 
    FROM entities 
    WHERE role IS NOT NULL AND role != ''
    GROUP BY role 
    ORDER BY count DESC
    LIMIT 10
  `).all() as { role: string; count: number }[];

  // Get red_flag_rating distribution (1-5 scale)
  const redFlagDistribution = this.db.prepare(`
    SELECT red_flag_rating as rating, COUNT(*) as count
    FROM entities
    WHERE red_flag_rating IS NOT NULL
    GROUP BY red_flag_rating
    ORDER BY red_flag_rating ASC
  `).all() as { rating: number; count: number }[];

  // Compute likelihoodDistribution from red_flag_rating for better analytics
  const likelihoodDistribution = [
    { level: 'HIGH', count: redFlagDistribution.filter(r => r.rating >= 4).reduce((a, b) => a + b.count, 0) },
    { level: 'MEDIUM', count: redFlagDistribution.filter(r => r.rating >= 2 && r.rating < 4).reduce((a, b) => a + b.count, 0) },
    { level: 'LOW', count: redFlagDistribution.filter(r => r.rating < 2).reduce((a, b) => a + b.count, 0) }
  ];

  // Get top entities by mentions
  const topEntities = this.db.prepare(`
    SELECT name, mentions, red_flag_rating as spice
    FROM entities
    WHERE mentions > 0 
    AND (type IS NULL OR type = 'Person')
    AND name NOT LIKE 'The %'
    ORDER BY mentions DESC
    LIMIT 20
  `).all() as { name: string; mentions: number; spice: number }[];

  return {
    totalEntities: stats.totalEntities,
    totalDocuments: stats.totalDocuments,
    totalMentions: stats.totalMentions,
    averageSpiceRating: Math.round(stats.averageSpiceRating * 100) / 100,
    totalUniqueRoles: stats.totalUniqueRoles,
    entitiesWithDocuments: stats.entitiesWithDocuments,
    documentsWithMetadata: stats.documentsWithMetadata,
    activeInvestigations: stats.activeInvestigations,
    topRoles,
    topEntities, // Added field
    likelihoodDistribution,
    redFlagDistribution
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
    return this.db !== undefined && this.db !== null;
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

    if (filters?.redFlagLevel) {
      if (filters.redFlagLevel.min) {
        whereConditions.push('red_flag_rating >= @minRedFlag');
        params.minRedFlag = filters.redFlagLevel.min;
      }
      if (filters.redFlagLevel.max) {
        whereConditions.push('red_flag_rating <= @maxRedFlag');
        params.maxRedFlag = filters.redFlagLevel.max;
      }
    }

    // Add evidenceType filter
    if (filters?.evidenceType && filters.evidenceType !== 'ALL') {
      whereConditions.push('evidence_type = @evidenceType');
      params.evidenceType = filters.evidenceType.toLowerCase();
    }

    // Add search filter
    if (filters?.search && filters.search.trim()) {
      whereConditions.push('(title LIKE @searchPattern OR content LIKE @searchPattern)');
      params.searchPattern = `%${filters.search.trim()}%`;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    let orderByClause = 'ORDER BY date_created DESC';
    if (sortBy === 'red_flag') {
      orderByClause = 'ORDER BY red_flag_rating DESC';
    } else if (sortBy === 'size') {
      orderByClause = 'ORDER BY file_size DESC';
    } else if (sortBy === 'type') {
      orderByClause = 'ORDER BY file_type ASC';
    }

    const query = `
      SELECT 
        id,
        title as fileName,
        file_path as filePath,
        file_type as fileType,
        file_size as fileSize,
        date_created as dateCreated,
        substr(content, 1, 200) as contentPreview,
        evidence_type as evidenceType,
        red_flag_rating as redFlagRating,
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
            metadata: {
              ...metadata,
              source_collection: doc.source_collection || (metadata as any)?.source_collection,
              source_original_url: doc.source_original_url || (metadata as any)?.source_original_url,
              credibility_score: typeof doc.credibility_score === 'number' ? doc.credibility_score : (metadata as any)?.credibility_score
            },
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
      ORDER BY red_flag_rating DESC, published_date DESC
    `).all();
    return articles;
  }

  async getRelationshipStats(): Promise<{
    total_relationships: number;
    avg_proximity_score: number;
    avg_risk_score: number;
    avg_confidence: number;
    top_entities_by_relationship_count: { entity_id: number; count: number }[];
  }> {
    const totals = this.db.prepare(`
      SELECT 
        COUNT(*) as total_relationships,
        AVG(COALESCE(proximity_score, weight)) as avg_proximity_score,
        AVG(COALESCE(risk_score, 0)) as avg_risk_score,
        AVG(confidence) as avg_confidence
      FROM entity_relationships
    `).get() as any;
    const top = this.db.prepare(`
      SELECT source_id as entity_id, COUNT(*) as count
      FROM entity_relationships
      GROUP BY source_id
      ORDER BY count DESC
      LIMIT 10
    `).all() as { entity_id: number; count: number }[];
    return {
      total_relationships: totals.total_relationships || 0,
      avg_proximity_score: Number((totals.avg_proximity_score || 0).toFixed(2)),
      avg_risk_score: Number((totals.avg_risk_score || 0).toFixed(2)),
      avg_confidence: Number((totals.avg_confidence || 0).toFixed(2)),
      top_entities_by_relationship_count: top
    };
  }

  async getRelationships(
    entityId: number,
    filters: { minWeight?: number; minConfidence?: number; from?: string; to?: string; includeBreakdown?: boolean } = {}
  ): Promise<any[]> {
    const where: string[] = ['source_id = @entityId'];
    const params: any = { entityId };
    if (filters.minWeight !== undefined) {
      where.push('(COALESCE(proximity_score, weight) >= @minWeight)');
      params.minWeight = filters.minWeight;
    }
    if (filters.minConfidence !== undefined) {
      where.push('confidence >= @minConfidence');
      params.minConfidence = filters.minConfidence;
    }
    if (filters.from) {
      where.push('(last_seen_at IS NULL OR last_seen_at >= @from)');
      params.from = filters.from;
    }
    if (filters.to) {
      where.push('(first_seen_at IS NULL OR first_seen_at <= @to)');
      params.to = filters.to;
    }
    const rows = this.db.prepare(`
      SELECT source_id, target_id, relationship_type, strength as proximity_score,
             0 as risk_score, 1 as confidence, NULL as metadata_json
      FROM entity_relationships
      WHERE ${where.join(' AND ')}
      ORDER BY proximity_score DESC
    `).all(params) as any[];
    return rows.map(r => ({
      source_id: r.source_id,
      target_id: r.target_id,
      relationship_type: r.relationship_type,
      proximity_score: r.proximity_score,
      risk_score: r.risk_score,
      confidence: r.confidence,
      metadata_json: filters.includeBreakdown ? (r.metadata_json ? JSON.parse(r.metadata_json) : null) : undefined,
      disclaimer: 'This reflects data connections and evidence categories, not a legal determination.'
    }));
  }

  async getGraphSlice(
    entityId: number,
    depth: number = 2,
    filters?: { from?: string; to?: string; evidenceType?: string }
  ): Promise<{ nodes: any[]; edges: any[] }> {
    const visited = new Set<number>();
    const queue: { id: number; d: number }[] = [{ id: entityId, d: 0 }];
    const nodes: any[] = [];
    const edges: any[] = [];
    while (queue.length) {
      const { id, d } = queue.shift()!;
      if (visited.has(id) || d > depth) continue;
      visited.add(id);
      const entity = this.db.prepare(`SELECT id, full_name FROM entities WHERE id = ?`).get(id) as any;
      if (entity) nodes.push({ id: entity.id, label: entity.full_name, type: 'entity' });
      const rels = this.db.prepare(`
        SELECT source_id, target_id, relationship_type, COALESCE(proximity_score, weight) as proximity_score,
               risk_score, confidence, metadata_json
        FROM entity_relationships
        WHERE source_id = ?
        ORDER BY proximity_score DESC
        LIMIT 200
      `).all(id) as any[];
      for (const r of rels) {
        edges.push({
          source_id: r.source_id,
          target_id: r.target_id,
          relationship_type: r.relationship_type,
          proximity_score: r.proximity_score,
          risk_score: r.risk_score,
          confidence: r.confidence
        });
        if (!visited.has(r.target_id)) queue.push({ id: r.target_id, d: d + 1 });
      }
    }
    return { nodes, edges };
  }

  async getEnrichmentStats(): Promise<{
    total_documents: number;
    documents_with_metadata_json: number;
    total_entities: number;
    entities_with_mentions: number;
    last_enrichment_run?: string | null;
  }> {
    const totals = this.db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM documents) as total_documents,
        (SELECT COUNT(*) FROM documents WHERE metadata_json IS NOT NULL AND metadata_json <> '') as documents_with_metadata_json,
        (SELECT COUNT(*) FROM entities) as total_entities,
        0 as entities_with_mentions
    `).get() as any;
    const last = this.db.prepare(`SELECT finished_at FROM jobs WHERE job_type='relationships_recompute' AND status='success' ORDER BY finished_at DESC LIMIT 1`).get() as any;
    return {
      total_documents: totals.total_documents || 0,
      documents_with_metadata_json: totals.documents_with_metadata_json || 0,
      total_entities: totals.total_entities || 0,
      entities_with_mentions: 0,
      last_enrichment_run: last ? last.finished_at : null
    }
  }

  async listJobs(jobType?: string, status?: string): Promise<any[]> {
    const where: string[] = []
    const params: any = {}
    if (jobType) { where.push('job_type = @jobType'); params.jobType = jobType }
    if (status) { where.push('status = @status'); params.status = status }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    return this.db.prepare(`SELECT id, uuid, job_type, payload_json, status, started_at, finished_at, error_message FROM jobs ${whereClause} ORDER BY started_at DESC`).all(params)
  }

  async getAliasStats(): Promise<{ total_clusters: number; merges: number; last_run?: string | null }> {
    const mergesRow = this.db.prepare(`SELECT COUNT(*) as merges FROM merge_log WHERE reason='alias_cluster'`).get() as any
    const lastRow = this.db.prepare(`SELECT finished_at FROM jobs WHERE job_type='alias_cluster' AND status='success' ORDER BY finished_at DESC LIMIT 1`).get() as any
    return { total_clusters: mergesRow?.merges || 0, merges: mergesRow?.merges || 0, last_run: lastRow ? lastRow.finished_at : null }
  }

  async getEntitySummarySource(entityId: number, topN: number = 10): Promise<{ entity: any; relationships: any[]; documents: any[] }> {
    const entity = this.db.prepare(`SELECT id, name as full_name, role as primary_role FROM entities WHERE id=?`).get(entityId) as any
    const relationships = this.db.prepare(`
      SELECT 
        source_id, 
        target_id, 
        type as relationship_type,
        weight as proximity_score,
        0 as risk_score, confidence, metadata_json
      FROM entity_relationships 
      WHERE source_id=?
      ORDER BY weight DESC
      LIMIT ?
    `).all(entityId, topN) as any[]
    const docs = this.db.prepare(`
      SELECT id, title, evidence_type, metadata_json, red_flag_rating, word_count, date_created
      FROM documents
      WHERE title LIKE ? OR content LIKE ?
      LIMIT ?
    `).all(`%${entity.full_name}%`, `%${entity.full_name}%`, topN) as any[]
    return { entity, relationships: relationships.map(r => ({ id: r.source_id, target_id: r.target_id, proximity: r.proximity_score, risk: r.risk_score, confidence: r.confidence, type: r.relationship_type })), documents: docs.map(d => ({ id: d.id, title: d.title, evidence_type: d.evidence_type, risk: d.red_flag_rating })) }
  }

  // Get document by ID with full content
  async getDocumentById(id: string): Promise<any | null> {
    const query = `
      SELECT 
        id,
        title as fileName,
        file_path as filePath,
        file_type as fileType,
        file_size as fileSize,
        date_created as dateCreated,
        md5_hash as contentHash,
        word_count as wordCount,
        red_flag_rating as redFlagRating,
        metadata_json as metadataJson,
        content,
        evidence_type as evidenceType
      FROM documents
      WHERE id = ?
    `;    const document = this.db.prepare(query).get(id) as any;
    
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

    return {
      ...document,
      source_collection: 'Epstein Files'
    };
  }

  getBlackBookEntries(filters?: {
    letter?: string;
    search?: string;
    hasPhone?: boolean;
    hasEmail?: boolean;
    hasAddress?: boolean;
    limit?: number;
  }) {
    const whereClauses: string[] = [];
    const params: any = {};

    // Letter filter - match names that START with the letter (case-insensitive)
    if (filters?.letter && filters.letter !== 'ALL') {
      whereClauses.push(`UPPER(COALESCE(p.full_name, SUBSTR(bb.entry_text, 1, INSTR(bb.entry_text, '\n') - 1))) LIKE UPPER(@letter || '%')`);
      params.letter = filters.letter;
    }

    // Search filter - match anywhere in name, phone, email, or address
    if (filters?.search) {
      whereClauses.push(`(
        COALESCE(p.full_name, bb.entry_text) LIKE '%' || @search || '%' OR
        bb.phone_numbers LIKE '%' || @search || '%' OR
        bb.email_addresses LIKE '%' || @search || '%' OR
        bb.addresses LIKE '%' || @search || '%'
      )`);
      params.search = filters.search;
    }

    // Contact info filters
    if (filters?.hasPhone) {
      whereClauses.push(`bb.phone_numbers IS NOT NULL AND bb.phone_numbers != '[]'`);
    }
    if (filters?.hasEmail) {
      whereClauses.push(`bb.email_addresses IS NOT NULL AND bb.email_addresses != '[]'`);
    }
    if (filters?.hasAddress) {
      whereClauses.push(`bb.addresses IS NOT NULL AND bb.addresses != '[]'`);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const limitClause = filters?.limit ? `LIMIT ${filters.limit}` : '';

    const query = `
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
      ${whereClause}
      ORDER BY p.full_name ASC
      ${limitClause}
    `;

    return this.db.prepare(query).all(params);
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
