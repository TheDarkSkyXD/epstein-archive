import { getDb } from './connection.js';

export interface Investigation {
  id: number;
  uuid: string;
  title: string;
  description?: string;
  owner_id: string;
  collaborator_ids: string[];
  status: 'open' | 'in_review' | 'closed' | 'archived';
  scope?: string;
  created_at: string;
  updated_at: string;
}

type InvestigationEvidenceTargetType = 'document' | 'entity' | 'media' | null;

function inferEvidenceTarget(row: any): {
  targetType: InvestigationEvidenceTargetType;
  targetId: number | null;
} {
  const sourcePath = typeof row.source_path === 'string' ? row.source_path : '';
  const metadata = (() => {
    try {
      return row.metadata_json ? JSON.parse(row.metadata_json) : {};
    } catch (_error) {
      return {};
    }
  })();

  const sourceMatch = sourcePath.match(/^(entity|document|doc|media|audio|video):(\d+)$/i);
  if (sourceMatch) {
    const rawType = sourceMatch[1].toLowerCase();
    const id = Number(sourceMatch[2]);
    if (rawType === 'entity')
      return { targetType: 'entity', targetId: Number.isFinite(id) ? id : null };
    if (rawType === 'document' || rawType === 'doc')
      return { targetType: 'document', targetId: Number.isFinite(id) ? id : null };
    return { targetType: 'media', targetId: Number.isFinite(id) ? id : null };
  }

  const metadataDocumentId = Number(
    metadata.document_id || metadata.doc_id || row.document_id || 0,
  );
  if (metadataDocumentId > 0) return { targetType: 'document', targetId: metadataDocumentId };

  const metadataEntityId = Number(metadata.entity_id || 0);
  if (metadataEntityId > 0) return { targetType: 'entity', targetId: metadataEntityId };

  const mediaItemId = Number(metadata.media_item_id || row.media_item_id || 0);
  if (mediaItemId > 0) return { targetType: 'media', targetId: mediaItemId };

  if (typeof sourcePath === 'string' && sourcePath.trim().length > 0) {
    if (sourcePath.includes('/media/'))
      return { targetType: 'media', targetId: mediaItemId || null };
    if (sourcePath.includes('/documents/') || sourcePath.includes('/data/')) {
      return { targetType: 'document', targetId: metadataDocumentId || null };
    }
  }

  return { targetType: null, targetId: null };
}

export const investigationsRepository = {
  getInvestigations: async (
    filters: {
      status?: string;
      ownerId?: string;
      page?: number;
      limit?: number;
    } = {},
  ) => {
    const db = getDb();
    const { status, ownerId, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any = {};

    if (status) {
      where.push('status = @status');
      params.status = status;
    }
    if (ownerId) {
      where.push('owner_id = @ownerId');
      params.ownerId = ownerId;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT id, uuid, title, description, owner_id, collaborator_ids, 
             status, scope, created_at, updated_at
      FROM investigations
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT @limit OFFSET @offset
    `;

    const countQuery = `SELECT COUNT(*) as total FROM investigations ${whereClause}`;

    const investigations = (await db.prepare(query).all({ ...params, limit, offset })) as any[];
    const totalRow = (await db.prepare(countQuery).get(params)) as { total: number };
    const total = totalRow?.total || 0;

    return {
      data: investigations.map((inv) => mapInvestigation(inv)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  createInvestigation: async (data: {
    title: string;
    description?: string;
    ownerId: string;
    scope?: string;
    collaboratorIds?: string[];
  }) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO investigations (title, description, owner_id, scope, collaborator_ids)
      VALUES (@title, @description, @ownerId, @scope, @collaboratorIds)
      RETURNING id
    `);

    const result = (await stmt.run({
      title: data.title,
      description: data.description || null,
      ownerId: data.ownerId,
      scope: data.scope || null,
      collaboratorIds: JSON.stringify(data.collaboratorIds || []),
    })) as any;

    return investigationsRepository.getInvestigationById(result.lastInsertRowid as number);
  },

  getInvestigationById: async (id: number | string) => {
    const db = getDb();
    // Support uuid or id? Logic used ID mostly.
    const inv = (await db
      .prepare(
        `
      SELECT id, uuid, title, description, owner_id, collaborator_ids, 
             status, scope, created_at, updated_at
      FROM investigations WHERE id = ?
    `,
      )
      .get(id)) as any;

    if (!inv) return null;
    return mapInvestigation(inv);
  },

  getInvestigationByUuid: async (uuid: string) => {
    const db = getDb();
    const inv = (await db
      .prepare(
        `
      SELECT id, uuid, title, description, owner_id, collaborator_ids, 
             status, scope, created_at, updated_at
      FROM investigations WHERE uuid = ?
    `,
      )
      .get(uuid)) as any;

    if (!inv) return null;
    return mapInvestigation(inv);
  },

  deleteInvestigation: async (id: number) => {
    const db = getDb();
    const result = await db.prepare('DELETE FROM investigations WHERE id = ?').run(id);
    return result.changes > 0;
  },

  // --- Sub-resources ---

  getEvidence: async (investigationId: number, options?: { limit?: number; offset?: number }) => {
    const db = getDb();
    const limit = options?.limit;
    const offset = options?.offset || 0;
    const hasPagination = Number.isFinite(limit) && (limit || 0) > 0;

    const baseQuery = `
      SELECT 
        e.id, 
        e.evidence_type as type, 
        e.title, 
        e.description, 
        e.source_path, 
        e.metadata_json,
        ie.id as investigation_evidence_id,
        ie.relevance, 
        ie.added_at as extracted_at, 
        ie.added_by as extracted_by
      FROM investigation_evidence ie
      JOIN evidence e ON ie.evidence_id = e.id
      WHERE ie.investigation_id = ? 
      ORDER BY ie.added_at DESC
    `;

    if (hasPagination) {
      const rows = (await db
        .prepare(
          `
        ${baseQuery}
        LIMIT ? OFFSET ?
      `,
        )
        .all(investigationId, limit, offset)) as any[];
      const totalRow = (await db
        .prepare(`SELECT COUNT(*) as total FROM investigation_evidence WHERE investigation_id = ?`)
        .get(investigationId)) as { total: number };
      return {
        data: rows,
        total: totalRow?.total || 0,
        limit,
        offset,
      };
    }

    return (await db.prepare(baseQuery).all(investigationId)) as any[];
  },

  addEvidence: async (investigationId: number, data: any) => {
    const db = getDb();

    // Handle frontend format where evidence is nested
    const evidenceData = data.evidence || data;
    const relevance = data.relevance || evidenceData.relevance || 'high';

    // 1. Create or Find Evidence Record in `evidence` table
    const title = evidenceData.title || evidenceData.file_name || 'Untitled Evidence';
    const description = evidenceData.description || '';
    const sourcePath =
      evidenceData.source_path ||
      evidenceData.source ||
      evidenceData.path ||
      `manual:${Date.now()}`;
    const type = evidenceData.type || 'document'; // Default type

    // Check if evidence already exists by source_path
    let evidenceId;
    const existingEvidence = (await db
      .prepare('SELECT id FROM evidence WHERE source_path = ?')
      .get(sourcePath)) as any;

    if (existingEvidence) {
      evidenceId = (existingEvidence as any).id;
    } else {
      const insertEvidence = db.prepare(`
            INSERT INTO evidence (
                title, 
                description, 
                evidence_type, 
                source_path, 
                original_filename,
                created_at,
                red_flag_rating
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
            RETURNING id
        `);

      const result = (await insertEvidence.run(
        title,
        description,
        type,
        sourcePath,
        title, // original_filename fallback
        evidenceData.red_flag_rating || 0,
      )) as any;
      evidenceId = result.lastInsertRowid;
    }

    // 2. Link to Investigation in `investigation_evidence`
    const stmt = db.prepare(`
      INSERT INTO investigation_evidence (
        investigation_id, evidence_id, notes, relevance, added_at, added_by
      ) VALUES (
        @investigation_id, @evidence_id, @notes, @relevance, CURRENT_TIMESTAMP, @added_by
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `);

    const result = (await stmt.run({
      investigation_id: investigationId,
      evidence_id: evidenceId,
      notes: evidenceData.notes || '',
      relevance: relevance,
      added_by: 'user',
    })) as any;

    // Log the activity
    try {
      investigationsRepository.logActivity({
        investigationId,
        actionType: 'evidence_added',
        targetType: type,
        targetId: String(evidenceId),
        targetTitle: title,
        metadata: { relevance, sourcePath },
      });
    } catch (e) {
      console.warn('Failed to log activity:', e);
    }

    return result?.lastInsertRowid || evidenceId;
  },

  getTimelineEvents: async (investigationId: number) => {
    const db = getDb();
    return (await db
      .prepare(
        'SELECT * FROM investigation_timeline_events WHERE investigation_id = ? ORDER BY start_date ASC',
      )
      .all(investigationId)) as any[];
  },

  addTimelineEvent: async (investigationId: number, data: any) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO investigation_timeline_events (
        investigation_id, title, description, type, start_date, end_date
      ) VALUES (
        @investigation_id, @title, @description, @type, @start_date, @end_date
      )
      RETURNING id
    `);
    const result = (await stmt.run({
      investigation_id: investigationId,
      title: data.title || '',
      description: data.description || '',
      type: data.type || 'document',
      start_date: data.startDate || '',
      end_date: data.endDate || null,
    })) as any;
    return result.lastInsertRowid;
  },

  updateTimelineEvent: async (eventId: number, data: any) => {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE investigation_timeline_events 
      SET title = COALESCE(@title, title), 
          description = COALESCE(@description, description), 
          type = COALESCE(@type, type), 
          start_date = COALESCE(@startDate, start_date), 
          end_date = COALESCE(@endDate, end_date),
          confidence = COALESCE(@confidence, confidence),
          entities_json = COALESCE(@entities, entities_json),
          documents_json = COALESCE(@documents, documents_json)
      WHERE id = @id
    `);

    const result = (await stmt.run({
      id: eventId,
      title: data.title,
      description: data.description,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      confidence: data.confidence,
      entities: data.entities ? JSON.stringify(data.entities) : null,
      documents: data.documents ? JSON.stringify(data.documents) : null,
    })) as any;
    return result.changes > 0;
  },

  deleteTimelineEvent: async (eventId: number) => {
    const db = getDb();
    const result = await db
      .prepare('DELETE FROM investigation_timeline_events WHERE id = ?')
      .run(eventId);
    return result.changes > 0;
  },

  getChainOfCustody: async (evidenceId: number) => {
    const db = getDb();
    return (await db
      .prepare(
        'SELECT id, evidence_id, date, actor, action, notes, signature FROM chain_of_custody WHERE evidence_id = ? ORDER BY date ASC',
      )
      .all(evidenceId)) as any[];
  },

  addChainOfCustody: async (data: any) => {
    const db = getDb();
    const stmt = db.prepare(
      'INSERT INTO chain_of_custody (evidence_id, date, actor, action, notes, signature) VALUES (?,?,?,?,?,?)',
    );
    const result = (await stmt.run(
      data.evidenceId,
      new Date().toISOString(),
      data.actor || 'system',
      data.action || 'analyzed',
      data.notes || '',
      data.signature || null,
    )) as any;
    return result.lastInsertRowid;
  },

  updateInvestigation: async (
    id: number,
    updates: {
      title?: string;
      description?: string;
      scope?: string;
      status?: 'open' | 'in_review' | 'closed' | 'archived';
      collaboratorIds?: string[];
    },
  ) => {
    const db = getDb();
    const fields: string[] = [];
    const params: any = { id };
    if (updates.title !== undefined) {
      fields.push('title = @title');
      params.title = updates.title;
    }
    if (updates.description !== undefined) {
      fields.push('description = @description');
      params.description = updates.description;
    }
    if (updates.scope !== undefined) {
      fields.push('scope = @scope');
      params.scope = updates.scope;
    }
    if (updates.status !== undefined) {
      fields.push('status = @status');
      params.status = updates.status;
    }
    if (updates.collaboratorIds !== undefined) {
      fields.push('collaborator_ids = @collaboratorIds');
      params.collaboratorIds = JSON.stringify(updates.collaboratorIds);
    }

    if (fields.length === 0) return investigationsRepository.getInvestigationById(id);

    await db
      .prepare(
        `
      UPDATE investigations 
      SET ${fields.join(', ')}
      WHERE id = @id
    `,
      )
      .run(params);

    return investigationsRepository.getInvestigationById(id);
  },

  getNotebook: async (investigationId: number) => {
    const db = getDb();
    const row = (await db
      .prepare(
        `
      SELECT investigation_id as "investigationId", order_json as "orderJson", annotations_json as "annotationsJson", updated_at as "updatedAt"
      FROM investigation_notebook
      WHERE investigation_id = ?
    `,
      )
      .get(investigationId)) as any;
    if (!row) {
      return { investigationId, order: [], annotations: [], updatedAt: null };
    }
    let order = [];
    let annotations = [];
    try {
      order = row.orderJson ? JSON.parse(row.orderJson) : [];
    } catch (_e) {
      order = [];
    }
    try {
      annotations = row.annotationsJson ? JSON.parse(row.annotationsJson) : [];
    } catch (_e) {
      annotations = [];
    }
    return { investigationId, order, annotations, updatedAt: row.updatedAt };
  },

  saveNotebook: async (
    investigationId: number,
    payload: { order?: number[]; annotations?: any[] },
  ) => {
    const db = getDb();
    const existing = (await db
      .prepare(`SELECT investigation_id FROM investigation_notebook WHERE investigation_id = ?`)
      .get(investigationId)) as any;
    const orderJson = JSON.stringify(payload.order || []);
    const annotationsJson = JSON.stringify(payload.annotations || []);
    if (existing) {
      await db
        .prepare(
          `
        UPDATE investigation_notebook
        SET order_json = ?, annotations_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE investigation_id = ?
      `,
        )
        .run(orderJson, annotationsJson, investigationId);
    } else {
      await db
        .prepare(
          `
        INSERT INTO investigation_notebook (investigation_id, order_json, annotations_json, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `,
        )
        .run(investigationId, orderJson, annotationsJson);
    }
    return true;
  },

  // --- Hypotheses ---

  getHypotheses: async (investigationId: number) => {
    const db = getDb();
    const hypotheses = (await db
      .prepare(`SELECT * FROM hypotheses WHERE investigation_id = ? ORDER BY created_at DESC`)
      .all(investigationId)) as any[];

    // Include evidence for each hypothesis
    for (const hyp of hypotheses) {
      hyp.evidenceLinks = (await db
        .prepare(
          `
        SELECT he.*, e.title as evidence_title, e.evidence_type 
        FROM hypothesis_evidence he
        JOIN evidence e ON he.evidence_id = e.id
        WHERE he.hypothesis_id = ?
      `,
        )
        .all(hyp.id)) as any[];
    }
    return hypotheses;
  },

  addHypothesis: async (investigationId: number, data: { title: string; description?: string }) => {
    const db = getDb();
    const result = (await db
      .prepare(
        `INSERT INTO hypotheses (investigation_id, title, description) VALUES (@invId, @title, @desc) RETURNING id`,
      )
      .run({
        invId: investigationId,
        title: data.title,
        desc: data.description || '',
      })) as any;
    return result.lastInsertRowid;
  },

  updateHypothesis: async (
    id: number,
    data: { title?: string; description?: string; status?: string; confidence?: number },
  ) => {
    const db = getDb();
    const sets: string[] = [];
    const params: any = { id };

    if (data.title !== undefined) {
      sets.push('title = @title');
      params.title = data.title;
    }
    if (data.description !== undefined) {
      sets.push('description = @description');
      params.description = data.description;
    }
    if (data.status !== undefined) {
      sets.push('status = @status');
      params.status = data.status;
    }
    if (data.confidence !== undefined) {
      sets.push('confidence = @confidence');
      params.confidence = data.confidence;
    }

    sets.push("updated_at = datetime('now')");

    if (sets.length === 1) return true; // only updated_at

    const result = await db
      .prepare(`UPDATE hypotheses SET ${sets.join(', ')} WHERE id = @id`)
      .run(params);
    return result.changes > 0;
  },

  deleteHypothesis: async (id: number) => {
    const db = getDb();
    const result = await db.prepare('DELETE FROM hypotheses WHERE id = ?').run(id);
    return result.changes > 0;
  },

  addEvidenceToHypothesis: async (
    hypothesisId: number,
    evidenceId: number,
    relevance = 'supporting',
  ) => {
    const db = getDb();
    // Check if exists
    const exists = (await db
      .prepare('SELECT id FROM hypothesis_evidence WHERE hypothesis_id = ? AND evidence_id = ?')
      .get(hypothesisId, evidenceId)) as any;

    if (exists) return (exists as any).id;

    const result = await db
      .prepare(
        `
      INSERT INTO hypothesis_evidence (hypothesis_id, evidence_id, relevance)
      VALUES (?, ?, ?)
    `,
      )
      .run(hypothesisId, evidenceId, relevance);

    return result.lastInsertRowid;
  },

  removeEvidenceFromHypothesis: async (hypothesisId: number, evidenceId: number) => {
    const db = getDb();
    const result = await db
      .prepare('DELETE FROM hypothesis_evidence WHERE hypothesis_id = ? AND evidence_id = ?')
      .run(hypothesisId, evidenceId);
    return result.changes > 0;
  },

  // --- Activity Logging ---

  logActivity: async (data: {
    investigationId: number;
    userId?: string;
    userName?: string;
    actionType: string;
    targetType?: string;
    targetId?: string;
    targetTitle?: string;
    metadata?: any;
  }) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO investigation_activity (
        investigation_id, user_id, user_name, action_type, 
        target_type, target_id, target_title, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `);
    const result = (await stmt.run(
      data.investigationId,
      data.userId || 'anonymous',
      data.userName || 'Anonymous User',
      data.actionType,
      data.targetType || null,
      data.targetId || null,
      data.targetTitle || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    )) as any;
    return result.lastInsertRowid;
  },

  getActivity: async (investigationId: number, limit = 50) => {
    const db = getDb();
    return (await db
      .prepare(
        `
      SELECT id, investigation_id, user_id, user_name, action_type,
             target_type, target_id, target_title, metadata_json, created_at
      FROM investigation_activity
      WHERE investigation_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
      )
      .all(investigationId, limit)) as any[];
  },

  // Enhanced evidence retrieval with type breakdown
  getEvidenceByType: async (investigationId: number) => {
    const db = getDb();
    const evidence = (await db
      .prepare(
        `
      SELECT 
        e.id, 
        e.evidence_type as type, 
        e.title, 
        e.description, 
        e.source_path,
        e.metadata_json,
        ie.id as investigation_evidence_id,
        d.id as document_id,
        m.id as media_item_id,
        e.red_flag_rating,
        ie.relevance, 
        ie.added_at, 
        ie.added_by,
        ie.notes
      FROM investigation_evidence ie
      JOIN evidence e ON ie.evidence_id = e.id
      LEFT JOIN documents d ON d.file_path = e.source_path
      LEFT JOIN media_items m ON m.file_path = e.source_path
      WHERE ie.investigation_id = ? 
      ORDER BY ie.added_at DESC
    `,
      )
      .all(investigationId)) as any[];

    const enrichedEvidence = evidence.map((row) => {
      const { targetType, targetId } = inferEvidenceTarget(row);
      const metadata = (() => {
        try {
          return row.metadata_json ? JSON.parse(row.metadata_json) : {};
        } catch (_error) {
          return {};
        }
      })();
      return {
        ...row,
        target_type: targetType,
        target_id: targetId,
        ingest_run_id: metadata.ingest_run_id || metadata.ingestRunId || null,
        evidence_ladder: metadata.evidence_ladder || metadata.evidenceLadder || null,
        pipeline_version: metadata.pipeline_version || metadata.pipelineVersion || null,
        evidence_pack: metadata.evidence_pack || metadata.evidencePack || null,
        was_agentic: metadata.was_agentic || metadata.wasAgentic || false,
      };
    });

    // Group by type
    const byType: Record<string, any[]> = {};
    for (const e of enrichedEvidence) {
      const type = e.type || 'other';
      if (!byType[type]) byType[type] = [];
      byType[type].push(e);
    }

    return {
      all: enrichedEvidence,
      byType,
      counts: Object.fromEntries(
        Object.entries(byType).map(([type, items]) => [type, items.length]),
      ),
      total: enrichedEvidence.length,
    };
  },

  getBoardSnapshot: async (
    investigationId: number,
    options: { evidenceLimit?: number; hypothesisLimit?: number } = {},
  ) => {
    const db = getDb();
    const evidenceLimit = Math.max(1, Math.min(200, options.evidenceLimit || 80));
    const hypothesisLimit = Math.max(1, Math.min(100, options.hypothesisLimit || 20));

    const evidencePreview = (await db
      .prepare(
        `
      SELECT
        e.id,
        e.evidence_type as type,
        e.title,
        e.description,
        ie.relevance,
        ie.added_at as extracted_at,
        ie.added_by as extracted_by
      FROM investigation_evidence ie
      JOIN evidence e ON e.id = ie.evidence_id
      WHERE ie.investigation_id = ?
      ORDER BY ie.added_at DESC
      LIMIT ?
    `,
      )
      .all(investigationId, evidenceLimit)) as any[];

    const hypothesesPreview = (await db
      .prepare(
        `
      SELECT id, title, description, status, confidence
      FROM hypotheses
      WHERE investigation_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
      )
      .all(investigationId, hypothesisLimit)) as any[];

    const counts = (await db
      .prepare(
        `
      SELECT
        (SELECT COUNT(*) FROM investigation_evidence WHERE investigation_id = @investigationId) as evidence_count,
        (SELECT COUNT(*) FROM hypotheses WHERE investigation_id = @investigationId) as hypothesis_count
    `,
      )
      .get({ investigationId })) as { evidence_count: number; hypothesis_count: number };

    const notebook = await investigationsRepository.getNotebook(investigationId);

    const revision = (await db
      .prepare(
        `
      SELECT MAX(rev) as revision FROM (
        SELECT COALESCE(updated_at, created_at) as rev FROM investigations WHERE id = @investigationId
        UNION ALL
        SELECT added_at as rev FROM investigation_evidence WHERE investigation_id = @investigationId
        UNION ALL
        SELECT updated_at as rev FROM investigation_notebook WHERE investigation_id = @investigationId
      ) as sub
    `,
      )
      .get({ investigationId })) as { revision: string | null };

    return {
      investigationId,
      revision: revision?.revision || null,
      evidenceCount: counts?.evidence_count || 0,
      hypothesisCount: counts?.hypothesis_count || 0,
      notebookOrderCount: Array.isArray(notebook.order) ? notebook.order.length : 0,
      notebookOrder: Array.isArray(notebook.order) ? notebook.order : [],
      evidencePreview,
      hypothesesPreview,
    };
  },

  getInvestigationsByEntityId: async (entityId: number | string) => {
    const db = getDb();
    const query = `
      SELECT DISTINCT i.*
      FROM investigations i
      JOIN investigation_evidence ie ON i.id = ie.investigation_id
      JOIN evidence_entity ee ON ie.evidence_id = ee.evidence_id
      WHERE ee.entity_id = ?
      ORDER BY i.updated_at DESC
    `;
    const rows = db.prepare(query).all(entityId) as any[];
    return rows.map((row) => mapInvestigation(row));
  },
};

function mapInvestigation(row: any): Investigation {
  return {
    id: row.id,
    uuid: row.uuid,
    title: row.title,
    description: row.description,
    owner_id: row.owner_id,
    collaborator_ids: JSON.parse(row.collaborator_ids || '[]'),
    status: row.status,
    scope: row.scope,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
