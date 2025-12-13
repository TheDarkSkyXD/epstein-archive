import { getDb } from '../db/connection.js';

export interface AuditEvent {
  userId?: string;
  action: string;
  objectType: string;
  objectId?: string | number | null;
  payload?: unknown;
}

export function logAudit(event: AuditEvent) {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO audit_log (user_id, action, object_type, object_id, payload_json)
       VALUES (@userId, @action, @objectType, @objectId, @payload)`
    ).run({
      userId: event.userId || null,
      action: event.action,
      objectType: event.objectType,
      objectId: event.objectId != null ? String(event.objectId) : null,
      payload: event.payload ? JSON.stringify(event.payload) : null,
    });
  } catch (e) {
    console.error('Failed to write audit log entry', e);
  }
}
