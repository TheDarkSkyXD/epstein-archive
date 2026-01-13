import { getDb } from '../server/db/connection.js';
import { investigationsRepository } from '../server/db/investigationsRepository.js';

export interface InvestigationTask {
  id: number;
  uuid: string;
  investigationId: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  dueDate?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  evidenceIds?: number[];
  relatedEntities?: number[];
  progress?: number; // 0-100 percentage
}

export interface CreateInvestigationTaskInput {
  investigationId: number;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  dueDate?: string;
  createdById: string;
  evidenceIds?: number[];
  relatedEntities?: number[];
}

export interface UpdateInvestigationTaskInput {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  dueDate?: string;
  evidenceIds?: number[];
  relatedEntities?: number[];
  progress?: number;
}

export interface TaskFilter {
  investigationId?: number;
  status?: string;
  priority?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

export class InvestigativeTaskService {
  async getTasks(filters: TaskFilter = {}): Promise<{
    data: InvestigationTask[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const db = getDb();
    const { investigationId, status, priority, assignedTo, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any = {};

    if (investigationId) {
      where.push('investigation_id = @investigationId');
      params.investigationId = investigationId;
    }
    if (status) {
      where.push('status = @status');
      params.status = status;
    }
    if (priority) {
      where.push('priority = @priority');
      params.priority = priority;
    }
    if (assignedTo) {
      where.push('assigned_to = @assignedTo');
      params.assignedTo = assignedTo;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT id, uuid, investigation_id, title, description, status, priority, 
             assigned_to, due_date, created_by_id, created_at, updated_at, completed_at,
             evidence_ids, related_entities, progress
      FROM investigation_tasks
      ${whereClause}
      ORDER BY priority DESC, created_at DESC
      LIMIT @limit OFFSET @offset
    `;

    const countQuery = `SELECT COUNT(*) as total FROM investigation_tasks ${whereClause}`;

    const tasks = db.prepare(query).all({ ...params, limit, offset }) as any[];
    const { total } = db.prepare(countQuery).get(params) as { total: number };

    return {
      data: tasks.map((task) => this.mapTask(task)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTaskById(id: number): Promise<InvestigationTask | null> {
    const db = getDb();
    const task = db
      .prepare(
        `
      SELECT id, uuid, investigation_id, title, description, status, priority, 
             assigned_to, due_date, created_by_id, created_at, updated_at, completed_at,
             evidence_ids, related_entities, progress
      FROM investigation_tasks WHERE id = ?
    `,
      )
      .get(id) as any;

    if (!task) return null;

    return this.mapTask(task);
  }

  async createTask(data: CreateInvestigationTaskInput): Promise<InvestigationTask> {
    const db = getDb();
    const uuid = crypto.randomUUID(); // This will need to be imported or generated differently

    // Generate UUID using crypto.randomUUID() if available, otherwise use a simple implementation
    let uuidValue: string;
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      uuidValue = crypto.randomUUID();
    } else {
      // Simple UUID generation for environments without crypto
      uuidValue = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
          v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    const stmt = db.prepare(`
      INSERT INTO investigation_tasks (
        uuid, investigation_id, title, description, priority, assigned_to, 
        due_date, created_by_id, evidence_ids, related_entities
      ) VALUES (
        @uuid, @investigationId, @title, @description, @priority, @assignedTo, 
        @dueDate, @createdById, @evidenceIds, @relatedEntities
      )
    `);

    const result = stmt.run({
      uuid: uuidValue,
      investigationId: data.investigationId,
      title: data.title,
      description: data.description || null,
      priority: data.priority || 'medium',
      assignedTo: data.assignedTo || null,
      dueDate: data.dueDate || null,
      createdById: data.createdById,
      evidenceIds: data.evidenceIds ? JSON.stringify(data.evidenceIds) : null,
      relatedEntities: data.relatedEntities ? JSON.stringify(data.relatedEntities) : null,
    });

    const task = await this.getTaskById(result.lastInsertRowid as number);
    if (!task) {
      throw new Error('Failed to create task');
    }

    return task;
  }

  async updateTask(
    id: number,
    updates: UpdateInvestigationTaskInput,
  ): Promise<InvestigationTask | null> {
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
    if (updates.status !== undefined) {
      fields.push('status = @status');
      params.status = updates.status;
      if (updates.status === 'completed') {
        fields.push('completed_at = @completedAt');
        params.completedAt = new Date().toISOString();
      }
    }
    if (updates.priority !== undefined) {
      fields.push('priority = @priority');
      params.priority = updates.priority;
    }
    if (updates.assignedTo !== undefined) {
      fields.push('assigned_to = @assignedTo');
      params.assignedTo = updates.assignedTo;
    }
    if (updates.dueDate !== undefined) {
      fields.push('due_date = @dueDate');
      params.dueDate = updates.dueDate;
    }
    if (updates.evidenceIds !== undefined) {
      fields.push('evidence_ids = @evidenceIds');
      params.evidenceIds = JSON.stringify(updates.evidenceIds);
    }
    if (updates.relatedEntities !== undefined) {
      fields.push('related_entities = @relatedEntities');
      params.relatedEntities = JSON.stringify(updates.relatedEntities);
    }
    if (updates.progress !== undefined) {
      fields.push('progress = @progress');
      params.progress = updates.progress;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    if (fields.length === 0) {
      return this.getTaskById(id);
    }

    db.prepare(
      `
      UPDATE investigation_tasks 
      SET ${fields.join(', ')}
      WHERE id = @id
    `,
    ).run(params);

    return this.getTaskById(id);
  }

  async deleteTask(id: number): Promise<boolean> {
    const db = getDb();
    const result = db.prepare('DELETE FROM investigation_tasks WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getTasksByInvestigation(investigationId: number): Promise<InvestigationTask[]> {
    const db = getDb();
    const tasks = db
      .prepare(
        `
      SELECT id, uuid, investigation_id, title, description, status, priority, 
             assigned_to, due_date, created_by_id, created_at, updated_at, completed_at,
             evidence_ids, related_entities, progress
      FROM investigation_tasks 
      WHERE investigation_id = ?
      ORDER BY priority DESC, created_at DESC
    `,
      )
      .all(investigationId) as any[];

    return tasks.map((task) => this.mapTask(task));
  }

  async getTaskSummary(investigationId: number): Promise<any> {
    const db = getDb();

    // Get task counts by status
    const statusCounts = db
      .prepare(
        `
      SELECT status, COUNT(*) as count
      FROM investigation_tasks
      WHERE investigation_id = ?
      GROUP BY status
    `,
      )
      .all(investigationId) as { status: string; count: number }[];

    // Get task counts by priority
    const priorityCounts = db
      .prepare(
        `
      SELECT priority, COUNT(*) as count
      FROM investigation_tasks
      WHERE investigation_id = ?
      GROUP BY priority
    `,
      )
      .all(investigationId) as { priority: string; count: number }[];

    // Get overdue tasks
    const overdueTasks = db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM investigation_tasks
      WHERE investigation_id = ?
        AND due_date < CURRENT_DATE
        AND status != 'completed'
    `,
      )
      .get(investigationId) as { count: number };

    // Get average progress
    const avgProgress = db
      .prepare(
        `
      SELECT AVG(progress) as avgProgress
      FROM investigation_tasks
      WHERE investigation_id = ?
        AND progress IS NOT NULL
    `,
      )
      .get(investigationId) as { avgProgress: number };

    // Get tasks assigned to each user
    const assignmentCounts = db
      .prepare(
        `
      SELECT assigned_to, COUNT(*) as count
      FROM investigation_tasks
      WHERE investigation_id = ?
        AND assigned_to IS NOT NULL
      GROUP BY assigned_to
    `,
      )
      .all(investigationId) as { assigned_to: string; count: number }[];

    return {
      statusBreakdown: statusCounts.reduce(
        (acc, curr) => {
          acc[curr.status] = curr.count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      priorityBreakdown: priorityCounts.reduce(
        (acc, curr) => {
          acc[curr.priority] = curr.count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      overdueTasks: overdueTasks.count,
      averageProgress: avgProgress.avgProgress ? Math.round(avgProgress.avgProgress) : 0,
      assignmentBreakdown: assignmentCounts,
    };
  }

  async updateTaskProgress(taskId: number, progress: number): Promise<InvestigationTask | null> {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    const db = getDb();
    const result = db
      .prepare(
        `
      UPDATE investigation_tasks 
      SET progress = @progress, updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `,
      )
      .run({ id: taskId, progress });

    if (result.changes === 0) {
      return null;
    }

    return this.getTaskById(taskId);
  }

  async getUrgentTasks(userId?: string): Promise<InvestigationTask[]> {
    const db = getDb();

    let query = `
      SELECT id, uuid, investigation_id, title, description, status, priority, 
             assigned_to, due_date, created_by_id, created_at, updated_at, completed_at,
             evidence_ids, related_entities, progress
      FROM investigation_tasks
      WHERE status != 'completed'
        AND (
          (priority = 'critical' AND due_date <= date('now', '+3 days')) OR
          (priority = 'high' AND due_date <= date('now', '+7 days')) OR
          (due_date <= date('now') AND status != 'completed')
        )
    `;

    const params: any = {};
    if (userId) {
      query += ` AND assigned_to = @userId`;
      params.userId = userId;
    }

    query += ` ORDER BY priority DESC, due_date ASC LIMIT 20`;

    const tasks = db.prepare(query).all(params) as any[];
    return tasks.map((task) => this.mapTask(task));
  }

  private mapTask(row: any): InvestigationTask {
    return {
      id: row.id,
      uuid: row.uuid,
      investigationId: row.investigation_id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assignedTo: row.assigned_to,
      dueDate: row.due_date,
      createdById: row.created_by_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      evidenceIds: row.evidence_ids ? JSON.parse(row.evidence_ids) : [],
      relatedEntities: row.related_entities ? JSON.parse(row.related_entities) : [],
      progress: row.progress || 0,
    };
  }
}
