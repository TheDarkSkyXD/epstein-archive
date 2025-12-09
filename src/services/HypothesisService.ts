import Database from 'better-sqlite3';

export interface Hypothesis {
  id: number;
  uuid: string;
  investigation_id: number;
  title: string;
  description?: string;
  status: 'unexamined' | 'in_progress' | 'supported' | 'refuted' | 'disputed';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateHypothesisInput {
  investigationId: number;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  createdBy: string;
}

export interface UpdateHypothesisInput {
  title?: string;
  description?: string;
  status?: 'unexamined' | 'in_progress' | 'supported' | 'refuted' | 'disputed';
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

export class HypothesisService {
  constructor(private db: Database.Database) {}

  async getHypotheses(investigationId?: number, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    
    const where = investigationId ? 'WHERE investigation_id = @investigationId' : '';
    const params: any = investigationId ? { investigationId, limit, offset } : { limit, offset };
    
    const query = `
      SELECT id, uuid, investigation_id, title, description, status, priority, 
             tags, created_by, created_at, updated_at
      FROM hypotheses
      ${where}
      ORDER BY priority DESC, updated_at DESC
      LIMIT @limit OFFSET @offset
    `;
    
    const countQuery = `SELECT COUNT(*) as total FROM hypotheses ${where}`;
    
    const hypotheses = this.db.prepare(query).all(params) as any[];
    const { total } = this.db.prepare(countQuery).get(investigationId ? { investigationId } : {}) as { total: number };
    
    return {
      data: hypotheses.map(h => this.mapHypothesis(h)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async createHypothesis(data: CreateHypothesisInput): Promise<Hypothesis> {
    const stmt = this.db.prepare(`
      INSERT INTO hypotheses (investigation_id, title, description, priority, tags, created_by)
      VALUES (@investigationId, @title, @description, @priority, @tags, @createdBy)
    `);
    
    const result = stmt.run({
      investigationId: data.investigationId,
      title: data.title,
      description: data.description || null,
      priority: data.priority || 'medium',
      tags: JSON.stringify(data.tags || []),
      createdBy: data.createdBy
    });
    
    const hypothesis = await this.getHypothesisById(result.lastInsertRowid as number);
    if (!hypothesis) {
      throw new Error('Failed to create hypothesis');
    }
    
    return hypothesis;
  }

  async getHypothesisById(id: number): Promise<Hypothesis | null> {
    const h = this.db.prepare(`
      SELECT id, uuid, investigation_id, title, description, status, priority, 
             tags, created_by, created_at, updated_at
      FROM hypotheses WHERE id = ?
    `).get(id) as any;
    
    if (!h) return null;
    
    return this.mapHypothesis(h);
  }

  async updateHypothesis(id: number, updates: UpdateHypothesisInput): Promise<Hypothesis | null> {
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
    if (updates.status !== undefined) {
      fields.push('status = @status');
      params.status = updates.status;
    }
    if (updates.priority !== undefined) {
      fields.push('priority = @priority');
      params.priority = updates.priority;
    }
    if (updates.tags !== undefined) {
      fields.push('tags = @tags');
      params.tags = JSON.stringify(updates.tags);
    }
    
    if (fields.length === 0) {
      return this.getHypothesisById(id);
    }
    
    this.db.prepare(`
      UPDATE hypotheses 
      SET ${fields.join(', ')}
      WHERE id = @id
    `).run(params);
    
    return this.getHypothesisById(id);
  }

  async deleteHypothesis(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM hypotheses WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private mapHypothesis(row: any): Hypothesis {
    return {
      id: row.id,
      uuid: row.uuid,
      investigation_id: row.investigation_id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      tags: JSON.parse(row.tags || '[]'),
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
