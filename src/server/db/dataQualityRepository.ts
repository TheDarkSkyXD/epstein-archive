import { getDb } from './connection.js';

/**
 * Data Quality Repository
 *
 * Provides data quality metrics, provenance tracking, and audit trail functionality
 * for the Epstein Archive investigative platform.
 */

export interface DataQualityMetrics {
  totalDocuments: number;
  documentsWithProvenance: number;
  documentsWithoutProvenance: number;
  provenanceCoverage: number;

  ocrQualityDistribution: { band: string; count: number }[];
  sourceCollections: { name: string; count: number }[];
  evidenceTypeDistribution: { type: string; count: number }[];

  entityQuality: {
    total: number;
    withRoles: number;
    withRedFlagDescription: number;
    orphaned: number;
  };

  dataCompleteness: {
    documentsWithContent: number;
    documentsWithMetadata: number;
    entitiesWithMentions: number;
  };

  lastUpdated: string;
}

export interface AuditLogEntry {
  id?: number;
  timestamp?: string;
  userId?: string;
  action: string;
  objectType: string;
  objectId?: string;
  payload?: Record<string, any>;
}

export const dataQualityRepository = {
  /**
   * Get comprehensive data quality metrics
   */
  getMetrics: (): DataQualityMetrics => {
    const db = getDb();

    // Document counts
    const totalDocs = db.prepare('SELECT COUNT(*) as c FROM documents').get() as { c: number };
    const docsWithProvenance = db
      .prepare(
        "SELECT COUNT(*) as c FROM documents WHERE source_collection IS NOT NULL AND source_collection != ''",
      )
      .get() as { c: number };

    // OCR Quality Distribution
    const ocrQuality = db
      .prepare(
        `
      SELECT 
        CASE 
          WHEN ocr_quality_score >= 0.8 THEN 'High (80%+)'
          WHEN ocr_quality_score >= 0.5 THEN 'Medium (50-80%)'
          WHEN ocr_quality_score > 0 THEN 'Low (<50%)'
          ELSE 'Not Processed'
        END as band,
        COUNT(*) as count
      FROM documents
      GROUP BY band
      ORDER BY 
        CASE band
          WHEN 'High (80%+)' THEN 1
          WHEN 'Medium (50-80%)' THEN 2
          WHEN 'Low (<50%)' THEN 3
          ELSE 4
        END
    `,
      )
      .all() as { band: string; count: number }[];

    // Source Collections
    const sourceCollections = db
      .prepare(
        `
      SELECT 
        COALESCE(source_collection, 'Unknown/Untagged') as name,
        COUNT(*) as count
      FROM documents
      GROUP BY source_collection
      ORDER BY count DESC
      LIMIT 20
    `,
      )
      .all() as { name: string; count: number }[];

    // Evidence Types
    const evidenceTypes = db
      .prepare(
        `
      SELECT 
        COALESCE(evidence_type, 'unclassified') as type,
        COUNT(*) as count
      FROM documents
      GROUP BY evidence_type
      ORDER BY count DESC
    `,
      )
      .all() as { type: string; count: number }[];

    // Entity Quality
    const entityQuality = db
      .prepare(
        `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN primary_role IS NOT NULL AND primary_role != 'Unknown' THEN 1 ELSE 0 END) as withRoles,
        SUM(CASE WHEN red_flag_description IS NOT NULL AND red_flag_description != '' THEN 1 ELSE 0 END) as withRedFlagDescription
      FROM entities
    `,
      )
      .get() as { total: number; withRoles: number; withRedFlagDescription: number };

    // Orphaned entities (no mentions)
    const orphanedEntities = db
      .prepare(
        `
      SELECT COUNT(*) as c FROM entities e
      WHERE NOT EXISTS (SELECT 1 FROM entity_mentions em WHERE em.entity_id = e.id)
    `,
      )
      .get() as { c: number };

    // Data Completeness
    const docsWithContent = db
      .prepare(
        'SELECT COUNT(*) as c FROM documents WHERE content IS NOT NULL AND length(content) > 100',
      )
      .get() as { c: number };

    const docsWithMetadata = db
      .prepare('SELECT COUNT(*) as c FROM documents WHERE metadata_json IS NOT NULL')
      .get() as { c: number };

    const entitiesWithMentions = db
      .prepare(
        `
      SELECT COUNT(DISTINCT entity_id) as c FROM entity_mentions
    `,
      )
      .get() as { c: number };

    const provenanceCoverage =
      totalDocs.c > 0 ? Math.round((docsWithProvenance.c / totalDocs.c) * 100 * 10) / 10 : 0;

    return {
      totalDocuments: totalDocs.c,
      documentsWithProvenance: docsWithProvenance.c,
      documentsWithoutProvenance: totalDocs.c - docsWithProvenance.c,
      provenanceCoverage,

      ocrQualityDistribution: ocrQuality,
      sourceCollections,
      evidenceTypeDistribution: evidenceTypes,

      entityQuality: {
        total: entityQuality.total,
        withRoles: entityQuality.withRoles,
        withRedFlagDescription: entityQuality.withRedFlagDescription,
        orphaned: orphanedEntities.c,
      },

      dataCompleteness: {
        documentsWithContent: docsWithContent.c,
        documentsWithMetadata: docsWithMetadata.c,
        entitiesWithMentions: entitiesWithMentions.c,
      },

      lastUpdated: new Date().toISOString(),
    };
  },

  /**
   * Add an entry to the audit log
   */
  logAudit: (entry: AuditLogEntry): number => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO audit_log (user_id, action, object_type, object_id, payload_json)
      VALUES (@userId, @action, @objectType, @objectId, @payloadJson)
    `);

    const result = stmt.run({
      userId: entry.userId || 'system',
      action: entry.action,
      objectType: entry.objectType,
      objectId: entry.objectId || null,
      payloadJson: entry.payload ? JSON.stringify(entry.payload) : null,
    });

    return Number(result.lastInsertRowid);
  },

  /**
   * Get audit log entries, optionally filtered
   */
  getAuditLog: (
    filters: { objectType?: string; objectId?: string; action?: string } = {},
    limit: number = 100,
  ): AuditLogEntry[] => {
    const db = getDb();

    const conditions: string[] = [];
    const params: any = { limit };

    if (filters.objectType) {
      conditions.push('object_type = @objectType');
      params.objectType = filters.objectType;
    }
    if (filters.objectId) {
      conditions.push('object_id = @objectId');
      params.objectId = filters.objectId;
    }
    if (filters.action) {
      conditions.push('action = @action');
      params.action = filters.action;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = db
      .prepare(
        `
      SELECT id, timestamp, user_id as userId, action, object_type as objectType, 
             object_id as objectId, payload_json as payloadJson
      FROM audit_log
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT @limit
    `,
      )
      .all(params) as any[];

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      userId: row.userId,
      action: row.action,
      objectType: row.objectType,
      objectId: row.objectId,
      payload: row.payloadJson ? JSON.parse(row.payloadJson) : undefined,
    }));
  },

  /**
   * Get document provenance/lineage information
   */
  getDocumentLineage: (documentId: string | number): any => {
    const db = getDb();

    // Get document with provenance info
    const doc = db
      .prepare(
        `
      SELECT 
        d.id,
        d.file_name,
        d.source_collection,
        d.source_original_url,
        d.credibility_score,
        d.original_file_id,
        d.ocr_engine,
        d.ocr_quality_score,
        d.ocr_processed_at,
        d.created_at,
        orig.file_name as original_file_name,
        orig.file_path as original_file_path
      FROM documents d
      LEFT JOIN documents orig ON d.original_file_id = orig.id
      WHERE d.id = ?
    `,
      )
      .get(documentId) as any;

    if (!doc) return null;

    // Get child documents (e.g., pages extracted from this document)
    const children = db
      .prepare(
        `
      SELECT id, file_name, page_number
      FROM documents
      WHERE parent_id = ?
      ORDER BY page_number ASC
    `,
      )
      .all(documentId) as any[];

    // Get related audit entries
    const auditEntries = db
      .prepare(
        `
      SELECT timestamp, user_id, action, payload_json
      FROM audit_log
      WHERE object_type = 'document' AND object_id = ?
      ORDER BY timestamp DESC
      LIMIT 20
    `,
      )
      .all(String(documentId)) as any[];

    return {
      document: doc,
      originalDocument: doc.original_file_id
        ? {
            id: doc.original_file_id,
            fileName: doc.original_file_name,
            filePath: doc.original_file_path,
          }
        : null,
      childDocuments: children,
      processingInfo: {
        ocrEngine: doc.ocr_engine,
        ocrQualityScore: doc.ocr_quality_score,
        processedAt: doc.ocr_processed_at,
      },
      auditTrail: auditEntries.map((e) => ({
        timestamp: e.timestamp,
        user: e.user_id,
        action: e.action,
        details: e.payload_json ? JSON.parse(e.payload_json) : null,
      })),
    };
  },

  /**
   * Get entity confidence scoring based on evidence quality
   */
  getEntityConfidence: (entityId: string | number): any => {
    const db = getDb();

    const entity = db.prepare('SELECT * FROM entities WHERE id = ?').get(entityId) as any;
    if (!entity) return null;

    // Count mentions by evidence type
    const mentionsByType = db
      .prepare(
        `
      SELECT d.evidence_type, COUNT(*) as count
      FROM entity_mentions em
      JOIN documents d ON em.document_id = d.id
      WHERE em.entity_id = ?
      GROUP BY d.evidence_type
    `,
      )
      .all(entityId) as { evidence_type: string; count: number }[];

    // Count high-quality OCR sources
    const highQualitySources = db
      .prepare(
        `
      SELECT COUNT(DISTINCT d.id) as c
      FROM entity_mentions em
      JOIN documents d ON em.document_id = d.id
      WHERE em.entity_id = ? AND d.ocr_quality_score >= 0.8
    `,
      )
      .get(entityId) as { c: number };

    // Calculate confidence score (0-100)
    const totalMentions = mentionsByType.reduce((sum, m) => sum + m.count, 0);
    const typeWeights: Record<string, number> = {
      legal: 1.0,
      testimony: 0.9,
      flight_log: 0.85,
      financial: 0.8,
      email: 0.7,
      document: 0.6,
      photo: 0.5,
      article: 0.4,
    };

    let weightedScore = 0;
    let totalWeight = 0;
    for (const m of mentionsByType) {
      const weight = typeWeights[m.evidence_type] || 0.5;
      weightedScore += weight * m.count;
      totalWeight += m.count;
    }

    const baseConfidence = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
    const qualityBonus = highQualitySources.c > 10 ? 10 : highQualitySources.c;
    const confidence = Math.min(100, Math.round(baseConfidence + qualityBonus));

    return {
      entityId,
      entityName: entity.full_name,
      confidenceScore: confidence,
      evidenceBreakdown: mentionsByType,
      highQualitySources: highQualitySources.c,
      totalMentions,
      confidenceLevel: confidence >= 80 ? 'High' : confidence >= 50 ? 'Medium' : 'Low',
    };
  },
};
