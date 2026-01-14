import { getDb } from './connection.js';

export const evidenceRepository = {
  // Get evidence summary for a specific entity
  getEntityEvidence: async (entityId: string) => {
    const db = getDb();

    // Get entity details
    const entity = db
      .prepare(
        `
      SELECT id, full_name, primary_role, entity_category, risk_level
      FROM entities
      WHERE id = ?
    `,
      )
      .get(entityId);

    if (!entity) {
      return null;
    }

    // Get evidence linked to this entity
    const evidenceRecords = db
      .prepare(
        `
      SELECT 
        e.id,
        e.evidence_type,
        e.title,
        e.description,
        e.source_path,
        e.cleaned_path,
        e.red_flag_rating,
        e.created_at,
        ee.role,
        ee.confidence,
        ee.context_snippet
      FROM evidence e
      INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
      WHERE ee.entity_id = ?
      ORDER BY e.created_at DESC
      LIMIT 100
    `,
      )
      .all(entityId);

    // Get evidence type breakdown
    const typeBreakdown = db
      .prepare(
        `
      SELECT 
        e.evidence_type,
        COUNT(*) as count
      FROM evidence e
      INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
      WHERE ee.entity_id = ?
      GROUP BY e.evidence_type
      ORDER BY count DESC
    `,
      )
      .all(entityId);

    // Get role breakdown
    const roleBreakdown = db
      .prepare(
        `
      SELECT 
        ee.role,
        COUNT(*) as count
      FROM evidence_entity ee
      WHERE ee.entity_id = ?
      GROUP BY ee.role
      ORDER BY count DESC
    `,
      )
      .all(entityId);

    // Get red flag distribution
    const redFlagDistribution = db
      .prepare(
        `
      SELECT 
        e.red_flag_rating,
        COUNT(*) as count
      FROM evidence e
      INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
      WHERE ee.entity_id = ? AND e.red_flag_rating IS NOT NULL
      GROUP BY e.red_flag_rating
      ORDER BY e.red_flag_rating DESC
    `,
      )
      .all(entityId);

    // Get related entities (entities that appear in same evidence)
    const relatedEntities = db
      .prepare(
        `
      SELECT 
        ent.id,
        ent.full_name,
        ent.entity_category,
        COUNT(DISTINCT ee1.evidence_id) as shared_evidence_count
      FROM evidence_entity ee1
      INNER JOIN evidence_entity ee2 ON ee1.evidence_id = ee2.evidence_id
      INNER JOIN entities ent ON ent.id = ee2.entity_id
      WHERE ee1.entity_id = ? AND ee2.entity_id != ?
      GROUP BY ent.id, ent.full_name, ent.entity_category
      ORDER BY shared_evidence_count DESC
      LIMIT 20
    `,
      )
      .all(entityId, entityId);

    return {
      entity,
      evidence: evidenceRecords,
      stats: {
        totalEvidence: evidenceRecords.length,
        typeBreakdown,
        roleBreakdown,
        redFlagDistribution,
        relatedEntities,
        highRiskCount: evidenceRecords.filter((e: any) => (e.red_flag_rating || 0) >= 4).length,
        averageConfidence:
          evidenceRecords.reduce((sum: number, e: any) => sum + (e.confidence || 0), 0) /
            evidenceRecords.length || 0,
      },
    };
  },
  addSnippetToInvestigation: async (
    investigationId: string,
    documentId: string,
    snippetText: string,
    notes: string,
    relevance: string,
  ) => {
    const db = getDb();
    const doc = db
      .prepare(
        `
      SELECT id, file_path, file_name, evidence_type, red_flag_rating
      FROM documents
      WHERE id = ?
    `,
      )
      .get(documentId) as any;
    if (!doc) {
      throw new Error('Document not found');
    }
    const sourcePath = doc.file_path || `doc:${doc.id}`;
    const ins = db
      .prepare(
        `
      INSERT INTO evidence (
        evidence_type,
        source_path,
        original_filename,
        title,
        description,
        extracted_text,
        created_at,
        ingested_at,
        red_flag_rating,
        metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?)
    `,
      )
      .run(
        doc.evidence_type || 'investigative_report',
        sourcePath,
        doc.file_name || `Document ${doc.id}`,
        `Snippet from ${doc.file_name || 'Document'} (${doc.id})`,
        notes || '',
        snippetText || '',
        doc.red_flag_rating || 0,
        JSON.stringify({ document_id: doc.id }),
      );
    const evidenceId = Number(ins.lastInsertRowid);
    const link = db
      .prepare(
        `
      INSERT OR IGNORE INTO investigation_evidence (
        investigation_id,
        evidence_id,
        notes,
        relevance,
        added_at
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `,
      )
      .run(investigationId, evidenceId, notes || '', relevance || 'medium');
    const evidence = db
      .prepare(`SELECT id, title, description, evidence_type, source_path FROM evidence WHERE id = ?`)
      .get(evidenceId);
    return {
      investigationEvidenceId: link.lastInsertRowid,
      evidence,
    };
  },

  // Add evidence to an investigation session
  addEvidenceToInvestigation: async (
    investigationId: string,
    evidenceId: string,
    notes: string,
    relevance: string,
  ) => {
    const db = getDb();

    // Get evidence details
    const evidence = db
      .prepare(
        `
      SELECT 
        id,
        evidence_type,
        title,
        description,
        source_path,
        red_flag_rating,
        created_at
      FROM evidence
      WHERE id = ?
    `,
      )
      .get(evidenceId);

    if (!evidence) {
      throw new Error('Evidence not found');
    }

    // Get entities linked to this evidence
    const entities = db
      .prepare(
        `
      SELECT 
        ent.id,
        ent.full_name,
        ent.entity_category,
        ee.role
      FROM evidence_entity ee
      INNER JOIN entities ent ON ent.id = ee.entity_id
      WHERE ee.evidence_id = ?
    `,
      )
      .all(evidenceId);

    // Insert into investigation_evidence table
    const result = db
      .prepare(
        `
      INSERT INTO investigation_evidence (
        investigation_id, 
        evidence_id, 
        notes, 
        relevance,
        added_at
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `,
      )
      .run(investigationId, evidenceId, notes || '', relevance || 'medium');

    return {
      investigationEvidenceId: result.lastInsertRowid,
      evidence,
      entities,
    };
  },
  addMediaToInvestigation: async (
    investigationId: string,
    mediaItemId: string,
    notes: string,
    relevance: string,
  ) => {
    const db = getDb();
    const media = db
      .prepare(
        `
      SELECT 
        id,
        file_path,
        file_type,
        title,
        description,
        red_flag_rating,
        metadata_json,
        created_at
      FROM media_items
      WHERE id = ?
    `,
      )
      .get(mediaItemId) as any;
    if (!media) {
      throw new Error('Media not found');
    }
    const sourcePath = media.file_path;
    const existing = db.prepare(`SELECT id FROM evidence WHERE source_path = ?`).get(sourcePath) as any;
    let evidenceId: number;
    if (existing) {
      evidenceId = existing.id;
    } else {
      let metadata: any = {};
      try {
        metadata = media.metadata_json ? JSON.parse(media.metadata_json) : {};
      } catch {
        metadata = {};
      }
      const transcriptText =
        metadata.external_transcript_text ||
        (Array.isArray(metadata.transcript)
          ? metadata.transcript.map((s: any) => s.text).join('\n')
          : null);
      const evidenceType =
        media.file_type === 'audio'
          ? 'audio'
          : media.file_type === 'video'
          ? 'video'
          : 'media_scan';
      const tags = db
        .prepare(
          `
        SELECT t.name 
        FROM media_item_tags mt 
        INNER JOIN media_tags t ON t.id = mt.tag_id 
        WHERE mt.media_item_id = ?
      `,
        )
        .all(mediaItemId) as any[];
      const evidenceTags = JSON.stringify(tags.map((t) => t.name));
      const ins = db
        .prepare(
          `
        INSERT INTO evidence (
          evidence_type,
          source_path,
          original_filename,
          title,
          description,
          extracted_text,
          created_at,
          ingested_at,
          red_flag_rating,
          evidence_tags,
          metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, ?)
      `,
        )
        .run(
          evidenceType,
          sourcePath,
          sourcePath ? sourcePath.split('/').pop() : `media_${media.id}`,
          media.title || `Media ${media.id}`,
          media.description || '',
          transcriptText || '',
          media.red_flag_rating || 0,
          evidenceTags,
          JSON.stringify({
            media_item_id: media.id,
            file_type: media.file_type,
            duration: metadata.duration,
            chapters: metadata.chapters,
          }),
        );
      evidenceId = Number(ins.lastInsertRowid);
      const people = db
        .prepare(
          `
        SELECT entity_id, role 
        FROM media_item_people 
        WHERE media_item_id = ?
      `,
        )
        .all(mediaItemId) as any[];
      for (const p of people) {
        db
          .prepare(
            `
          INSERT OR IGNORE INTO evidence_entity (
            evidence_id,
            entity_id,
            role,
            confidence,
            context_snippet
          ) VALUES (?, ?, ?, ?, ?)
        `,
          )
          .run(evidenceId, p.entity_id, p.role || 'participant', 0.8, '');
      }
    }
    const res = db
      .prepare(
        `
      INSERT OR IGNORE INTO investigation_evidence (
        investigation_id, 
        evidence_id, 
        notes, 
        relevance,
        added_at
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `,
      )
      .run(investigationId, evidenceId, notes || '', relevance || 'medium');
    const evidence = db
      .prepare(
        `
      SELECT id, evidence_type, title, description, source_path, red_flag_rating, created_at
      FROM evidence
      WHERE id = ?
    `,
      )
      .get(evidenceId);
    return {
      investigationEvidenceId: res.lastInsertRowid,
      evidence,
    };
  },

  // Get evidence summary for an investigation
  getInvestigationEvidenceSummary: async (investigationId: string) => {
    const db = getDb();

    // Get all evidence for this investigation
    const evidence = db
      .prepare(
        `
      SELECT 
        e.id,
        e.evidence_type,
        e.title,
        e.description,
        e.red_flag_rating,
        e.created_at,
        ie.notes,
        ie.relevance,
        ie.added_at
      FROM investigation_evidence ie
      INNER JOIN evidence e ON e.id = ie.evidence_id
      WHERE ie.investigation_id = ?
      ORDER BY ie.added_at DESC
    `,
      )
      .all(investigationId);

    // Get entity coverage
    const entityCoverage = db
      .prepare(
        `
      SELECT 
        ent.id,
        ent.full_name,
        ent.entity_category,
        COUNT(DISTINCT ee.evidence_id) as evidence_count
      FROM investigation_evidence ie
      INNER JOIN evidence_entity ee ON ee.evidence_id = ie.evidence_id
      INNER JOIN entities ent ON ent.id = ee.entity_id
      WHERE ie.investigation_id = ?
      GROUP BY ent.id, ent.full_name, ent.entity_category
      ORDER BY evidence_count DESC
      LIMIT 50
    `,
      )
      .all(investigationId);

    return {
      totalEvidence: evidence.length,
      evidence,
      entityCoverage,
      typeBreakdown: evidence.reduce((acc: any, e: any) => {
        acc[e.evidence_type] = (acc[e.evidence_type] || 0) + 1;
        return acc;
      }, {}),
      relevanceBreakdown: evidence.reduce((acc: any, e: any) => {
        acc[e.relevance || 'medium'] = (acc[e.relevance || 'medium'] || 0) + 1;
        return acc;
      }, {}),
    };
  },

  // Remove evidence from an investigation
  removeEvidenceFromInvestigation: async (investigationEvidenceId: string) => {
    const db = getDb();

    const result = db
      .prepare(
        `
      DELETE FROM investigation_evidence
      WHERE id = ?
    `,
      )
      .run(investigationEvidenceId);

    return result.changes > 0;
  },

  // Search evidence with filtering and pagination
  searchEvidence: async (params: {
    q?: string;
    type?: string;
    entityId?: string;
    dateFrom?: string;
    dateTo?: string;
    redFlagMin?: string;
    tags?: string;
    page?: string;
    limit?: string;
  }) => {
    const db = getDb();

    const {
      q = '',
      type,
      entityId,
      dateFrom,
      dateTo,
      redFlagMin,
      tags,
      page = '1',
      limit = '20',
    } = params;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let query = `
      SELECT DISTINCT
        e.id,
        e.title,
        e.evidence_type as evidenceType,
        e.red_flag_rating as redFlagRating,
        e.created_at as createdAt,
        e.evidence_tags as evidenceTags,
        SUBSTR(e.extracted_text, 1, 200) as snippet
      FROM evidence e
    `;

    const conditions: string[] = [];
    const queryParams: any[] = [];

    // Full-text search
    if (q && q.toString().trim().length > 0) {
      query += ` INNER JOIN evidence_fts ON evidence_fts.rowid = e.id`;
      conditions.push(`evidence_fts MATCH ?`);
      queryParams.push(q.toString().trim());
    }

    // Entity filter
    if (entityId) {
      query += ` INNER JOIN evidence_entity ee ON ee.evidence_id = e.id`;
      conditions.push(`ee.entity_id = ?`);
      queryParams.push(parseInt(entityId, 10));
    }

    // Type filter
    if (type) {
      conditions.push(`e.evidence_type = ?`);
      queryParams.push(type);
    }

    // Date range filter
    if (dateFrom) {
      conditions.push(`e.created_at >= ?`);
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      conditions.push(`e.created_at <= ?`);
      queryParams.push(dateTo);
    }

    // Red flag minimum
    if (redFlagMin) {
      conditions.push(`e.red_flag_rating >= ?`);
      queryParams.push(parseInt(redFlagMin, 10));
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',');
      for (const tag of tagArray) {
        conditions.push(`e.evidence_tags LIKE ?`);
        queryParams.push(`%${tag.trim()}%`);
      }
    }

    // Add conditions to query
    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    // Count total results
    const countQuery = query.replace(
      /SELECT DISTINCT.*FROM evidence e/,
      'SELECT COUNT(DISTINCT e.id) as total FROM evidence e',
    );
    const totalResult = db.prepare(countQuery).get(...queryParams) as { total: number };
    const total = totalResult.total;

    // Add pagination
    query += ` ORDER BY e.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limitNum, offset);

    // Execute query
    const results = db.prepare(query).all(...queryParams) as any[];

    // Enrich with entities
    for (const result of results) {
      // Get linked entities
      const entities = db
        .prepare(
          `
        SELECT 
          ent.id,
          ent.full_name as name,
          ent.primary_role as category,
          ee.role
        FROM evidence_entity ee
        INNER JOIN entities ent ON ent.id = ee.entity_id
        WHERE ee.evidence_id = ?
        LIMIT 10
      `,
        )
        .all(result.id);

      result.entities = entities;
      result.tags = result.evidenceTags ? JSON.parse(result.evidenceTags) : [];
      delete result.evidenceTags;
    }

    const totalPages = Math.ceil(total / limitNum);

    return {
      results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  },

  // Get single evidence record with full details
  getEvidenceById: async (id: string) => {
    const db = getDb();

    const evidence = db
      .prepare(
        `
      SELECT 
        id,
        evidence_type as evidenceType,
        title,
        description,
        original_filename as originalFilename,
        source_path as sourcePath,
        extracted_text as extractedText,
        created_at as createdAt,
        modified_at as modifiedAt,
        red_flag_rating as redFlagRating,
        evidence_tags as evidenceTags,
        metadata_json as metadataJson,
        word_count as wordCount,
        file_size as fileSize
      FROM evidence
      WHERE id = ?
    `,
      )
      .get(id) as any;

    if (!evidence) {
      return null;
    }

    // Parse JSON fields
    evidence.tags = evidence.evidenceTags ? JSON.parse(evidence.evidenceTags) : [];
    evidence.metadata = evidence.metadataJson ? JSON.parse(evidence.metadataJson) : {};
    delete evidence.evidenceTags;
    delete evidence.metadataJson;

    // Get linked entities
    const entities = db
      .prepare(
        `
      SELECT 
        ent.id,
        ent.full_name as name,
        ent.primary_role as category,
        ee.role,
        ee.confidence,
        ee.context_snippet as contextSnippet
      FROM evidence_entity ee
      INNER JOIN entities ent ON ent.id = ee.entity_id
      WHERE ee.evidence_id = ?
    `,
      )
      .all(id);

    evidence.entities = entities;

    return evidence;
  },

  // List all evidence types with counts
  getEvidenceTypes: async () => {
    const db = getDb();

    const types = db
      .prepare(
        `
      SELECT 
        evidence_type as type,
        COUNT(*) as count
      FROM evidence
      GROUP BY evidence_type
      ORDER BY count DESC
    `,
      )
      .all();

    // Add descriptions
    const typeDescriptions: Record<string, string> = {
      court_deposition: 'Legal depositions and sworn testimony',
      court_filing: 'Indictments, motions, court exhibits',
      contact_directory: 'Address books, contact lists',
      correspondence: 'Emails, messages',
      financial_record: 'Flight logs, cash ledgers, expense records',
      investigative_report: 'House Oversight Committee productions',
      testimony: 'Victim testimony and witness statements',
      timeline_data: 'Chronological event records',
      media_scan: 'Image scans of documents',
      evidence_list: 'Catalogued evidence inventories',
    };

    const enrichedTypes = types.map((t: any) => ({
      ...t,
      description: typeDescriptions[t.type] || '',
    }));

    return enrichedTypes;
  },

  // Get all evidence associated with an entity
  getEntityEvidenceList: async (
    entityId: string,
    params: { page?: string; limit?: string; type?: string },
  ) => {
    const db = getDb();

    const { page = '1', limit = '20', type } = params;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT DISTINCT
        e.id,
        e.title,
        e.evidence_type as evidenceType,
        e.red_flag_rating as redFlagRating,
        e.created_at as createdAt,
        SUBSTR(e.extracted_text, 1, 200) as snippet,
        ee.role
      FROM evidence e
      INNER JOIN evidence_entity ee ON ee.evidence_id = e.id
      WHERE ee.entity_id = ?
    `;

    const queryParams: any[] = [parseInt(entityId, 10)];

    if (type) {
      query += ` AND e.evidence_type = ?`;
      queryParams.push(type);
    }

    // Count total
    const countQuery = query.replace(
      /SELECT DISTINCT.*FROM evidence e/,
      'SELECT COUNT(DISTINCT e.id) as total FROM evidence e',
    );
    const totalResult = db.prepare(countQuery).get(...queryParams) as { total: number };
    const total = totalResult.total;

    // Add pagination
    query += ` ORDER BY e.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limitNum, offset);

    const results = db.prepare(query).all(...queryParams);

    const totalPages = Math.ceil(total / limitNum);

    return {
      results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  },
};
