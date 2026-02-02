import { getDb } from './connection.js';

export interface FinancialTransaction {
  id?: number;
  from_entity: string;
  to_entity: string;
  amount: number;
  currency: string;
  transaction_date: string;
  transaction_type: string;
  method: string;
  risk_level: string;
  description: string;
  investigation_id?: number;
  source_document_id?: string;
  metadata_json?: string;
  created_at?: string;
}

export const financialRepository = {
  getTransactions: (limit: number = 100): FinancialTransaction[] => {
    const db = getDb();
    return db
      .prepare(
        `
      SELECT * FROM financial_transactions 
      ORDER BY transaction_date DESC 
      LIMIT ?
    `,
      )
      .all(limit) as FinancialTransaction[];
  },

  getTransactionsByInvestigation: (investigationId: number): FinancialTransaction[] => {
    const db = getDb();
    return db
      .prepare(
        `
      SELECT * FROM financial_transactions 
      WHERE investigation_id = ? 
      ORDER BY transaction_date DESC
    `,
      )
      .all(investigationId) as FinancialTransaction[];
  },

  getTransactionsByEntity: (entityName: string): FinancialTransaction[] => {
    const db = getDb();
    return db
      .prepare(
        `
      SELECT * FROM financial_transactions 
      WHERE from_entity = ? OR to_entity = ? 
      ORDER BY transaction_date DESC
    `,
      )
      .all(entityName, entityName) as FinancialTransaction[];
  },

  saveTransaction: (tx: FinancialTransaction) => {
    const db = getDb();
    const result = db
      .prepare(
        `
      INSERT INTO financial_transactions (
        from_entity, to_entity, amount, currency, transaction_date, 
        transaction_type, method, risk_level, description, 
        investigation_id, source_document_id, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        tx.from_entity,
        tx.to_entity,
        tx.amount,
        tx.currency || 'USD',
        tx.transaction_date,
        tx.transaction_type,
        tx.method,
        tx.risk_level || 'medium',
        tx.description,
        tx.investigation_id,
        tx.source_document_id,
        tx.metadata_json,
      );
    return result.lastInsertRowid;
  },

  getFinancialSummary: () => {
    const db = getDb();
    const totalValue = db
      .prepare('SELECT SUM(amount) as total FROM financial_transactions')
      .get() as { total: number };
    const highRiskCount = db
      .prepare(
        "SELECT COUNT(*) as count FROM financial_transactions WHERE risk_level IN ('high', 'critical')",
      )
      .get() as { count: number };
    const topEntities = db
      .prepare(
        `
      SELECT entity, SUM(amount) as total_volume FROM (
        SELECT from_entity as entity, amount FROM financial_transactions
        UNION ALL
        SELECT to_entity as entity, amount FROM financial_transactions
      ) GROUP BY entity ORDER BY total_volume DESC LIMIT 5
    `,
      )
      .all();

    return {
      totalValue: totalValue.total || 0,
      highRiskCount: highRiskCount.count || 0,
      totalTransactions: db
        .prepare('SELECT COUNT(*) as count FROM financial_transactions')
        .get() as {
        count: number;
      },
      topEntities,
    };
  },
};
