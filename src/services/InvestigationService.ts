import Database from 'better-sqlite3';

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

export interface CreateInvestigationInput {
  title: string;
  description?: string;
  ownerId: string;
  scope?: string;
  collaboratorIds?: string[];
}

export interface UpdateInvestigationInput {
  title?: string;
  description?: string;
  scope?: string;
  status?: 'open' | 'in_review' | 'closed' | 'archived';
  collaboratorIds?: string[];
}

export interface InvestigationFilters {
  status?: string;
  ownerId?: string;
  page?: number;
  limit?: number;
}

export class InvestigationService {
  constructor(private db: any) {}

  async getInvestigations(filters: InvestigationFilters = {}) {
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

    const investigations = this.db.prepare(query).all({ ...params, limit, offset }) as any[];
    const { total } = this.db.prepare(countQuery).get(params) as { total: number };

    return {
      data: investigations.map((inv) => this.mapInvestigation(inv)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createInvestigation(data: CreateInvestigationInput): Promise<Investigation> {
    const stmt = this.db.prepare(`
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

    const investigation = await this.getInvestigationById(result.lastInsertRowid as number);
    if (!investigation) {
      throw new Error('Failed to create investigation');
    }

    return investigation;
  }

  async getInvestigationById(id: number): Promise<Investigation | null> {
    const inv = this.db
      .prepare(
        `
      SELECT id, uuid, title, description, owner_id, collaborator_ids, 
             status, scope, created_at, updated_at
      FROM investigations WHERE id = ?
    `,
      )
      .get(id) as any;

    if (!inv) return null;

    return this.mapInvestigation(inv);
  }

  async getInvestigationByUuid(uuid: string): Promise<Investigation | null> {
    const inv = this.db
      .prepare(
        `
      SELECT id, uuid, title, description, owner_id, collaborator_ids, 
             status, scope, created_at, updated_at
      FROM investigations WHERE uuid = ?
    `,
      )
      .get(uuid) as any;

    if (!inv) return null;

    return this.mapInvestigation(inv);
  }

  async updateInvestigation(
    id: number,
    updates: UpdateInvestigationInput,
  ): Promise<Investigation | null> {
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

    if (fields.length === 0) {
      return this.getInvestigationById(id);
    }

    this.db
      .prepare(
        `
      UPDATE investigations 
      SET ${fields.join(', ')}
      WHERE id = @id
    `,
      )
      .run(params);

    return this.getInvestigationById(id);
  }

  async deleteInvestigation(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM investigations WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private mapInvestigation(row: any): Investigation {
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
}
