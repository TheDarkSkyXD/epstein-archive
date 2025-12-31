import type { Database } from 'better-sqlite3';
import {
  MemoryEntry,
  CreateMemoryEntryInput,
  UpdateMemoryEntryInput,
  MemoryRelationship,
  CreateMemoryRelationshipInput,
  MemoryAuditLog,
  CreateMemoryAuditLogInput,
  MemoryQualityMetrics,
  CreateMemoryQualityMetricsInput,
  MemorySearchFilters,
  MemorySearchResult,
  ProvenanceInfo
} from '../../types/memory';

export const memoryRepository = {
  /**
   * Creates a new memory entry
   */
  createMemoryEntry: (db: any, input: CreateMemoryEntryInput): MemoryEntry => {
    const stmt = db.prepare(`
      INSERT INTO memory_entries (
        uuid, memory_type, content, metadata_json, context_tags, 
        importance_score, source_id, source_type, quality_score, provenance_json
      ) VALUES (
        @uuid, @memoryType, @content, @metadataJson, @contextTags, 
        @importanceScore, @sourceId, @sourceType, @qualityScore, @provenanceJson
      )
    `);

    const result = stmt.run({
      uuid: input.uuid || globalThis.crypto.randomUUID(),
      memoryType: input.memoryType,
      content: input.content,
      metadataJson: JSON.stringify(input.metadata || {}),
      contextTags: JSON.stringify(input.contextTags || []),
      importanceScore: input.importanceScore || 0.5,
      sourceId: input.sourceId,
      sourceType: input.sourceType,
      qualityScore: 0.5,
      provenanceJson: JSON.stringify(input.provenance || {})
    });

    const newEntry = memoryRepository.getMemoryEntryById(db, result.lastInsertRowid as number);
    if (!newEntry) throw new Error('Failed to retrieve created memory entry');
    return newEntry;
  },

  /**
   * Gets a memory entry by ID
   */
  getMemoryEntryById: (db: any, id: number): MemoryEntry | null => {
    const stmt = db.prepare(`
      SELECT * FROM memory_entries WHERE id = ?
    `);
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      uuid: row.uuid,
      memoryType: row.memory_type,
      content: row.content,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
      contextTags: row.context_tags ? JSON.parse(row.context_tags) : [],
      importanceScore: row.importance_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sourceId: row.source_id,
      sourceType: row.source_type,
      version: row.version,
      status: row.status,
      qualityScore: row.quality_score,
      provenance: row.provenance_json ? JSON.parse(row.provenance_json) : undefined
    };
  },

  /**
   * Updates a memory entry
   */
  updateMemoryEntry: (db: any, id: number, input: UpdateMemoryEntryInput): MemoryEntry | null => {
    // Prepare update fields
    const updateFields: string[] = [];
    const params: any = { id };

    if (input.content !== undefined) {
      updateFields.push('content = @content');
      params.content = input.content;
    }
    if (input.metadata !== undefined) {
      updateFields.push('metadata_json = @metadataJson');
      params.metadataJson = JSON.stringify(input.metadata);
    }
    if (input.contextTags !== undefined) {
      updateFields.push('context_tags = @contextTags');
      params.contextTags = JSON.stringify(input.contextTags);
    }
    if (input.importanceScore !== undefined) {
      updateFields.push('importance_score = @importanceScore');
      params.importanceScore = input.importanceScore;
    }
    if (input.sourceId !== undefined) {
      updateFields.push('source_id = @sourceId');
      params.sourceId = input.sourceId;
    }
    if (input.sourceType !== undefined) {
      updateFields.push('source_type = @sourceType');
      params.sourceType = input.sourceType;
    }
    if (input.status !== undefined) {
      updateFields.push('status = @status');
      params.status = input.status;
    }
    if (input.provenance !== undefined) {
      updateFields.push('provenance_json = @provenanceJson');
      params.provenanceJson = JSON.stringify(input.provenance);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    const stmt = db.prepare(`
      UPDATE memory_entries 
      SET ${updateFields.join(', ')}
      WHERE id = @id
    `);

    stmt.run(params);

    return memoryRepository.getMemoryEntryById(db, id);
  },

  /**
   * Deletes a memory entry
   */
  deleteMemoryEntry: (db: any, id: number): boolean => {
    const stmt = db.prepare(`
      DELETE FROM memory_entries WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Searches memory entries based on filters
   */
  searchMemoryEntries: (
    db: any,
    filters: MemorySearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): MemorySearchResult => {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any = {};

    // Build WHERE conditions based on filters
    if (filters.memoryType) {
      conditions.push('memory_type = @memoryType');
      params.memoryType = filters.memoryType;
    }
    if (filters.status) {
      conditions.push('status = @status');
      params.status = filters.status;
    }
    if (filters.minImportance !== undefined) {
      conditions.push('importance_score >= @minImportance');
      params.minImportance = filters.minImportance;
    }
    if (filters.maxImportance !== undefined) {
      conditions.push('importance_score <= @maxImportance');
      params.maxImportance = filters.maxImportance;
    }
    if (filters.startDate) {
      conditions.push('created_at >= @startDate');
      params.startDate = filters.startDate;
    }
    if (filters.endDate) {
      conditions.push('created_at <= @endDate');
      params.endDate = filters.endDate;
    }
    if (filters.sourceId) {
      conditions.push('source_id = @sourceId');
      params.sourceId = filters.sourceId;
    }
    if (filters.sourceType) {
      conditions.push('source_type = @sourceType');
      params.sourceType = filters.sourceType;
    }
    if (filters.contextTag) {
      conditions.push("context_tags LIKE '%' || @contextTag || '%'");
      params.contextTag = filters.contextTag;
    }

    let whereClause = '';
    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // Add full-text search if provided
    let ftsJoin = '';
    let ftsCondition = '';
    if (filters.searchQuery) {
      ftsJoin = 'JOIN memory_entries_fts fts ON memory_entries.id = fts.memory_entry_id';
      ftsCondition = `AND fts.content MATCH @searchQuery`;
      params.searchQuery = filters.searchQuery;
    }

    // Count total records
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total
      FROM memory_entries
      ${ftsJoin}
      ${whereClause} ${ftsCondition}
    `);
    const result = countStmt.get(params) as { total: number } | undefined;
    const totalCount = result?.total || 0;

    // Fetch paginated results
    const stmt = db.prepare(`
      SELECT * FROM memory_entries
      ${ftsJoin}
      ${whereClause} ${ftsCondition}
      ORDER BY importance_score DESC, created_at DESC
      LIMIT @limit OFFSET @offset
    `);

    const rows = stmt.all({ ...params, limit, offset }) as any[];

    const data = rows.map(row => ({
      id: row.id,
      uuid: row.uuid,
      memoryType: row.memory_type,
      content: row.content,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
      contextTags: row.context_tags ? JSON.parse(row.context_tags) : [],
      importanceScore: row.importance_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sourceId: row.source_id,
      sourceType: row.source_type,
      version: row.version,
      status: row.status,
      qualityScore: row.quality_score,
      provenance: row.provenance_json ? JSON.parse(row.provenance_json) : undefined
    }));

    return {
      data,
      total: totalCount,
      page,
      pageSize: limit,
      totalPages: Math.ceil(totalCount / limit)
    };
  },

  /**
   * Creates a relationship between two memory entries
   */
  createMemoryRelationship: (db: any, input: CreateMemoryRelationshipInput): MemoryRelationship => {
    const stmt = db.prepare(`
      INSERT INTO memory_relationships (
        from_memory_id, to_memory_id, relationship_type, strength
      ) VALUES (
        @fromMemoryId, @toMemoryId, @relationshipType, @strength
      )
    `);

    const result = stmt.run({
      fromMemoryId: input.fromMemoryId,
      toMemoryId: input.toMemoryId,
      relationshipType: input.relationshipType,
      strength: input.strength || 1.0
    });

    const newRelationship = memoryRepository.getMemoryRelationshipById(db, result.lastInsertRowid as number);
    if (!newRelationship) throw new Error('Failed to retrieve created memory relationship');
    return newRelationship;
  },

  /**
   * Gets a memory relationship by ID
   */
  getMemoryRelationshipById: (db: any, id: number): MemoryRelationship | null => {
    const stmt = db.prepare(`
      SELECT * FROM memory_relationships WHERE id = ?
    `);
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      fromMemoryId: row.from_memory_id,
      toMemoryId: row.to_memory_id,
      relationshipType: row.relationship_type,
      strength: row.strength,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  },

  /**
   * Gets relationships for a memory entry
   */
  getMemoryRelationships: (db: any, memoryId: number): MemoryRelationship[] => {
    const stmt = db.prepare(`
      SELECT * FROM memory_relationships 
      WHERE from_memory_id = ? OR to_memory_id = ?
      ORDER BY strength DESC
    `);
    const rows = stmt.all(memoryId, memoryId) as any[];

    return rows.map(row => ({
      id: row.id,
      fromMemoryId: row.from_memory_id,
      toMemoryId: row.to_memory_id,
      relationshipType: row.relationship_type,
      strength: row.strength,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  },

  /**
   * Logs an audit event for a memory operation
   */
  logMemoryAuditEvent: (db: any, input: CreateMemoryAuditLogInput): void => {
    const stmt = db.prepare(`
      INSERT INTO memory_audit_log (
        memory_entry_id, action, actor, old_values_json, new_values_json, metadata_json
      ) VALUES (
        @memoryEntryId, @action, @actor, @oldValuesJson, @newValuesJson, @metadataJson
      )
    `);

    stmt.run({
      memoryEntryId: input.memoryEntryId,
      action: input.action,
      actor: input.actor,
      oldValuesJson: input.oldValues ? JSON.stringify(input.oldValues) : null,
      newValuesJson: input.newValues ? JSON.stringify(input.newValues) : null,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null
    });
  },

  /**
   * Gets audit log for a memory entry
   */
  getMemoryAuditLog: (db: any, memoryEntryId: number): MemoryAuditLog[] => {
    const stmt = db.prepare(`
      SELECT * FROM memory_audit_log 
      WHERE memory_entry_id = ?
      ORDER BY timestamp DESC
    `);
    const rows = stmt.all(memoryEntryId) as any[];

    return rows.map(row => ({
      id: row.id,
      memoryEntryId: row.memory_entry_id,
      action: row.action as 'CREATE' | 'UPDATE' | 'DELETE' | 'ACCESS',
      actor: row.actor,
      timestamp: row.timestamp,
      oldValues: row.old_values_json ? JSON.parse(row.old_values_json) : undefined,
      newValues: row.new_values_json ? JSON.parse(row.new_values_json) : undefined,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined
    }));
  },

  /**
   * Creates quality metrics for a memory entry
   */
  createMemoryQualityMetrics: (
    db: any,
    input: CreateMemoryQualityMetricsInput
  ): MemoryQualityMetrics => {
    const stmt = db.prepare(`
      INSERT INTO memory_quality_metrics (
        memory_entry_id, source_reliability, evidence_strength, 
        temporal_relevance, entity_confidence
      ) VALUES (
        @memoryEntryId, @sourceReliability, @evidenceStrength, 
        @temporalRelevance, @entityConfidence
      )
    `);

    const result = stmt.run({
      memoryEntryId: input.memoryEntryId,
      sourceReliability: input.sourceReliability,
      evidenceStrength: input.evidenceStrength,
      temporalRelevance: input.temporalRelevance,
      entityConfidence: input.entityConfidence
    });

    const newMetrics = memoryRepository.getMemoryQualityMetricsById(db, result.lastInsertRowid as number);
    if (!newMetrics) throw new Error('Failed to retrieve created memory quality metrics');
    return newMetrics;
  },

  /**
   * Gets quality metrics for a memory entry
   */
  getMemoryQualityMetricsById: (db: any, id: number): MemoryQualityMetrics | null => {
    const stmt = db.prepare(`
      SELECT * FROM memory_quality_metrics WHERE id = ?
    `);
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      memoryEntryId: row.memory_entry_id,
      sourceReliability: row.source_reliability,
      evidenceStrength: row.evidence_strength,
      temporalRelevance: row.temporal_relevance,
      entityConfidence: row.entity_confidence,
      overallScore: row.overall_score,
      calculatedAt: row.calculated_at
    };
  },

  /**
   * Gets the latest quality metrics for a memory entry
   */
  getLatestMemoryQualityMetrics: (db: any, memoryEntryId: number): MemoryQualityMetrics | null => {
    const stmt = db.prepare(`
      SELECT * FROM memory_quality_metrics 
      WHERE memory_entry_id = ?
      ORDER BY calculated_at DESC
      LIMIT 1
    `);
    const row = stmt.get(memoryEntryId) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      memoryEntryId: row.memory_entry_id,
      sourceReliability: row.source_reliability,
      evidenceStrength: row.evidence_strength,
      temporalRelevance: row.temporal_relevance,
      entityConfidence: row.entity_confidence,
      overallScore: row.overall_score,
      calculatedAt: row.calculated_at
    };
  },

  /**
   * Gets audit logs for a memory entry
   */
  getMemoryAuditLogs: (db: any, memoryEntryId: number): MemoryAuditLog[] => {
    const stmt = db.prepare(`
      SELECT * FROM memory_audit_log 
      WHERE memory_entry_id = ?
      ORDER BY timestamp DESC
    `);
    const rows = stmt.all(memoryEntryId) as any[];

    return rows.map(row => ({
      id: row.id,
      memoryEntryId: row.memory_entry_id,
      action: row.action as 'CREATE' | 'UPDATE' | 'DELETE' | 'ACCESS',
      actor: row.actor,
      timestamp: row.timestamp,
      oldValues: row.old_values_json ? JSON.parse(row.old_values_json) : undefined,
      newValues: row.new_values_json ? JSON.parse(row.new_values_json) : undefined,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined
    }));
  },

  /**
   * Gets quality metrics for a memory entry (alias for getMemoryQualityMetricsById)
   */
  getQualityMetrics: (db: any, memoryEntryId: number): MemoryQualityMetrics | null => {
    return memoryRepository.getMemoryQualityMetricsById(db, memoryEntryId);
  },

  /**
   * Updates quality metrics for a memory entry
   */
  updateQualityMetrics: (db: any, memoryEntryId: number, metrics: {
    sourceReliability: number;
    evidenceStrength: number;
    temporalRelevance: number;
    entityConfidence: number;
  }): MemoryQualityMetrics => {
    // Calculate overall score
    const overallScore = (metrics.sourceReliability + metrics.evidenceStrength + 
                        metrics.temporalRelevance + metrics.entityConfidence) / 4;

    const stmt = db.prepare(`
      INSERT INTO memory_quality_metrics (
        memory_entry_id, source_reliability, evidence_strength, 
        temporal_relevance, entity_confidence
      ) VALUES (
        @memoryEntryId, @sourceReliability, @evidenceStrength, 
        @temporalRelevance, @entityConfidence
      )
    `);

    const result = stmt.run({
      memoryEntryId,
      sourceReliability: metrics.sourceReliability,
      evidenceStrength: metrics.evidenceStrength,
      temporalRelevance: metrics.temporalRelevance,
      entityConfidence: metrics.entityConfidence
    });

    const newMetrics = memoryRepository.getMemoryQualityMetricsById(db, result.lastInsertRowid as number);
    if (!newMetrics) throw new Error('Failed to retrieve updated memory quality metrics');
    return newMetrics;
  }
};