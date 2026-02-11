import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

const CONTACT_PATTERNS = {
  email:
    /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/g,
  phone: /(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})/g,
};

function normalizeName(name: string): string {
  return name
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^['"]|['"]$/g, '')
    .replace(/[.,;:]$/g, '')
    .trim();
}

/**
 * Backfill Enrichment Script
 * Links existing entries and harvests new ones on production.
 */
async function runBackfill() {
  console.log('🚀 Starting Production Backfill Enrichment...');

  // 1. Mark existing entries as 'original' and ensure person_id linkage
  console.log('🔗 Linking existing Black Book entries to Entities...');
  const entries = db
    .prepare(
      'SELECT id, entry_text FROM black_book_entries WHERE entry_category = "original" OR entry_category IS NULL',
    )
    .all() as any[];

  const entities = db.prepare('SELECT id, full_name, aliases FROM entities').all() as any[];
  const entityMap = new Map<string, number>();
  entities.forEach((e) => {
    entityMap.set(normalizeName(e.full_name).toLowerCase(), e.id);
    if (e.aliases) {
      e.aliases
        .split(',')
        .forEach((a: string) => entityMap.set(normalizeName(a).toLowerCase(), e.id));
    }
  });

  let linkedCount = 0;
  for (const entry of entries) {
    // Try to extract a name from entry_text (usually "Name: Info" or similar)
    const namePart = entry.entry_text.split(/[:(]/)[0].trim();
    const entityId = entityMap.get(normalizeName(namePart).toLowerCase());

    db.prepare(
      'UPDATE black_book_entries SET person_id = ?, entry_category = "original" WHERE id = ?',
    ).run(entityId || null, entry.id);
    if (entityId) linkedCount++;
  }
  console.log(`✅ Linked ${linkedCount}/${entries.length} existing entries.`);

  // 2. Harvesting Pass on established document sources
  console.log('🌾 Harvesting fresh intelligence from document contexts...');
  const docsWithMentions = db
    .prepare(
      `
    SELECT DISTINCT d.id, d.file_name, d.content 
    FROM documents d
    JOIN black_book_entries b ON d.id = b.document_id
    WHERE d.content IS NOT NULL
  `,
    )
    .all() as any[];

  console.log(`📊 Processing ${docsWithMentions.length} core source documents...`);

  for (const doc of docsWithMentions) {
    const content = doc.content;
    // Simple heuristic: find Person entities in these docs and look for trailing contact info
    const docEntities = db
      .prepare(
        `
      SELECT DISTINCT e.id, e.full_name
      FROM entities e
      JOIN entity_mentions m ON e.id = m.entity_id
      WHERE m.document_id = ? AND e.entity_type = 'Person'
    `,
      )
      .all(doc.id) as any[];

    for (const entity of docEntities) {
      const nameRegex = new RegExp(entity.full_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      let match;
      while ((match = nameRegex.exec(content)) !== null) {
        const window = content.substring(match.index, match.index + 200);
        const emails = [...window.matchAll(CONTACT_PATTERNS.email)];
        const phones = [...window.matchAll(CONTACT_PATTERNS.phone)];

        for (const emailMatch of emails) {
          const email = emailMatch[0];
          db.prepare(
            `
            INSERT OR IGNORE INTO black_book_entries (person_id, entry_text, entry_category, document_id, notes)
            VALUES (?, ?, 'contact', ?, ?)
          `,
          ).run(
            entity.id,
            `⭐ ${entity.full_name} (Contact): ${email}`,
            doc.id,
            `[HARVESTED] via Backfill Enrichment from ${doc.file_name}`,
          );
        }

        for (const phoneMatch of phones) {
          const phone = phoneMatch[0];
          db.prepare(
            `
            INSERT OR IGNORE INTO black_book_entries (person_id, entry_text, entry_category, document_id, notes)
            VALUES (?, ?, 'contact', ?, ?)
          `,
          ).run(
            entity.id,
            `⭐ ${entity.full_name} (Contact): ${phone}`,
            doc.id,
            `[HARVESTED] via Backfill Enrichment from ${doc.file_name}`,
          );
        }
      }
    }
  }

  console.log('✨ Backfill Enrichment Finished.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBackfill().catch(console.error);
}
