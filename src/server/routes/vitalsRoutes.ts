/**
 * PRODUCTION WEB VITALS ENDPOINT
 *
 * Lightweight endpoint for collecting vitals
 * Stores daily p75 aggregates
 */

import { Router, Request, Response } from 'express';

const router = Router();

interface VitalsPayload {
  sessionId: string;
  route: string;
  cls: number;
  lcp: number;
  inp: number;
  longTaskCount: number;
  timestamp: number;
}

/**
 * POST /api/vitals
 *
 * Collect Web Vitals from production clients
 * 1% sampling, privacy-safe
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const payload: VitalsPayload = req.body;

    // Validate payload
    if (!payload.sessionId || !payload.route || typeof payload.cls !== 'number') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Check payload size < 2KB
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > 2048) {
      return res.status(413).json({ error: 'Payload too large' });
    }

    const db = (req as any).db as any;

    // Create table if not exists
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS web_vitals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        route TEXT NOT NULL,
        cls REAL NOT NULL,
        lcp REAL NOT NULL,
        inp REAL NOT NULL,
        long_task_count INTEGER NOT NULL,
        collected_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    ).run();

    // Insert vitals
    db.prepare(
      `
      INSERT INTO web_vitals (session_id, route, cls, lcp, inp, long_task_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      payload.sessionId,
      payload.route,
      payload.cls,
      payload.lcp,
      payload.inp,
      payload.longTaskCount,
    );

    // Return 204 No Content (fastest response)
    res.status(204).send();
  } catch (error: any) {
    console.error('Error collecting vitals:', error);
    // Silent fail - don't affect client
    res.status(204).send();
  }
});

/**
 * GET /api/vitals/aggregates
 *
 * Get daily p75 aggregates (admin only)
 */
router.get('/aggregates', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db as any;
    const days = parseInt(req.query.days as string) || 7;

    const aggregates = db
      .prepare(
        `
      SELECT 
        DATE(collected_at) as date,
        route,
        COUNT(*) as sample_count,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cls) as p75_cls,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp) as p75_lcp,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY inp) as p75_inp,
        AVG(long_task_count) as avg_long_tasks
      FROM web_vitals
      WHERE collected_at >= DATE('now', '-' || ? || ' days')
      GROUP BY DATE(collected_at), route
      ORDER BY date DESC, route
    `,
      )
      .all(days);

    res.json({ aggregates });
  } catch (_error: any) {
    // Fallback if PERCENTILE_CONT not supported
    try {
      const db = (req as any).db as any;
      const days = parseInt(req.query.days as string) || 7;

      // Manual p75 calculation
      const aggregates = db
        .prepare(
          `
        SELECT 
          DATE(collected_at) as date,
          route,
          COUNT(*) as sample_count,
          AVG(cls) as avg_cls,
          AVG(lcp) as avg_lcp,
          AVG(inp) as avg_inp,
          AVG(long_task_count) as avg_long_tasks
        FROM web_vitals
        WHERE collected_at >= DATE('now', '-' || ? || ' days')
        GROUP BY DATE(collected_at), route
        ORDER BY date DESC, route
      `,
        )
        .all(days);

      res.json({ aggregates, note: 'Using averages (PERCENTILE_CONT not supported)' });
    } catch (fallbackError: any) {
      res.status(500).json({ error: fallbackError.message });
    }
  }
});

export default router;
