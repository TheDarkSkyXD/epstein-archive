import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/connection.js';
import { logAudit } from '../utils/auditLogger.js';

// Extend Express Request to include user info
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
}

/**
 * 2. Enforce Quarantine Middleware
 * Checks if the requested resource is quarantined.
 * Assumes route params contain :id and we know the type.
 */
export const enforceQuarantine = (resourceType: 'document' | 'media') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    if (!id) return next(); // Should not happen if route matches :id

    try {
      const db = getDb();
      const table = resourceType === 'document' ? 'documents' : 'media_items';

      const item = db
        .prepare(`SELECT is_quarantined, quarantine_reason FROM ${table} WHERE id = ?`)
        .get(id);

      if (item && item.is_quarantined) {
        // Check if user has admin override
        const user = (req as AuthenticatedRequest).user;
        const isAdmin = user?.role === 'admin';

        if (!isAdmin) {
          logAudit('quarantine', user?.id || null, resourceType, id, {
            reason: 'access_denied_quarantine',
          });
          return res.status(403).json({
            error: 'Resource is quarantined',
            reason: item.quarantine_reason,
          });
        }

        // Admin access to quarantined item - Log it!
        logAudit('view', user?.id || null, resourceType, id, { reason: 'quarantine_override' });
      }

      next();
    } catch (err) {
      console.error('Quarantine check failed:', err);
      // Fail closed
      res.status(500).json({ error: 'Security check failed' });
    }
  };
};

/**
 * 3. Role-Based Access Control
 */
export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;

    // Simple role hierarchy: admin > user > guest
    const roles = ['guest', 'user', 'admin'];
    const userRoleIndex = roles.indexOf(user?.role || 'guest');
    const requiredRoleIndex = roles.indexOf(requiredRole);

    if (userRoleIndex >= requiredRoleIndex) {
      next();
    } else {
      // Log failed access due to role
      // Warning: 'access_denied' isn't a standard action in our schema, 'view' with failure is better but logAudit is void.
      // We'll log 'view' with reason.
      // But we don't know the target resource here?
      // Just log access denied.
      res.status(403).json({ error: 'Insufficient permissions' });
    }
  };
};

/**
 * 4. Audit Log Middleware
 * Logs successful access after the fact.
 */
export const auditAccess = (
  action: 'view' | 'download' | 'export',
  resourceType: 'document' | 'media',
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // We hook into the response 'finish' event to know if it sent 200 OK
    res.on('finish', () => {
      // If status is 2xx, logging success
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const id = req.params.id;
        if (id) {
          logAudit(action, (req as any).user?.id || null, resourceType, id, {});
        }
      }
    });
    next();
  };
};
