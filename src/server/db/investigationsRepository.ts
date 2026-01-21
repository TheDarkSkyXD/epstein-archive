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

    const investigations = db.prepare(query).all({ ...params, limit, offset }) as any[];
    const { total } = db.prepare(countQuery).get(params) as { total: number };

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
    `);

    const result = stmt.run({
      title: data.title,
      description: data.description || null,
      ownerId: data.ownerId,
      scope: data.scope || null,
      collaboratorIds: JSON.stringify(data.collaboratorIds || []),
    });

    return investigationsRepository.getInvestigationById(result.lastInsertRowid as number);
  },

  getInvestigationById: async (id: number | string) => {
    const db = getDb();
    // Support uuid or id? Logic used ID mostly.
    const inv = db
      .prepare(
        `
      SELECT id, uuid, title, description, owner_id, collaborator_ids, 
             status, scope, created_at, updated_at
      FROM investigations WHERE id = ?
    `,
      )
      .get(id) as any;

    if (!inv) return null;
    return mapInvestigation(inv);
  },

  getInvestigationByUuid: async (uuid: string) => {
    const db = getDb();
    const inv = db
      .prepare(
        `
      SELECT id, uuid, title, description, owner_id, collaborator_ids, 
             status, scope, created_at, updated_at
      FROM investigations WHERE uuid = ?
    `,
      )
      .get(uuid) as any;

    if (!inv) return null;
    return mapInvestigation(inv);
  },

  deleteInvestigation: async (id: number) => {
    const db = getDb();
    const result = db.prepare('DELETE FROM investigations WHERE id = ?').run(id);
    return result.changes > 0;
  },

  // --- Sub-resources ---

  getEvidence: async (investigationId: number) => {
    const db = getDb();
    // JOINing investigation_evidence with evidence table to get the full view
    // aligned with the frontend expectations.
    return db
      .prepare(
        `
      SELECT 
        e.id, 
        e.evidence_type as type, 
        e.title, 
        e.description, 
        e.source_path, 
        ie.relevance, 
        ie.added_at as extracted_at, 
        ie.added_by as extracted_by
      FROM investigation_evidence ie
      JOIN evidence e ON ie.evidence_id = e.id
      WHERE ie.investigation_id = ? 
      ORDER BY ie.added_at DESC
    `,
      )
      .all(investigationId);
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
    const existingEvidence = db
      .prepare('SELECT id FROM evidence WHERE source_path = ?')
      .get(sourcePath);

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
            ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
        `);

      const result = insertEvidence.run(
        title,
        description,
        type,
        sourcePath,
        title, // original_filename fallback
        evidenceData.red_flag_rating || 0,
      );
      evidenceId = result.lastInsertRowid;
    }

    // 2. Link to Investigation in `investigation_evidence`
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO investigation_evidence (
        investigation_id, evidence_id, notes, relevance, added_at, added_by
      ) VALUES (
        @investigation_id, @evidence_id, @notes, @relevance, datetime('now'), @added_by
      )
    `);

    const result = stmt.run({
      investigation_id: investigationId,
      evidence_id: evidenceId,
      notes: evidenceData.notes || '',
      relevance: relevance,
      added_by: 'user',
    });

    // Log the activity
    try {
      investigationsRepository.logActivity({
        investigationId,
        actionType: 'evidence_added',
        targetType: type,
        targetId: String(evidenceId),
        targetTitle: title,
        metadata: { relevance, sourcePath }
      });
    } catch (e) {
      console.warn('Failed to log activity:', e);
    }

    return result.lastInsertRowid;
  },

  getTimelineEvents: (investigationId: number) => {
    const db = getDb();
    return db
      .prepare(
        'SELECT * FROM investigation_timeline_events WHERE investigation_id = ? ORDER BY start_date ASC',
      )
      .all(investigationId);
  },

  addTimelineEvent: async (investigationId: number, data: any) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO investigation_timeline_events (
        investigation_id, title, description, type, start_date, end_date
      ) VALUES (
        @investigation_id, @title, @description, @type, @start_date, @end_date
      )
    `);
    const result = stmt.run({
      investigation_id: investigationId,
      title: data.title || '',
      description: data.description || '',
      type: data.type || 'document',
      start_date: data.startDate || '',
      end_date: data.endDate || null,
    });
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

    const result = stmt.run({
      id: eventId,
      title: data.title,
      description: data.description,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      confidence: data.confidence,
      entities: data.entities ? JSON.stringify(data.entities) : null,
      documents: data.documents ? JSON.stringify(data.documents) : null,
    });
    return result.changes > 0;
  },

  deleteTimelineEvent: async (eventId: number) => {
    const db = getDb();
    const result = db
      .prepare('DELETE FROM investigation_timeline_events WHERE id = ?')
      .run(eventId);
    return result.changes > 0;
  },

  getChainOfCustody: async (evidenceId: number) => {
    const db = getDb();
    return db
      .prepare(
        'SELECT id, evidence_id, date, actor, action, notes, signature FROM chain_of_custody WHERE evidence_id = ? ORDER BY date ASC',
      )
      .all(evidenceId);
  },

  addChainOfCustody: async (data: any) => {
    const db = getDb();
    const stmt = db.prepare(
      'INSERT INTO chain_of_custody (evidence_id, date, actor, action, notes, signature) VALUES (?,?,?,?,?,?)',
    );
    const result = stmt.run(
      data.evidenceId,
      new Date().toISOString(),
      data.actor || 'system',
      data.action || 'analyzed',
      data.notes || '',
      data.signature || null,
    );
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

    db.prepare(
      `
      UPDATE investigations 
      SET ${fields.join(', ')}
      WHERE id = @id
    `,
    ).run(params);

    return investigationsRepository.getInvestigationById(id);
  },

  getNotebook: async (investigationId: number) => {
    const db = getDb();
    const row = db
      .prepare(
        `
      SELECT investigation_id as investigationId, order_json as orderJson, annotations_json as annotationsJson, updated_at as updatedAt
      FROM investigation_notebook
      WHERE investigation_id = ?
    `,
      )
      .get(investigationId) as any;
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
    const existing = db
      .prepare(`SELECT investigation_id FROM investigation_notebook WHERE investigation_id = ?`)
      .get(investigationId);
    const orderJson = JSON.stringify(payload.order || []);
    const annotationsJson = JSON.stringify(payload.annotations || []);
    if (existing) {
      db.prepare(
        `
        UPDATE investigation_notebook
        SET order_json = ?, annotations_json = ?, updated_at = datetime('now')
        WHERE investigation_id = ?
      `,
      ).run(orderJson, annotationsJson, investigationId);
    } else {
      db.prepare(
        `
        INSERT INTO investigation_notebook (investigation_id, order_json, annotations_json, updated_at)
        VALUES (?, ?, ?, datetime('now'))
      `,
      ).run(investigationId, orderJson, annotationsJson);
    }
    return true;
  },

  // --- Hypotheses ---

  getHypotheses: async (investigationId: number) => {
    const db = getDb();
    const hypotheses = db
      .prepare(`SELECT * FROM hypotheses WHERE investigation_id = ? ORDER BY created_at DESC`)
      .all(investigationId) as any[];

    // Include evidence for each hypothesis
    for (const hyp of hypotheses) {
      hyp.evidenceLinks = db.prepare(`
        SELECT he.*, e.title as evidence_title, e.evidence_type 
        FROM hypothesis_evidence he
        JOIN evidence e ON he.evidence_id = e.id
        WHERE he.hypothesis_id = ?
      `).all(hyp.id);
    }
    return hypotheses;
  },

  addHypothesis: async (investigationId: number, data: { title: string; description?: string }) => {
    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO hypotheses (investigation_id, title, description) VALUES (@invId, @title, @desc)`
      )
      .run({
        invId: investigationId,
        title: data.title,
        desc: data.description || '',
      });
    return result.lastInsertRowid;
  },

  updateHypothesis: async (id: number, data: { title?: string; description?: string; status?: string; confidence?: number }) => {
    const db = getDb();
    const sets: string[] = [];
    const params: any = { id };
    
    if (data.title !== undefined) { sets.push('title = @title'); params.title = data.title; }
    if (data.description !== undefined) { sets.push('description = @description'); params.description = data.description; }
    if (data.status !== undefined) { sets.push('status = @status'); params.status = data.status; }
    if (data.confidence !== undefined) { sets.push('confidence = @confidence'); params.confidence = data.confidence; }
    
    sets.push("updated_at = datetime('now')");

    if (sets.length === 1) return true; // only updated_at

    const result = db.prepare(`UPDATE hypotheses SET ${sets.join(', ')} WHERE id = @id`).run(params);
    return result.changes > 0;
  },

  deleteHypothesis: async (id: number) => {
    const db = getDb();
    const result = db.prepare('DELETE FROM hypotheses WHERE id = ?').run(id);
    return result.changes > 0;
  },

  addEvidenceToHypothesis: async (hypothesisId: number, evidenceId: number, relevance = 'supporting') => {
    const db = getDb();
    // Check if exists
    const exists = db
      .prepare('SELECT id FROM hypothesis_evidence WHERE hypothesis_id = ? AND evidence_id = ?')
      .get(hypothesisId, evidenceId);
      
    if (exists) return (exists as any).id;

    const result = db.prepare(`
      INSERT INTO hypothesis_evidence (hypothesis_id, evidence_id, relevance)
      VALUES (?, ?, ?)
    `).run(hypothesisId, evidenceId, relevance);
    
    return result.lastInsertRowid;
  },

  removeEvidenceFromHypothesis: async (hypothesisId: number, evidenceId: number) => {
    const db = getDb();
    const result = db.prepare('DELETE FROM hypothesis_evidence WHERE hypothesis_id = ? AND evidence_id = ?').run(hypothesisId, evidenceId);
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
    `);
    const result = stmt.run(
      data.investigationId,
      data.userId || 'anonymous',
      data.userName || 'Anonymous User',
      data.actionType,
      data.targetType || null,
      data.targetId || null,
      data.targetTitle || null,
      data.metadata ? JSON.stringify(data.metadata) : null
    );
    return result.lastInsertRowid;
  },

  getActivity: async (investigationId: number, limit = 50) => {
    const db = getDb();
    return db.prepare(`
      SELECT id, investigation_id, user_id, user_name, action_type,
             target_type, target_id, target_title, metadata_json, created_at
      FROM investigation_activity
      WHERE investigation_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(investigationId, limit) as any[];
  },

  // Enhanced evidence retrieval with type breakdown
  getEvidenceByType: async (investigationId: number) => {
    const db = getDb();
    const evidence = db.prepare(`
      SELECT 
        e.id, 
        e.evidence_type as type, 
        e.title, 
        e.description, 
        e.source_path,
        e.red_flag_rating,
        ie.relevance, 
        ie.added_at, 
        ie.added_by,
        ie.notes
      FROM investigation_evidence ie
      JOIN evidence e ON ie.evidence_id = e.id
      WHERE ie.investigation_id = ? 
      ORDER BY ie.added_at DESC
    `).all(investigationId) as any[];

    // Group by type
    const byType: Record<string, any[]> = {};
    for (const e of evidence) {
      const type = e.type || 'other';
      if (!byType[type]) byType[type] = [];
      byType[type].push(e);
    }

    return {
      all: evidence,
      byType,
      counts: Object.fromEntries(
        Object.entries(byType).map(([type, items]) => [type, items.length])
      ),
      total: evidence.length
    };
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
