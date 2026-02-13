/**
 * REVISION TOKEN ENDPOINT
 *
 * Admin endpoint to get canonical revision token
 */

import { Router, Request, Response } from 'express';
import { getRevisionInfo } from '../revisionManager';

const router = Router();

/**
 * GET /api/admin/revision
 *
 * Get canonical dataset revision token
 */
router.get('/revision', async (req: Request, res: Response) => {
  try {
    const revisionInfo = getRevisionInfo();
    res.json(revisionInfo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
