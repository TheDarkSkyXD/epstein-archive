import { Router } from 'express';
import { authenticateRequest, requireRole } from '../auth/middleware.js';
import { logAudit } from '../utils/auditLogger.js';
import bcrypt from 'bcryptjs';
import { createUser, getUserById, listUsers, updateUser } from '../db/routesDb.js';

const router = Router();

// User Management Endpoints
router.get('/', authenticateRequest, requireRole('admin'), async (_req, res, next) => {
  try {
    const users = listUsers();
    res.json(users);
  } catch (e) {
    next(e);
  }
});

router.get('/current', authenticateRequest, async (req: any, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const user = getUserById(userId);
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
    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    createUser({
      id,
      username,
      email: email || null,
      role: role || 'viewer',
      passwordHash,
    });

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

    const fields: {
      username?: string;
      email?: string;
      role?: string;
      passwordHash?: string;
    } = {};
    if (username) {
      fields.username = username;
    }
    if (email) {
      fields.email = email;
    }
    if (role && currentUser.role === 'admin') {
      fields.role = role;
    }
    if (password) {
      fields.passwordHash = bcrypt.hashSync(password, 10);
    }

    if (!fields.username && !fields.email && !fields.role && !fields.passwordHash) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateUser(id, fields);

    logAudit('update_user', currentUser.id, 'user', id, { username, role });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
