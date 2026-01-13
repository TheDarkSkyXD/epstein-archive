import Database from 'better-sqlite3';

export interface Task {
  id: number;
  uuid: string;
  investigation_id: number;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'done' | 'wont_do';
  assignee_id?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  investigationId: number;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: 'open' | 'in_progress' | 'done' | 'wont_do';
  assigneeId?: string;
  dueDate?: string;
}

export class TaskService {
  constructor(private db: any) {}

  async getTasks(
    investigationId?: number,
    status?: string,
    assigneeId?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any = { limit, offset };

    if (investigationId) {
      where.push('investigation_id = @investigationId');
      params.investigationId = investigationId;
    }
    if (status) {
      where.push('status = @status');
      params.status = status;
    }
    if (assigneeId) {
      where.push('assignee_id = @assigneeId');
      params.assigneeId = assigneeId;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT id, uuid, investigation_id, title, description, status, assignee_id, due_date, created_at, updated_at
      FROM tasks
      ${whereClause}
      ORDER BY 
        CASE status 
          WHEN 'in_progress' THEN 1
          WHEN 'open' THEN 2
          WHEN 'done' THEN 3
          WHEN 'wont_do' THEN 4
        END,
        due_date ASC,
        created_at DESC
      LIMIT @limit OFFSET @offset
    `;

    const countQuery = `SELECT COUNT(*) as total FROM tasks ${whereClause}`;

    const tasks = this.db.prepare(query).all(params) as any[];
    const { total } = this.db.prepare(countQuery).get(params) as { total: number };

    return {
      data: tasks.map((t) => this.mapTask(t)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createTask(data: CreateTaskInput): Promise<Task> {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (investigation_id, title, description, assignee_id, due_date)
      VALUES (@investigationId, @title, @description, @assigneeId, @dueDate)
    `);

    const result = stmt.run({
      investigationId: data.investigationId,
      title: data.title,
      description: data.description || null,
      assigneeId: data.assigneeId || null,
      dueDate: data.dueDate || null,
    });

    const task = await this.getTaskById(result.lastInsertRowid as number);
    if (!task) {
      throw new Error('Failed to create task');
    }

    return task;
  }

  async getTaskById(id: number): Promise<Task | null> {
    const task = this.db
      .prepare(
        `
      SELECT id, uuid, investigation_id, title, description, status, assignee_id, due_date, created_at, updated_at
      FROM tasks WHERE id = ?
    `,
      )
      .get(id) as any;

    if (!task) return null;

    return this.mapTask(task);
  }

  async updateTask(id: number, updates: UpdateTaskInput): Promise<Task | null> {
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
    if (updates.assigneeId !== undefined) {
      fields.push('assignee_id = @assigneeId');
      params.assigneeId = updates.assigneeId;
    }
    if (updates.dueDate !== undefined) {
      fields.push('due_date = @dueDate');
      params.dueDate = updates.dueDate;
    }

    if (fields.length === 0) {
      return this.getTaskById(id);
    }

    this.db
      .prepare(
        `
      UPDATE tasks 
      SET ${fields.join(', ')}
      WHERE id = @id
    `,
      )
      .run(params);

    return this.getTaskById(id);
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private mapTask(row: any): Task {
    return {
      id: row.id,
      uuid: row.uuid,
      investigation_id: row.investigation_id,
      title: row.title,
      description: row.description,
      status: row.status,
      assignee_id: row.assignee_id,
      due_date: row.due_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
