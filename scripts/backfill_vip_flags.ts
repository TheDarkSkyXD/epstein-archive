import 'dotenv/config';
import { getDb } from '../src/server/db/connection.js';
import { VIP_RULES } from './filters/vipRules.js';

function backfillVipFlags(): void {
  const db = getDb();
  const canonicalNames = Array.from(new Set(VIP_RULES.map((rule) => rule.canonicalName.trim())));

  const hasVipColumn = (
    db.prepare(`PRAGMA table_info(entities)`).all() as Array<{ name: string }>
  ).some((c) => c.name === 'is_vip');

  if (!hasVipColumn) {
    throw new Error(
      'entities.is_vip column not found. Run migrations before backfilling VIP flags.',
    );
  }

  const placeholders = canonicalNames.map(() => '?').join(',');
  const clearStmt = db.prepare(`UPDATE entities SET is_vip = 0 WHERE is_vip != 0`);
  const markStmt = db.prepare(
    `UPDATE entities SET is_vip = 1 WHERE lower(trim(full_name)) IN (${placeholders})`,
  );
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM entities WHERE is_vip = 1`);

  const tx = db.transaction(() => {
    clearStmt.run();
    markStmt.run(...canonicalNames.map((name) => name.toLowerCase()));
  });

  tx();

  const vipCount = (countStmt.get() as { count: number }).count;
  console.log(
    `VIP backfill complete. Canonical names: ${canonicalNames.length}. Marked VIP rows: ${vipCount}.`,
  );
}

backfillVipFlags();
