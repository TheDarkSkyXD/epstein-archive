
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
  getInvestigations: async (filters: { 
      status?: string; 
      ownerId?: string; 
      page?: number; 
      limit?: number 
  } = {}) => {
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
      data: investigations.map(inv => mapInvestigation(inv)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  createInvestigation: async (data: { 
      title: string; 
      description?: string; 
      ownerId: string; 
      scope?: string; 
      collaboratorIds?: string[] 
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
      collaboratorIds: JSON.stringify(data.collaboratorIds || [])
    });
    
    return investigationsRepository.getInvestigationById(result.lastInsertRowid as number);
  },

  getInvestigationById: async (id: number | string) => {
    const db = getDb();
    // Support uuid or id? Logic used ID mostly.
    const inv = db.prepare(`
      SELECT id, uuid, title, description, owner_id, collaborator_ids, 
             status, scope, created_at, updated_at
      FROM investigations WHERE id = ?
    `).get(id) as any;
    
    if (!inv) return null;
    return mapInvestigation(inv);
  },

  getInvestigationByUuid: async (uuid: string) => {
    const db = getDb();
    const inv = db.prepare(`
      SELECT id, uuid, title, description, owner_id, collaborator_ids, 
             status, scope, created_at, updated_at
      FROM investigations WHERE uuid = ?
    `).get(uuid) as any;
    
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
    return db.prepare('SELECT * FROM evidence_items WHERE investigation_id = ? ORDER BY id DESC').all(investigationId);
  },

  addEvidence: async (investigationId: number, data: any) => {
    const db = getDb();
    
    // Handle frontend format where evidence is nested inside data.evidence
    const evidenceData = data.evidence || data;
    const relevance = data.relevance || evidenceData.relevance || 'high';
    
    // Determine the type and extract appropriate ID
    // Support: documents, media (images), or generic evidence
    const type = evidenceData.type || (evidenceData.thumbnailPath ? 'media' : 'document');
    
    // Get the ID based on type
    const documentId = type === 'media' 
      ? null 
      : (evidenceData.id || evidenceData.documentId || null);
    const mediaId = type === 'media' 
      ? (evidenceData.id || evidenceData.mediaId || null) 
      : null;
    
    // Build title from available fields
    const title = evidenceData.title 
      || evidenceData.file_name 
      || evidenceData.filename 
      || evidenceData.name 
      || 'Untitled Evidence';
    
    const stmt = db.prepare(`
      INSERT INTO evidence_items (
        investigation_id, document_id, title, type, source_id, source, 
        description, relevance, credibility, extracted_at, extracted_by, 
        authenticity_score, hash, sensitivity
      ) VALUES (
        @investigation_id, @document_id, @title, @type, @source_id, @source,
        @description, @relevance, @credibility, @extracted_at, @extracted_by,
        @authenticity_score, @hash, @sensitivity
      )
    `);
    
    const result = stmt.run({
      investigation_id: investigationId,
      document_id: documentId || mediaId, // Store either doc or media ID
      title: title,
      type: type,
      source_id: evidenceData.sourceId || evidenceData.id?.toString() || '',
      source: evidenceData.source || evidenceData.file_path || evidenceData.path || '',
      description: evidenceData.description || evidenceData.snippet || '',
      relevance: relevance,
      credibility: evidenceData.credibility || 'verified',
      extracted_at: data.addedAt || new Date().toISOString(),
      extracted_by: 'user',
      authenticity_score: null,
      hash: null,
      sensitivity: 'public'
    });
    return result.lastInsertRowid;
  },

  getTimelineEvents: async (investigationId: number) => {
    const db = getDb();
    return db.prepare('SELECT * FROM investigation_timeline_events WHERE investigation_id = ? ORDER BY start_date ASC').all(investigationId);
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
      end_date: data.endDate || null
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
      documents: data.documents ? JSON.stringify(data.documents) : null
    });
    return result.changes > 0;
  },

  deleteTimelineEvent: async (eventId: number) => {
    const db = getDb();
    const result = db.prepare('DELETE FROM investigation_timeline_events WHERE id = ?').run(eventId);
    return result.changes > 0;
  },

  getHypotheses: async (investigationId: number) => {
    const db = getDb();
    return db.prepare('SELECT * FROM investigation_hypotheses WHERE investigation_id = ? ORDER BY confidence DESC').all(investigationId);
  },

  addHypothesis: async (investigationId: number, data: any) => {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO investigation_hypotheses (investigation_id, title, description, status, confidence) VALUES (?,?,?,?,?)');
    const result = stmt.run(investigationId, data.title, data.description || '', data.status || 'proposed', data.confidence || 50);
    return result.lastInsertRowid;
  },

  updateHypothesis: async (hypId: number, data: any) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM investigation_hypotheses WHERE id = ?').get(hypId) as any;
    if (!existing) return null;
    
    const stmt = db.prepare('UPDATE investigation_hypotheses SET title = ?, description = ?, status = ?, confidence = ?, updated_at = ? WHERE id = ?');
    stmt.run(
      data.title || existing.title,
      data.description || existing.description,
      data.status || existing.status,
      data.confidence !== undefined ? data.confidence : existing.confidence,
      new Date().toISOString(),
      hypId
    );
    return { ...existing, ...data };
  },

  getChainOfCustody: async (evidenceId: number) => {
    const db = getDb();
    return db.prepare('SELECT id, evidence_id, date, actor, action, notes, signature FROM chain_of_custody WHERE evidence_id = ? ORDER BY date ASC').all(evidenceId);
  },

  addChainOfCustody: async (data: any) => {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO chain_of_custody (evidence_id, date, actor, action, notes, signature) VALUES (?,?,?,?,?,?)');
    const result = stmt.run(
        data.evidenceId, 
        new Date().toISOString(), 
        data.actor || 'system', 
        data.action || 'analyzed', 
        data.notes || '', 
        data.signature || null
    );
    return result.lastInsertRowid;
  },


  updateInvestigation: async (id: number, updates: { 
      title?: string; 
      description?: string; 
      scope?: string; 
      status?: 'open' | 'in_review' | 'closed' | 'archived'; 
      collaboratorIds?: string[] 
  }) => {
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
    
    db.prepare(`
      UPDATE investigations 
      SET ${fields.join(', ')}
      WHERE id = @id
    `).run(params);
    
    return investigationsRepository.getInvestigationById(id);
  }
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
    updated_at: row.updated_at
  };
}
