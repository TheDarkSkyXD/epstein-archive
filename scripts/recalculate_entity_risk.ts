import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';

// High-risk anchors for network scoring
const HIGH_RISK_ANCHORS = [
  'Jeffrey Epstein',
  'Ghislaine Maxwell',
  'Jean-Luc Brunel',
  'Prince Andrew',
  'Sarah Kellen',
  'Nadia Marcinkova',
];

// Codewords that trigger high risk
const CODEWORDS = ['Hotdog', 'Pizza', 'Cheese', 'Pasta', 'Ice Cream', 'Walnut', 'Map', 'Sauce'];

export async function recalculateRisk() {
  const db = new Database(DB_PATH);
  console.log('⚖️ Initializing Dynamic Risk Calculation Engine...');

  // 1. Get high-risk anchor IDs
  const anchors = db
    .prepare(
      `
    SELECT id FROM entities WHERE full_name IN (${HIGH_RISK_ANCHORS.map(() => '?').join(',')})
  `,
    )
    .all(...HIGH_RISK_ANCHORS) as { id: number }[];
  const anchorIds = anchors.map((a) => a.id);

  // 2. Fetch all entities with necessary stats
  const entities = db
    .prepare(
      `
    SELECT 
      e.id, 
      e.full_name, 
      e.mentions,
      e.is_vip,
      (SELECT COUNT(*) FROM media_item_people WHERE entity_id = e.id) as media_count,
      (SELECT AVG(significance_score) FROM entity_mentions WHERE entity_id = e.id) as avg_significance
    FROM entities e
    WHERE e.mentions > 0 OR e.is_vip = 1
  `,
    )
    .all() as any[];

  console.log(`📊 Processing risk profiles for ${entities.length} entities...`);

  const updateStmt = db.prepare(`
    UPDATE entities 
    SET red_flag_rating = ?, 
        risk_level = ?, 
        red_flag_description = ? 
    WHERE id = ?
  `);

  const tx = db.transaction(() => {
    for (const entity of entities) {
      let score = 0;
      const reasons: string[] = [];

      // A. Mentions (Log-scaled exposure)
      if (entity.mentions > 0) {
        const mentionScore = Math.log10(entity.mentions + 1) * 3;
        score += mentionScore;
        if (mentionScore > 5) reasons.push(`High exposure (${entity.mentions} mentions)`);
      }

      // B. Network Risk (Connections to anchors)
      const relations = db
        .prepare(
          `
        SELECT COUNT(*) as count, SUM(strength) as total_strength
        FROM entity_relationships
        WHERE (source_entity_id = ? AND target_entity_id IN (${anchorIds.join(',')}))
           OR (target_entity_id = ? AND source_entity_id IN (${anchorIds.join(',')}))
      `,
        )
        .get(entity.id, entity.id) as { count: number; total_strength: number };

      if (relations.count > 0) {
        const networkScore = Math.min(
          10,
          relations.count * 2 + (relations.total_strength || 0) / 10,
        );
        score += networkScore;
        reasons.push(`Direct network link to high-risk figures (${relations.count} connections)`);
      }

      // C. Media Bonus
      if (entity.media_count > 0) {
        score += Math.min(5, entity.media_count * 1.5);
        reasons.push(`Associated visual evidence (${entity.media_count} items)`);
      }

      // D. Codeword Penalty
      const codewordMentions = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM entity_mentions 
        WHERE entity_id = ? AND keyword IN (${CODEWORDS.map(() => '?').join(',')})
      `,
        )
        .get(entity.id, ...CODEWORDS) as { count: number };

      if (codewordMentions.count > 0) {
        score += 8;
        reasons.push(`Mentioned in context with sensitive codewords`);
      }

      // E. Significance boost
      if (entity.avg_significance > 2) {
        score += 3;
      }

      // Mapping Score -> Level (1-5)
      let rating = 1;
      let level: 'low' | 'medium' | 'high' = 'low';

      if (score > 20) {
        rating = 5;
        level = 'high';
      } else if (score > 12) {
        rating = 4;
        level = 'high';
      } else if (score > 7) {
        rating = 3;
        level = 'medium';
      } else if (score > 3) {
        rating = 2;
        level = 'medium';
      } else {
        rating = 1;
        level = 'low';
      }

      // Preserve VIP ratings if they are higher
      const currentRating = db
        .prepare('SELECT red_flag_rating FROM entities WHERE id = ?')
        .get(entity.id) as any;
      if (entity.is_vip && currentRating?.red_flag_rating > rating) {
        rating = currentRating.red_flag_rating;
        if (rating >= 4) level = 'high';
        else if (rating >= 2) level = 'medium';
        else level = 'low';
      }

      const description =
        reasons.length > 0
          ? `Signal Analysis: ${reasons.join('; ')}.`
          : 'Baseline exposure detected.';

      updateStmt.run(rating, level, description, entity.id);
    }
  });

  tx();
  console.log('✅ Risk profiles updated successfully.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  recalculateRisk().catch(console.error);
}
