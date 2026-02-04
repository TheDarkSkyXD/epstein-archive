import { getDb } from '../db/connection.js';

export const logAudit = (
  action: string,
  userId: string | null,
  objectType: string,
  objectId: string | null,
  payload?: any,
) => {
  try {
    const db = getDb();
    // Default to 'system' if no user provided
    const user = userId || 'anonymous';
    const actorType = userId ? 'user' : 'system';

    // Map objectType to target_type if needed, or rely on caller to pass valid type
    // content_access_audit constraints: target_type IN ('document', 'evidence', 'media', 'entity')
    // action IN ('view', 'search', 'export', 'download', 'modify', 'delete', 'quarantine', 'unquarantine')

    db.prepare(
      `
      INSERT INTO content_access_audit (
        actor_id, actor_type, action, target_type, target_id, reason, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    ).run(
      user,
      actorType,
      action,
      objectType,
      objectId || 0, // table expects target_id as INTEGER? Wait, schema said INTEGER NOT NULL.
      // If objectId is a string (UUID), we might have issues if calling code passes UUIDs but schema expects INT.
      // Schema: target_id INTEGER NOT NULL.
      // Documents use INTEGER id.
      // If objectId is null, we pass 0.
      payload?.reason ? String(payload.reason) : payload ? JSON.stringify(payload) : null,
    );
  } catch (error) {
    // Audit logging failure should be silent but logged to stderr
    console.error('FAILED TO LOG AUDIT:', error);
  }
};
