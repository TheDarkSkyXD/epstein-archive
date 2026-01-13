import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/connection.js';
import { authenticateRequest, optionalAuthenticate } from './middleware.js';

import rateLimit from 'express-rate-limit';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod-if-possible';

if (
  process.env.NODE_ENV === 'production' &&
  JWT_SECRET === 'dev-secret-do-not-use-in-prod-if-possible'
) {
  console.warn(
    '⚠️  WARNING: Using default JWT_SECRET in production! Set JWT_SECRET environment variable.',
  );
}

// Rate limiter for login: 5 attempts per 15 mins
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
});

// POST /api/auth/login
router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    if (!user) {
      // Don't reveal user existence
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid user configuration' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate Token
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    // Update last_active
    db.prepare('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    // Return user info (sanitize)
    // Return user info (sanitize)
    const { password_hash, ...userInfo } = user;

    // Secure Cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure in prod (HTTPS)
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ success: true, user: userInfo });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', optionalAuthenticate, (req: any, res) => {
  if (!req.user) {
    // Return null user instead of 401 to suppress console errors
    return res.json({ user: null });
  }
  const { password_hash, ...userInfo } = req.user;
  res.json({ user: userInfo });
});

// POST /api/auth/change-password
router.post('/change-password', authenticateRequest, (req: any, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify current password
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);

    res.json({ success: true });
  } catch (e) {
    console.error('Password change error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
