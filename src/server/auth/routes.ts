import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getApiPool } from '../db/connection.js';
import { authenticateRequest, optionalAuthenticate } from './middleware.js';

import rateLimit from 'express-rate-limit';

const router = express.Router();
const JWT_ACCESS_SECRET = process.env.JWT_SECRET || 'dev-access-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

if (process.env.NODE_ENV === 'production') {
  if (JWT_ACCESS_SECRET === 'dev-access-secret') {
    console.warn('⚠️ WARNING: Using default JWT_SECRET in production!');
  }
  if (JWT_REFRESH_SECRET === 'dev-refresh-secret') {
    console.warn('⚠️ WARNING: Using default JWT_REFRESH_SECRET in production!');
  }
}

// Rate limiter for login/refresh: 5 attempts per 15 mins
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Slightly more for refresh retries
  message: { error: 'Too many authentication attempts, please try again after 15 minutes' },
});

// Helper to generate tokens
const generateAccessToken = (user: any) => {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_ACCESS_SECRET, {
    expiresIn: '15m',
  });
};

const generateRefreshToken = (user: any) => {
  return jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
};

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const pool = getApiPool();
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];

    if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Update last_active
    await pool.query('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Set Refresh Token in Secure Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh', // Only send to refresh endpoint
    });

    // Return access token and sanitized user info
    const { password_hash: _hash, ...userInfo } = user;
    res.json({
      success: true,
      accessToken,
      user: userInfo,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', authLimiter, async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token missing' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    const pool = getApiPool();
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Optional: Implement refresh token rotation here by issuing a new refreshToken as well

    const accessToken = generateAccessToken(user);
    res.json({ success: true, accessToken });
  } catch (_error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth/refresh',
  });
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', optionalAuthenticate, (req: any, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  const { password_hash: _hash, ...userInfo } = req.user;
  res.json({ user: userInfo });
});

// POST /api/auth/change-password
router.post('/change-password', authenticateRequest, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const pool = getApiPool();
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];

    if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const newHash = bcrypt.hashSync(newPassword, 12); // Slightly higher rounds for prod
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ success: true });
  } catch (e) {
    console.error('Password change error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
