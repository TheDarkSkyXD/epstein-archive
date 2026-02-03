import { getDb } from '../server/db/connection.js';

export interface AuditLogEntry {
  actorId: string;
  actorType: 'user' | 'system';
  action: 'view' | 'quarantine' | 'unquarantine' | 'download';
  targetType: 'document' | 'media';
  targetId: number;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const ContentAccessService = {
  /**
   * Log an access event to the audit table.
   */
  async logAccess(entry: AuditLogEntry): Promise<void> {
    const db = getDb();
    db.prepare(
      `
      INSERT INTO content_access_audit (
        actor_id, actor_type, action, target_type, target_id, reason, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      entry.actorId,
      entry.actorType,
      entry.action,
      entry.targetType,
      entry.targetId,
      entry.reason || null,
      entry.ipAddress || null,
      entry.userAgent || null,
    );
  },

  /**
   * Check if a document is quarantined and if the user has access.
   * Logs a 'denied' event if quarantined and no valid override is provided.
   */
  async checkAccess(
    documentId: number,
    actorId: string,
    reason?: string,
  ): Promise<{ allowed: boolean; message?: string }> {
    const db = getDb();

    // Check if document is quarantined
    const doc = db
      .prepare('SELECT quarantine_status FROM documents WHERE id = ?')
      .get(documentId) as { quarantine_status: string } | undefined;

    if (!doc) {
      return { allowed: false, message: 'Document not found' };
    }

    if (doc.quarantine_status === 'quarantined') {
      // For now, strict quarantine: NO processing or viewing without specific un-quarantine action
      // In a real system, we might check for 'admin' role, but here we enforce the hard stop.

      // Log the attempted access
      await this.logAccess({
        actorId,
        actorType: 'user',
        action: 'view', // Attempted view
        targetType: 'document',
        targetId: documentId,
        reason: `Access Denied (Quarantined). Provided reason: ${reason}`,
      });

      return { allowed: false, message: 'Access Denied: Document is quarantined.' };
    }

    // Log the successful access
    await this.logAccess({
      actorId,
      actorType: 'user',
      action: 'view',
      targetType: 'document',
      targetId: documentId,
      reason,
    });

    return { allowed: true };
  },
};
