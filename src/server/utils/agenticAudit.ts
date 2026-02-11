import Database from 'better-sqlite3';
import { makeId } from './id_utils.js'; // Assuming it exists or I'll create it

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';

export interface AgenticTransformation {
  type:
    | 'entity_creation'
    | 'relationship_discovery'
    | 'summary_generation'
    | 'conflicts_resolution';
  subject_id: string;
  ingest_run_id: string;
  before: any;
  after: any;
  priority?: 'high' | 'medium' | 'low';
  notes?: string;
}

export class AgenticAudit {
  /**
   * Log an agentic transformation and optionally enqueue for review.
   */
  static async auditAndEnqueue(tx: AgenticTransformation) {
    const db = new Database(DB_PATH);
    const impactScore = this.calculateImpact(tx.before, tx.after);
    const priority = tx.priority || (impactScore > 0.7 ? 'high' : 'medium');

    try {
      // 1. Log the transformation in audit_log (Standard)
      const auditId = makeId();
      db.prepare(
        `
        INSERT INTO audit_log (id, action, actor_id, actor_type, target_id, target_type, description, metadata_json)
        VALUES (?, 'agentic_transformation', 'system-llm', 'system', ?, ?, ?, ?)
      `,
      ).run(
        auditId,
        tx.subject_id,
        tx.type,
        `Agentic transformation of ${tx.type}`,
        JSON.stringify({
          before: tx.before,
          after: tx.after,
          ingest_run_id: tx.ingest_run_id,
          impact_score: impactScore,
        }),
      );

      // 2. Determine if it needs human review (High Impact items)
      if (priority === 'high' || impactScore > 0.8) {
        const queueId = makeId();
        db.prepare(
          `
          INSERT INTO review_queue (id, type, subject_id, ingest_run_id, priority, payload_json, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        ).run(
          queueId,
          tx.type,
          tx.subject_id,
          tx.ingest_run_id,
          priority,
          JSON.stringify({ before: tx.before, after: tx.after }),
          tx.notes || `Auto-queued due to high impact score: ${impactScore.toFixed(2)}`,
        );
        console.log(
          `📡 [AGENTIC FENCE] High impact detected for ${tx.subject_id}. Enqueued for review.`,
        );
      }
    } finally {
      db.close();
    }
  }

  /**
   * Simple heuristic to measure the magnitude of the agentic change.
   */
  private static calculateImpact(before: any, after: any): number {
    if (!before) return 1.0; // New creation is always high impact

    // String content change (Levensthein simplified)
    if (typeof before === 'string' && typeof after === 'string') {
      const diff = Math.abs(after.length - before.length);
      return Math.min(1.0, diff / Math.max(1, before.length) + 0.2);
    }

    // JSON structure change
    if (typeof before === 'object' && typeof after === 'object') {
      const beforeKeys = Object.keys(before).length;
      const afterKeys = Object.keys(after).length;
      // Added sensitive fields (phone, email)
      const sensitiveStrings = ['phone', 'email', 'address', 'credential'];
      const afterFlat = JSON.stringify(after).toLowerCase();
      const beforeFlat = JSON.stringify(before).toLowerCase();

      for (const s of sensitiveStrings) {
        if (afterFlat.includes(s) && !beforeFlat.includes(s)) return 0.95;
      }

      return Math.min(1.0, Math.abs(afterKeys - beforeKeys) / Math.max(1, beforeKeys) + 0.1);
    }

    return 0.5;
  }
}
