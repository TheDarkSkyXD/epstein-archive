
import { getDb } from '../db/connection.js';

export const logAudit = (
  action: string,
  userId: string | null,
  objectType: string,
  objectId: string | null,
  payload?: any
) => {
  try {
    const db = getDb();
    // Default to 'system' if no user provided
    const user = userId || 'system';
    
    db.prepare(`
      INSERT INTO audit_log (user_id, action, object_type, object_id, payload_json, timestamp)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(
      user,
      action,
      objectType,
      objectId,
      payload ? JSON.stringify(payload) : null
    );
  } catch (error) {
    // Audit logging failure should be silent but logged to stderr
    console.error('FAILED TO LOG AUDIT:', error);
  }
};
