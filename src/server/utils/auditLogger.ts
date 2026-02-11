import { getDb } from '../db/connection.js';

export const logAudit = (
  action: string,
  userId: string | null,
  objectType: string,
  objectId: string | null,
  payload?: any,
  ip?: string,
) => {
  try {
    const db = getDb();

    // Auto-migrate/ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_id TEXT NOT NULL,
        actor_type TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        payload_json TEXT,
        ip_address TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const actorId = userId || 'system';
    const actorType = userId ? 'user' : 'system';

    db.prepare(
      `
      INSERT INTO audit_log (
        actor_id, actor_type, action, target_type, target_id, payload_json, ip_address
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      actorId,
      actorType,
      action,
      objectType,
      objectId,
      payload ? JSON.stringify(payload) : null,
      ip || null,
    );
  } catch (error) {
    console.error('FAILED TO LOG AUDIT:', error);
  }
};
