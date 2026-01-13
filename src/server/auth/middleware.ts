import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/connection.js';

// Extend Request locally to avoid global type conflicts for now
// Extend Request locally to avoid global type conflicts for now
export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    email?: string | null;
  };
}

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod-if-possible';

// Shared verification helper
const verifyToken = (req: Request): any | null => {
  let token: string | undefined;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const db = getDb();
    const user = db
      .prepare('SELECT id, username, role, email FROM users WHERE id = ?')
      .get(decoded.id) as any;
    return user || null;
  } catch (error) {
    return null;
  }
};

export const authenticateRequest = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;

  // Check if Auth is enabled
  const isAuthEnabled = true;

  if (!isAuthEnabled) {
    authReq.user = {
      id: 'dev-user',
      username: 'Developer',
      role: 'admin',
      email: 'dev@local.test',
    };
    return next();
  }

  const user = verifyToken(req);
  if (!user) {
    return res
      .status(401)
      .json({ error: 'Unauthorized', message: 'Missing or invalid authentication credentials' });
  }

  authReq.user = user;
  next();
};

export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  // Always try to verify, but don't error if it fails
  const user = verifyToken(req);
  if (user) {
    authReq.user = user;
  }
  next();
};

export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Admin has access to everything
    if (authReq.user.role === 'admin') {
      return next();
    }

    if (authReq.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Forbidden', message: `Requires ${requiredRole} role` });
    }

    next();
  };
};
