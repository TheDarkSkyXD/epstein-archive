/**
 * QUERY COUNT REGRESSION GUARDS
 *
 * Middleware to count DB queries per request
 * Fails CI if budgets exceeded (prevents N+1 forever)
 */

import Database from 'better-sqlite3';

interface QueryBudget {
  endpoint: string;
  maxQueries: number;
}

// HARD BUDGETS - DO NOT INCREASE WITHOUT JUSTIFICATION
const QUERY_BUDGETS: QueryBudget[] = [
  { endpoint: 'GET /api/entities (top)', maxQueries: 1 },
  { endpoint: 'GET /api/entities (list)', maxQueries: 2 }, // 1 for count, 1 for data
  { endpoint: 'GET /api/entities/:id', maxQueries: 5 }, // Overview + basic relations
  { endpoint: 'GET /api/entities/:id/documents', maxQueries: 2 }, // 1 for count, 1 for data
  { endpoint: 'GET /api/entities/:id/relationships', maxQueries: 1 },
  { endpoint: 'GET /api/emails', maxQueries: 2 }, // 1 for count, 1 for data
  { endpoint: 'GET /api/emails/:id/body', maxQueries: 1 },
];

export class QueryCounter {
  private counts = new Map<string, number>();
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  }

  /**
   * Wrap database to count queries
   */
  wrapDatabase(db: any, requestId: string): any {
    if (!this.enabled) return db;

    this.counts.set(requestId, 0);

    const originalPrepare = db.prepare.bind(db);

    // @ts-ignore - Monkey patch for counting
    db.prepare = (sql: string) => {
      const current = this.counts.get(requestId) || 0;
      this.counts.set(requestId, current + 1);
      return originalPrepare(sql);
    };

    return db;
  }

  /**
   * Get query count for request
   */
  getCount(requestId: string): number {
    return this.counts.get(requestId) || 0;
  }

  /**
   * Check if request exceeded budget
   */
  checkBudget(
    endpoint: string,
    requestId: string,
  ): { passed: boolean; count: number; budget: number } {
    const budget = QUERY_BUDGETS.find((b) => endpoint.includes(b.endpoint));
    if (!budget) {
      return { passed: true, count: 0, budget: Infinity };
    }

    const count = this.getCount(requestId);
    const passed = count <= budget.maxQueries;

    return { passed, count, budget: budget.maxQueries };
  }

  /**
   * Clear count for request
   */
  clear(requestId: string): void {
    this.counts.delete(requestId);
  }

  /**
   * Get all budgets
   */
  getBudgets(): QueryBudget[] {
    return QUERY_BUDGETS;
  }
}

// Singleton instance
export const queryCounter = new QueryCounter();
