import { financialQueries } from '@epstein/db';
import { getApiPool } from './connection.js';

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
  getTransactions: async (limit: number = 100): Promise<FinancialTransaction[]> => {
    const rows = await financialQueries.getTransactions.run({ limit: BigInt(limit) }, getApiPool());
    return rows.map((r: any) => ({
      ...r,
      id: Number(r.id),
      from_entity: r.fromEntity,
      to_entity: r.toEntity,
      amount: Number(r.amount),
      transaction_date: r.transactionDate,
      transaction_type: r.transactionType,
      risk_level: r.riskLevel,
      investigation_id: r.investigationId ? Number(r.investigationId) : undefined,
      source_document_id: r.sourceDocumentId || undefined,
      metadata_json: r.metadataJson || undefined,
      created_at: r.createdAt ? r.createdAt.toISOString() : undefined,
    })) as FinancialTransaction[];
  },

  getTransactionsByInvestigation: async (
    investigationId: number,
  ): Promise<FinancialTransaction[]> => {
    const rows = await financialQueries.getTransactionsByInvestigation.run(
      { investigationId: BigInt(investigationId) },
      getApiPool(),
    );
    return rows.map((r: any) => ({
      ...r,
      id: Number(r.id),
      from_entity: r.fromEntity,
      to_entity: r.toEntity,
      amount: Number(r.amount),
      transaction_date: r.transactionDate,
      transaction_type: r.transactionType,
      risk_level: r.riskLevel,
      investigation_id: r.investigationId ? Number(r.investigationId) : undefined,
      source_document_id: r.sourceDocumentId || undefined,
      metadata_json: r.metadataJson || undefined,
      created_at: r.createdAt ? r.createdAt.toISOString() : undefined,
    })) as FinancialTransaction[];
  },

  getTransactionsByEntity: async (entityName: string): Promise<FinancialTransaction[]> => {
    const rows = await financialQueries.getTransactionsByEntity.run({ entityName }, getApiPool());
    return rows.map((r: any) => ({
      ...r,
      id: Number(r.id),
      from_entity: r.fromEntity,
      to_entity: r.toEntity,
      amount: Number(r.amount),
      transaction_date: r.transactionDate,
      transaction_type: r.transactionType,
      risk_level: r.riskLevel,
      investigation_id: r.investigationId ? Number(r.investigationId) : undefined,
      source_document_id: r.sourceDocumentId || undefined,
      metadata_json: r.metadataJson || undefined,
      created_at: r.createdAt ? r.createdAt.toISOString() : undefined,
    })) as FinancialTransaction[];
  },

  saveTransaction: async (tx: FinancialTransaction) => {
    const result = await financialQueries.saveTransaction.run(
      {
        fromEntity: tx.from_entity,
        toEntity: tx.to_entity,
        amount: String(tx.amount), // decimal/numeric in Postgres often comes as string in results but takes string or number in run? Actually decimal is string.
        currency: tx.currency || 'USD',
        transactionDate: tx.transaction_date,
        transactionType: tx.transaction_type,
        method: tx.method,
        riskLevel: tx.risk_level || 'medium',
        description: tx.description,
        investigationId: tx.investigation_id ? BigInt(tx.investigation_id) : null,
        sourceDocumentId: tx.source_document_id || null,
        metadataJson: tx.metadata_json || null,
      },
      getApiPool(),
    );

    return result[0]?.id ? Number(result[0].id) : null;
  },

  getFinancialSummary: async () => {
    const [summary] = await financialQueries.getFinancialSummary.run(undefined, getApiPool());
    const topEntities = await financialQueries.getTopFinancialEntities.run(
      { limit: BigInt(5) },
      getApiPool(),
    );

    return {
      totalValue: Number(summary?.totalValue || 0),
      highRiskCount: Number(summary?.highRiskCount || 0),
      totalTransactions: Number(summary?.totalTransactions || 0),
      topEntities: topEntities.map((e: any) => ({
        entityId: Number(e.entityId),
        name: e.name,
        role: e.role,
        totalAmount: Number(e.totalAmount),
        transactionCount: Number(e.transactionCount),
      })),
    };
  },
};
