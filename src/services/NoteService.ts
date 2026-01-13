import Database from 'better-sqlite3';

export interface Note {
  id: number;
  uuid: string;
  subject_type: 'document' | 'entity' | 'relationship' | 'hypothesis' | 'investigation';
  subject_id: string;
  author_id: string;
  body: string;
  visibility: 'private' | 'investigation' | 'global';
  created_at: string;
  updated_at: string;
}

export interface CreateNoteInput {
  subjectType: 'document' | 'entity' | 'relationship' | 'hypothesis' | 'investigation';
  subjectId: string;
  authorId: string;
  body: string;
  visibility?: 'private' | 'investigation' | 'global';
}

export interface UpdateNoteInput {
  body?: string;
  visibility?: 'private' | 'investigation' | 'global';
}

export class NoteService {
  constructor(private db: any) {}

  async getNotes(subjectType?: string, subjectId?: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any = { limit, offset };

    if (subjectType) {
      where.push('subject_type = @subjectType');
      params.subjectType = subjectType;
    }
    if (subjectId) {
      where.push('subject_id = @subjectId');
      params.subjectId = subjectId;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT id, uuid, subject_type, subject_id, author_id, body, visibility, created_at, updated_at
      FROM notes
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT @limit OFFSET @offset
    `;

    const countQuery = `SELECT COUNT(*) as total FROM notes ${whereClause}`;

    const notes = this.db.prepare(query).all(params) as any[];
    const { total } = this.db.prepare(countQuery).get(params) as { total: number };

    return {
      data: notes.map((n) => this.mapNote(n)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createNote(data: CreateNoteInput): Promise<Note> {
    const stmt = this.db.prepare(`
      INSERT INTO notes (subject_type, subject_id, author_id, body, visibility)
      VALUES (@subjectType, @subjectId, @authorId, @body, @visibility)
    `);

    const result = stmt.run({
      subjectType: data.subjectType,
      subjectId: data.subjectId,
      authorId: data.authorId,
      body: data.body,
      visibility: data.visibility || 'investigation',
    });

    const note = await this.getNoteById(result.lastInsertRowid as number);
    if (!note) {
      throw new Error('Failed to create note');
    }

    return note;
  }

  async getNoteById(id: number): Promise<Note | null> {
    const note = this.db
      .prepare(
        `
      SELECT id, uuid, subject_type, subject_id, author_id, body, visibility, created_at, updated_at
      FROM notes WHERE id = ?
    `,
      )
      .get(id) as any;

    if (!note) return null;

    return this.mapNote(note);
  }

  async updateNote(id: number, updates: UpdateNoteInput): Promise<Note | null> {
    const fields: string[] = [];
    const params: any = { id };

    if (updates.body !== undefined) {
      fields.push('body = @body');
      params.body = updates.body;
    }
    if (updates.visibility !== undefined) {
      fields.push('visibility = @visibility');
      params.visibility = updates.visibility;
    }

    if (fields.length === 0) {
      return this.getNoteById(id);
    }

    this.db
      .prepare(
        `
      UPDATE notes 
      SET ${fields.join(', ')}
      WHERE id = @id
    `,
      )
      .run(params);

    return this.getNoteById(id);
  }

  async deleteNote(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private mapNote(row: any): Note {
    return {
      id: row.id,
      uuid: row.uuid,
      subject_type: row.subject_type,
      subject_id: row.subject_id,
      author_id: row.author_id,
      body: row.body,
      visibility: row.visibility,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
