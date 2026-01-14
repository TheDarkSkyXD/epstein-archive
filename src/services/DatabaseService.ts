import Database from 'better-sqlite3';
import { SearchFilters, SortOption } from '../types';
import { join } from 'path';
import { statSync } from 'fs';
import { entitiesRepository } from '../server/db/entitiesRepository.js';
import { documentsRepository } from '../server/db/documentsRepository.js';
import { mediaRepository } from '../server/db/mediaRepository.js';
import { articleRepository } from '../server/db/articleRepository.js';
import { blackBookRepository } from '../server/db/blackBookRepository.js';
import { documentPagesRepository } from '../server/db/documentPagesRepository.js';
import { bulkOperationsRepository } from '../server/db/bulkOperationsRepository.js';
import { searchRepository } from '../server/db/searchRepository.js';
import { statsRepository } from '../server/db/statsRepository.js';
import { timelineRepository } from '../server/db/timelineRepository.js';
import { relationshipsRepository } from '../server/db/relationshipsRepository.js';
import { jobsRepository } from '../server/db/jobsRepository.js';
import { evidenceRepository } from '../server/db/evidenceRepository.js';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: any;
  private readonly DB_PATH = process.env.DB_PATH || join(process.cwd(), 'epstein-archive.db');

  private constructor() {
    console.log(`[DatabaseService] Initializing with DB_PATH: ${this.DB_PATH}`);
    console.log(`[DatabaseService] Current working directory: ${process.cwd()}`);
    this.db = new Database(this.DB_PATH, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
      timeout: 60000, // 60 second timeout for large operations (increased from 30s)
    });

    // Enable foreign keys and optimize for performance
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    this.db.pragma('busy_timeout = 60000'); // Wait up to 60s (was 30s) if DB is locked before throwing
    this.db.pragma('synchronous = NORMAL'); // Balance between safety and performance
    this.db.pragma('cache_size = -1000000'); // 1GB cache size in KB
    this.db.pragma('temp_store = MEMORY'); // Use memory for temp tables
    this.db.pragma('mmap_size = 30000000000'); // 30GB memory-mapped file I/O

    this.initializeDatabase();
    this.validateSchemaIntegrity();
  }

  /**
   * Validates that the connected database has the expected schema.
   * Throws an error if critical columns are missing.
   * This prevents runtime errors due to schema drift.
   */
  private validateSchemaIntegrity(): void {
    console.log('[DatabaseService] 🛡️ Validating database schema integrity...');

    const requiredSchema = {
      entities: ['full_name', 'primary_role'],
      documents: ['file_path', 'red_flag_rating', ['md5_hash', 'content_hash']],
      media_items: ['red_flag_rating'],
      evidence: ['evidence_type', 'source_path', 'title'],
      evidence_entity: ['evidence_id', 'entity_id', 'role'],
      investigation_evidence: ['investigation_id', 'evidence_id'],
    };

    const errors: string[] = [];

    for (const [table, columns] of Object.entries(requiredSchema)) {
      try {
        const tableInfo = this.db.pragma(`table_info(${table})`) as { name: string }[];
        const existingColumns = new Set(tableInfo.map((c) => c.name));

        for (const col of columns) {
          // Handle array of acceptable column names
          if (Array.isArray(col)) {
            // At least one of the column names should exist
            const found = col.some((name) => existingColumns.has(name));
            if (!found) {
              errors.push(
                `Table '${table}' is missing required column: one of '${col.join(', ')}'`,
              );
            }
          } else {
            // Single column name check
            if (!existingColumns.has(col)) {
              errors.push(`Table '${table}' is missing required column: '${col}'`);
            }
          }
        }
      } catch (e) {
        // If table doesn't exist or other error, strictly it's a failure if it's a critical table
        // But for fresh installs, tables might be created in initializeDatabase.
        // Assuming initializeDatabase ran, tables should exist.
        console.warn(`[DatabaseService] Could not validate table '${table}':`, e);
      }
    }

    if (errors.length > 0) {
      const errorMessage = `
        ❌ CRITICAL DATABASE SCHEMA ERROR ❌
        The connected database (${this.DB_PATH}) does not match the expected schema.
        
        Missing key columns:
        ${errors.map((e) => ` - ${e}`).join('\n')}
        
        APPLICATION STARTUP HALTED TO PREVENT DATA CORRUPTION or RUNTIME ERRORS.
        Please ensure you are using the correct database file version (High Integrity Production Schema).
      `;
      console.error(errorMessage);
      // In production, we want to fail fast.
      // But we can throws exception which might be caught, or process.exit.
      // Throwing Error is better for stack traces.
      throw new Error(errorMessage);
    }

    console.log('[DatabaseService] ✅ Schema integrity validated.');
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initializeDatabase(): void {
    // Check if essential tables exist before creating them
    const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
      name: string;
    }[];
    const tableNames = tables.map((t) => t.name);

    // Only create tables if they don't exist
    if (!tableNames.includes('entities') || !tableNames.includes('documents')) {
      this.db.exec(`
        -- Main entities table
        CREATE TABLE IF NOT EXISTS entities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          full_name TEXT NOT NULL UNIQUE,
          type TEXT CHECK(type IN ('Person', 'Organization', 'Location', 'Unknown')) DEFAULT 'Unknown',
          primary_role TEXT,
          secondary_roles TEXT,
          description TEXT,
          red_flag_rating INTEGER DEFAULT 0,
          red_flag_score INTEGER DEFAULT 0,
          connections_summary TEXT,
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
      `);
    }

    // Ensure all other tables exist (idempotent checks)
    this.db.exec(`
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
          red_flag_rating INTEGER DEFAULT 1,
          metadata_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_media_items_entity ON media_items(entity_id);
        CREATE INDEX IF NOT EXISTS idx_media_items_red_flag ON media_items(red_flag_rating DESC);

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

        -- evidence_items table DEPRECATED and REMOVED in favor of evidence and investigation_evidence

        CREATE TABLE IF NOT EXISTS chain_of_custody (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          evidence_id INTEGER NOT NULL,
          date DATETIME NOT NULL,
          actor TEXT,
          action TEXT,
          notes TEXT,
          signature TEXT,
          FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
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

        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT,
          role TEXT DEFAULT 'investigator',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_active DATETIME
        );
        
        INSERT OR IGNORE INTO users (id, username, email, role) VALUES 
        ('user-1', 'Admin User', 'admin@example.com', 'admin'),
        ('user-2', 'Lead Investigator', 'lead@example.com', 'investigator'),
        ('user-3', 'Analyst', 'analyst@example.com', 'viewer');
    `);

    // Ensure financial_transactions exists (added later)
    if (!tableNames.includes('financial_transactions')) {
      this.db.exec(`
         CREATE TABLE IF NOT EXISTS financial_transactions (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           investigation_id INTEGER,
           from_entity TEXT,
           to_entity TEXT,
           amount REAL,
           currency TEXT DEFAULT 'USD',
           transaction_date TEXT,
           transaction_type TEXT,
           method TEXT,
           risk_level TEXT,
           description TEXT,
           suspicious_indicators TEXT, -- JSON array
           source_document_ids TEXT, -- JSON array
           created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
           FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE SET NULL
         );
      `);
    }

    // Ensure articles table exists (separate check as it was added later)
    this.db.exec(`
        CREATE TABLE IF NOT EXISTS articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          link TEXT NOT NULL UNIQUE,
          description TEXT,
          content TEXT,
          pub_date TEXT,
          author TEXT,
          source TEXT,
          image_url TEXT,
          guid TEXT UNIQUE,
          red_flag_rating INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Evidence table (core evidence records)
        CREATE TABLE IF NOT EXISTS evidence (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          evidence_type TEXT NOT NULL CHECK(evidence_type IN (
            'court_deposition',
            'court_filing',
            'contact_directory',
            'correspondence',
            'financial_record',
            'investigative_report',
            'testimony',
            'timeline_data',
            'media_scan',
            'evidence_list'
          )),
          source_path TEXT NOT NULL UNIQUE,
          cleaned_path TEXT,
          original_filename TEXT NOT NULL,
          mime_type TEXT,
          title TEXT,
          description TEXT,
          extracted_text TEXT,
          created_at DATETIME,
          modified_at DATETIME,
          ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          red_flag_rating INTEGER CHECK(red_flag_rating >= 0 AND red_flag_rating <= 5),
          evidence_tags TEXT, -- JSON array
          metadata_json TEXT, -- Type-specific metadata
          word_count INTEGER,
          file_size INTEGER,
          content_hash TEXT UNIQUE
        );
        
        -- Evidence_Entity junction table (links evidence to entities)
        CREATE TABLE IF NOT EXISTS evidence_entity (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          evidence_id INTEGER NOT NULL,
          entity_id INTEGER NOT NULL,
          role TEXT, -- sender, recipient, mentioned, subject, passenger, deponent, etc.
          confidence REAL CHECK(confidence >= 0.0 AND confidence <= 1.0),
          context_snippet TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
          FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
          UNIQUE(evidence_id, entity_id, role) -- Prevent duplicate links with same role
        );
        
        -- Investigation Evidence (link evidence to investigations)
        CREATE TABLE IF NOT EXISTS investigation_evidence (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          investigation_id INTEGER NOT NULL,
          evidence_id INTEGER NOT NULL,
          notes TEXT,
          relevance TEXT CHECK(relevance IN ('high', 'medium', 'low')),
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          added_by TEXT,
          FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
          UNIQUE(investigation_id, evidence_id)
        );
    `);

    // Check if FTS tables exist before creating them
    const ftsTables = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%fts%'")
      .all() as { name: string }[];
    const ftsTableNames = ftsTables.map((t) => t.name);

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
            title,
            content,
            evidence_type,
            tokenize='porter',
            content='documents',
            content_rowid='id'
          );
        `);
      } catch (e) {
        // FTS tables might already exist with different structure, continue anyway
        console.log('FTS tables may already exist, continuing...');
      }
    }

    // Create FTS table for evidence
    try {
      this.db.exec(`
        -- Full-text search virtual table for evidence
        CREATE VIRTUAL TABLE IF NOT EXISTS evidence_fts USING fts5(
          title,
          description,
          extracted_text,
          evidence_type,
          evidence_tags,
          content='evidence',
          content_rowid='id'
        );
      `);
    } catch (e) {
      console.log('Evidence FTS table may already exist, continuing...');
    }

    // Create triggers to keep evidence FTS in sync
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS evidence_fts_insert AFTER INSERT ON evidence BEGIN
        INSERT INTO evidence_fts(rowid, title, description, extracted_text, evidence_type, evidence_tags)
        VALUES (NEW.id, NEW.title, NEW.description, NEW.extracted_text, NEW.evidence_type, NEW.evidence_tags);
      END;
      
      CREATE TRIGGER IF NOT EXISTS evidence_fts_update AFTER UPDATE ON evidence BEGIN
        UPDATE evidence_fts SET 
          title = NEW.title,
          description = NEW.description,
          extracted_text = NEW.extracted_text,
          evidence_type = NEW.evidence_type,
          evidence_tags = NEW.evidence_tags
        WHERE rowid = OLD.id;
      END;
      
      CREATE TRIGGER IF NOT EXISTS evidence_fts_delete AFTER DELETE ON evidence BEGIN
        DELETE FROM evidence_fts WHERE rowid = OLD.id;
      END;
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(evidence_type);
      CREATE INDEX IF NOT EXISTS idx_evidence_created_at ON evidence(created_at);
      CREATE INDEX IF NOT EXISTS idx_evidence_red_flag ON evidence(red_flag_rating);
      CREATE INDEX IF NOT EXISTS idx_evidence_entity_evidence ON evidence_entity(evidence_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_entity_entity ON evidence_entity(entity_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_entity_role ON evidence_entity(role);
      CREATE INDEX IF NOT EXISTS idx_investigation_evidence_investigation ON investigation_evidence(investigation_id);
      CREATE INDEX IF NOT EXISTS idx_investigation_evidence_evidence ON investigation_evidence(evidence_id);
    `);

    // Create evidence summary view
    this.db.exec(`
      CREATE VIEW IF NOT EXISTS evidence_summary AS
      SELECT 
        e.id,
        e.evidence_type,
        e.title,
        e.original_filename,
        e.created_at,
        e.red_flag_rating,
        e.word_count,
        e.file_size,
        COUNT(DISTINCT ee.entity_id) as entity_count,
        GROUP_CONCAT(DISTINCT ent.full_name) as entity_names
      FROM evidence e
      LEFT JOIN evidence_entity ee ON e.id = ee.evidence_id
      LEFT JOIN entities ent ON ee.entity_id = ent.id
      GROUP BY e.id;
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
        INSERT INTO documents_fts(rowid, title, content, evidence_type)
        VALUES (NEW.id, NEW.title, NEW.content, NEW.evidence_type);
      END;

      CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents BEGIN
        UPDATE documents_fts SET 
          title = NEW.title,
          content = NEW.content,
          evidence_type = NEW.evidence_type
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
    return bulkOperationsRepository.bulkInsertEntities(entities);
  }

  // Expose transaction capability
  transaction<T>(fn: (...args: any[]) => T): (...args: any[]) => T {
    return this.db.transaction(fn);
  }

  prepareStatement(sql: string): any {
    return this.db.prepare(sql);
  }

  // Expose database for raw queries (use with caution)
  getDatabase(): any {
    return this.db;
  }

  // Get media items for an entity
  async getMediaItems(entityId: string) {
    return mediaRepository.getMediaItems(entityId);
  }

  // Get all media items (for Evidence Media tab)
  async getAllMediaItems() {
    return mediaRepository.getAllMediaItems();
  }

  // Insert an article into the database
  insertArticle(article: any) {
    return articleRepository.insertArticle(article);
  }

  // Get single media item by ID
  getMediaItemById(id: number) {
    return mediaRepository.getMediaItemById(id);
  }

  // Get paginated media items
  async getMediaItemsPaginated(
    page: number = 1,
    limit: number = 24,
    filters?: { entityId?: string; verificationStatus?: string; minRedFlagRating?: number },
  ) {
    return mediaRepository.getMediaItemsPaginated(page, limit, filters);
  }

  // Get paginated entities using the optimized entity_summary view
  async getEntities(
    page: number = 1,
    limit: number = 24,
    filters?: SearchFilters,
    sortBy?: SortOption,
  ): Promise<{ entities: any[]; total: number }> {
    return entitiesRepository.getEntities(page, limit, filters, sortBy);
  }

  // Get single entity with all related data
  async getEntityById(id: string): Promise<any> {
    return entitiesRepository.getEntityById(id);
  }

  // Get documents for a specific entity
  getEntityDocuments(entityId: string): any[] {
    return entitiesRepository.getEntityDocuments(entityId);
  }

  // Full-text search across entities and documents
  async search(
    query: string,
    limit: number = 50,
    filters: { evidenceType?: string; redFlagBand?: string } = {},
  ): Promise<{ entities: any[]; documents: any[] }> {
    return searchRepository.search(query, limit, filters);
  }
  // Get statistics for dashboard
  async getStatistics(): Promise<{
    totalEntities: number;
    totalDocuments: number;
    totalMentions: number;
    averageRedFlagRating: number;
    totalUniqueRoles: number; // Added this line
    entitiesWithDocuments: number;
    documentsWithMetadata: number;
    activeInvestigations: number;
    topRoles: { role: string; count: number }[];
    topEntities: { name: string; mentions: number; redFlagRating: number }[];
    likelihoodDistribution: { level: string; count: number }[];
    redFlagDistribution?: { rating: number; count: number }[];
  }> {
    return statsRepository.getStatistics();
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
    sortBy?: string,
  ): Promise<{ documents: any[]; total: number }> {
    // Convert sortBy parameter to match documentsRepository expectations
    let sortByParam = 'red_flag';
    if (sortBy === 'size') {
      sortByParam = 'size';
    } else if (sortBy === 'type') {
      sortByParam = 'type';
    } else if (sortBy === 'date') {
      sortByParam = 'date';
    }

    // Convert filters to match documentsRepository expectations
    const repoFilters: any = {
      search: filters?.search,
      fileType: filters?.fileType,
      evidenceType: filters?.evidenceType,
      minRedFlag: filters?.redFlagLevel?.min,
      maxRedFlag: filters?.redFlagLevel?.max,
      sortBy: sortByParam,
    };

    return documentsRepository.getDocuments(page, limit, repoFilters);
  } // Get timeline events
  async getTimelineEvents() {
    return timelineRepository.getTimelineEvents();
  }
  async getArticles() {
    return articleRepository.getArticles();
  }

  async getRelationshipStats(): Promise<{
    total_relationships: number;
    avg_proximity_score: number;
    avg_risk_score: number;
    avg_confidence: number;
    top_entities_by_relationship_count: { entity_id: number; count: number }[];
  }> {
    const stats = relationshipsRepository.getStats();
    return {
      total_relationships: stats.total_relationships,
      avg_proximity_score: stats.avg_proximity_score,
      avg_risk_score: stats.avg_risk_score,
      avg_confidence: stats.avg_confidence,
      top_entities_by_relationship_count: stats.top_entities_by_relationship_count,
    };
  }
  async getRelationships(
    entityId: number,
    filters: {
      minWeight?: number;
      minConfidence?: number;
      from?: string;
      to?: string;
      includeBreakdown?: boolean;
    } = {},
  ): Promise<any[]> {
    return relationshipsRepository.getRelationships(entityId, filters);
  }
  async getGraphSlice(
    entityId: number,
    depth: number = 2,
    filters?: { from?: string; to?: string; evidenceType?: string },
  ): Promise<{ nodes: any[]; edges: any[] }> {
    return relationshipsRepository.getGraphSlice(entityId, depth, filters);
  }
  async getEnrichmentStats(): Promise<{
    total_documents: number;
    documents_with_metadata_json: number;
    total_entities: number;
    entities_with_mentions: number;
    last_enrichment_run?: string | null;
  }> {
    return statsRepository.getEnrichmentStats();
  }
  async listJobs(jobType?: string, status?: string): Promise<any[]> {
    return jobsRepository.listJobs(jobType, status);
  }
  async getAliasStats(): Promise<{
    total_clusters: number;
    merges: number;
    last_run?: string | null;
  }> {
    return statsRepository.getAliasStats();
  }
  async getEntitySummarySource(
    entityId: number,
    topN: number = 10,
  ): Promise<{ entity: any; relationships: any[]; documents: any[] }> {
    return relationshipsRepository.getEntitySummarySource(entityId, topN);
  } // Get document by ID with full content
  async getDocumentById(id: string): Promise<any | null> {
    return documentsRepository.getDocumentById(id);
  }

  getBlackBookEntries(filters?: any) {
    return blackBookRepository.getBlackBookEntries(filters);
  }

  getBlackBookReviewEntries() {
    return blackBookRepository.getBlackBookReviewEntries();
  }

  getBlackBookReviewStats() {
    return blackBookRepository.getBlackBookReviewStats();
  }

  updateBlackBookReview(
    entryId: number,
    correctedName: string,
    action: 'approve' | 'skip' | 'delete',
  ) {
    return blackBookRepository.updateBlackBookReview(entryId, correctedName, action);
  }

  async getDocumentPages(id: string) {
    return documentPagesRepository.getDocumentPages(id);
  }

  // Evidence methods for investigation routes
  async getEntityEvidence(entityId: string) {
    return evidenceRepository.getEntityEvidence(entityId);
  }

  async addEvidenceToInvestigation(
    investigationId: string,
    evidenceId: string,
    notes: string,
    relevance: string,
  ) {
    return evidenceRepository.addEvidenceToInvestigation(
      investigationId,
      evidenceId,
      notes,
      relevance,
    );
  }

  async getInvestigationEvidenceSummary(investigationId: string) {
    return evidenceRepository.getInvestigationEvidenceSummary(investigationId);
  }

  async removeEvidenceFromInvestigation(investigationEvidenceId: string) {
    return evidenceRepository.removeEvidenceFromInvestigation(investigationEvidenceId);
  }
  async addMediaToInvestigation(
    investigationId: string,
    mediaItemId: string,
    notes: string,
    relevance: string,
  ) {
    return evidenceRepository.addMediaToInvestigation(
      investigationId,
      mediaItemId,
      notes,
      relevance,
    );
  }

  // Evidence search and retrieval methods
  async searchEvidence(params: {
    q?: string;
    type?: string;
    entityId?: string;
    dateFrom?: string;
    dateTo?: string;
    redFlagMin?: string;
    tags?: string;
    page?: string;
    limit?: string;
  }) {
    return evidenceRepository.searchEvidence(params);
  }

  async getEvidenceById(id: string) {
    return evidenceRepository.getEvidenceById(id);
  }

  async getEvidenceTypes() {
    return evidenceRepository.getEvidenceTypes();
  }

  async getEntityEvidenceList(
    entityId: string,
    params: { page?: string; limit?: string; type?: string },
  ) {
    return evidenceRepository.getEntityEvidenceList(entityId, params);
  }

  // Execute raw SQL (used by migration scripts)
  exec(sql: string): void {
    this.db.exec(sql);
  }

  // Prepare a statement (used by migration scripts)
  prepare(sql: string): any {
    return this.db.prepare(sql);
  }
}

export const databaseService = DatabaseService.getInstance();
