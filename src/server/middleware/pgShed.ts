import { Request, Response, NextFunction } from 'express';
import { getApiPool } from '../db/connection.js';

const SATURATION_RATIO = 0.85; // shed when 85%+ of pool is occupied

export function pgSaturationShed(req: Request, res: Response, next: NextFunction) {
  // Only active in PG mode
  if (process.env.DB_DIALECT !== 'postgres') return next();

  let pool: ReturnType<typeof getApiPool> | null = null;
  try {
    pool = getApiPool();
  } catch {
    return next();
  }

  const occupied = pool.totalCount - pool.idleCount;
  const ratio = pool.totalCount > 0 ? occupied / 20 : 0; // 20 = max pool size

  // Also shed if there are queued waiters
  if (pool.waitingCount > 0 || ratio >= SATURATION_RATIO) {
    const retryAfter = pool.waitingCount > 5 ? '10' : '5';
    console.warn(
      `[PG SHED] Pool saturated: occupied=${occupied}, waiting=${pool.waitingCount}, ratio=${ratio.toFixed(2)}`,
    );
    res.set('Retry-After', retryAfter);
    res.set('X-PG-Pool-Waiting', String(pool.waitingCount));
    return res.status(503).json({
      error: 'Database pool saturated. Please retry shortly.',
      retryAfter: parseInt(retryAfter),
    });
  }

  next();
}
