import express from 'express';
import { getDb } from '../db/connection.js';
import { mapRateLimiter } from '../middleware/rateLimit.js';
import { cacheResponse } from '../utils/perfCache.js';

const router = express.Router();

// GET /api/map/entities
// Returns top 500 entities with valid coordinates
router.get('/entities', mapRateLimiter, cacheResponse(60), async (req, res) => {
  try {
    const db = getDb();
    const limit = 500;

    // Filter params
    const minRisk = parseInt(req.query.minRisk as string) || 0;

    // Query:
    // 1. Must have valid coordinates (lat/lng != 0 and NOT NULL)
    // 2. Sort by Mentions DESC, Risk DESC
    // 3. Limit 500 for performance

    const query = `
      SELECT 
        id, 
        COALESCE(title, full_name) as label, 
        location_lat as lat, 
        location_lng as lng,
        mentions,
        COALESCE(risk_level, 'LOW') as "risk_level",
        COALESCE(red_flag_rating, 0) as "risk_score",
        COALESCE(entity_type, 'Person') as type
      FROM entities 
      WHERE 
        location_lat IS NOT NULL 
        AND location_lng IS NOT NULL 
        AND location_lat BETWEEN -90 AND 90 
        AND location_lng BETWEEN -180 AND 180
        AND COALESCE(junk_tier, 'clean') = 'clean'
        AND COALESCE(quarantine_status, 0) = 0
        AND COALESCE(red_flag_rating, 0) >= ?
      ORDER BY mentions DESC, red_flag_rating DESC
      LIMIT ?
    `;

    const entities = await db.prepare(query).all(minRisk, limit);

    // Add debug headers
    res.set('X-Map-Debug-Count', entities.length.toString());

    res.json(entities);
  } catch (error) {
    console.error('Error fetching map entities:', error);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

export default router;
