import 'dotenv/config';
import { getDb } from '../src/server/db/connection.js';
import { VIP_RULES } from './filters/vipRules.js';
import { resolveVip } from './filters/vipRules.js';

function backfillVipFlags(): void {
  const db = getDb();
  const canonicalNames = Array.from(new Set(VIP_RULES.map((rule) => rule.canonicalName.trim())));
  const ruleByCanonical = new Map(VIP_RULES.map((rule) => [rule.canonicalName, rule]));

  const hasVipColumn = (
    db.prepare(`PRAGMA table_info(entities)`).all() as Array<{ name: string }>
  ).some((c) => c.name === 'is_vip');

  if (!hasVipColumn) {
    throw new Error(
      'entities.is_vip column not found. Run migrations before backfilling VIP flags.',
    );
  }

  const clearStmt = db.prepare(`UPDATE entities SET is_vip = 0 WHERE is_vip != 0`);
  const markByIdStmt = db.prepare(`UPDATE entities SET is_vip = 1 WHERE id = ?`);
  const updateMetadataStmt = db.prepare(
    `
      UPDATE entities
      SET
        entity_category = COALESCE(entity_category, @category),
        risk_level = COALESCE(risk_level, @risk_level),
        red_flag_rating = CASE
          WHEN red_flag_rating IS NULL OR red_flag_rating < @red_flag_rating THEN @red_flag_rating
          ELSE red_flag_rating
        END,
        birth_date = COALESCE(birth_date, @birth_date),
        death_date = COALESCE(death_date, @death_date),
        notes = COALESCE(notes, @notes),
        bio = COALESCE(bio, @bio)
      WHERE id = @id
    `,
  );
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM entities WHERE is_vip = 1`);
  const entities = db
    .prepare(
      `SELECT id, full_name FROM entities WHERE full_name IS NOT NULL AND trim(full_name) != ''`,
    )
    .all() as Array<{ id: number; full_name: string }>;

  const tx = db.transaction(() => {
    clearStmt.run();
    for (const entity of entities) {
      const canonical = resolveVip(entity.full_name);
      if (!canonical) continue;

      markByIdStmt.run(entity.id);
      const rule = ruleByCanonical.get(canonical);
      if (!rule) continue;

      const riskLevel = rule.metadata?.riskLevel || null;
      const redFlagRating = riskLevel === 'high' ? 5 : riskLevel === 'medium' ? 4 : 3;

      updateMetadataStmt.run({
        id: entity.id,
        category: rule.metadata?.category || null,
        risk_level: riskLevel,
        red_flag_rating: redFlagRating,
        birth_date: rule.metadata?.birthDate || null,
        death_date: rule.metadata?.deathDate || null,
        notes: rule.metadata?.notes || null,
        bio: rule.metadata?.bio || null,
      });
    }
  });

  tx();

  const vipCount = (countStmt.get() as { count: number }).count;
  console.log(
    `VIP backfill complete. Canonical names: ${canonicalNames.length}. Marked VIP rows: ${vipCount}.`,
  );
}

backfillVipFlags();
