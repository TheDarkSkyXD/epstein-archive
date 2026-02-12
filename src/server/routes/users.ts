import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { authenticateRequest, requireRole } from '../auth/middleware.js';
import { logAudit } from '../utils/auditLogger.js';
import bcrypt from 'bcryptjs';

const router = Router();

// User Management Endpoints
router.get('/', authenticateRequest, requireRole('admin'), async (_req, res, next) => {
  try {
    const db = getDb();
    const users = db
      .prepare(
        'SELECT id, username, email, role, created_at, last_active FROM users ORDER BY username ASC',
      )
      .all();
    res.json(users);
  } catch (e) {
    next(e);
  }
});

router.get('/current', authenticateRequest, async (req: any, res, next) => {
  try {
    const db = getDb();
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const user = db
      .prepare('SELECT id, username, email, role, created_at, last_active FROM users WHERE id = ?')
      .get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

// Create new user (Admin only)
router.post('/', authenticateRequest, requireRole('admin'), async (req: any, res, next) => {
  try {
    const { username, password, email, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const id = `user-${Date.now()}`;
    const db = getDb();

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(
      `
      INSERT INTO users (id, username, email, role, password_hash, created_at, last_active)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    ).run(id, username, email || null, role || 'viewer', passwordHash);

    logAudit('create_user', req.user?.id || null, 'user', id, { username, role });
    res.status(201).json({ id, username, email, role });
  } catch (e) {
    next(e);
  }
});

// Update user (Admin or Self)
router.put('/:id', authenticateRequest, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { username, email, role, password } = req.body;
    const currentUser = req.user;

    if (currentUser.role !== 'admin' && currentUser.id !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const db = getDb();
    const updates: string[] = [];
    const params: any[] = [];

    if (username) {
      updates.push('username = ?');
      params.push(username);
    }
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    if (role && currentUser.role === 'admin') {
      updates.push('role = ?');
      params.push(role);
    }
    if (password) {
      const passwordHash = bcrypt.hashSync(password, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    logAudit('update_user', currentUser.id, 'user', id, { username, role });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
