/**
 * DENORMALIZATION SYNC INVARIANT CHECK
 *
 * Verifies that denormalized columns in entity_mentions match documents
 * Fails if ANY mismatches found
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'epstein-archive.db');

interface Mismatch {
  mention_id: number;
  document_id: number;
  em_rating: number | null;
  d_rating: number | null;
  em_date: string | null;
  d_date: string | null;
}

export function checkDenormSync(db?: Database.Database): {
  passed: boolean;
  mismatches: number;
  message: string;
} {
  const shouldClose = !db;
  if (!db) {
    db = new Database(DB_PATH);
  }

  try {
    // Find mismatches
    const mismatches = db!
      .prepare(
        `
      SELECT 
        em.id as mention_id,
        em.document_id,
        em.doc_red_flag_rating as em_rating,
        d.red_flag_rating as d_rating,
        em.doc_date_created as em_date,
        d.date_created as d_date
      FROM entity_mentions em
      JOIN documents d ON em.document_id = d.id
      WHERE 
        (em.doc_red_flag_rating IS NOT d.red_flag_rating)
        OR (em.doc_date_created IS NOT d.date_created)
      LIMIT 100
    `,
      )
      .all() as Mismatch[];

    const passed = mismatches.length === 0;
    const message = passed
      ? 'All denormalized columns in sync'
      : `${mismatches.length} mismatches found`;

    return { passed, mismatches: mismatches.length, message };
  } finally {
    if (shouldClose) {
      db!.close();
    }
  }
}

function main(): void {
  console.log('🔍 DENORMALIZATION SYNC INVARIANT CHECK\n');

  const db = new Database(DB_PATH);
  const result = checkDenormSync(db);

  console.log('='.repeat(80));
  if (result.passed) {
    console.log('✅ PASS: ' + result.message);
  } else {
    console.log('❌ FAIL: ' + result.message);

    // Show sample mismatches
    const samples = db
      .prepare(
        `
      SELECT \n        em.id as mention_id,
        em.document_id,
        em.doc_red_flag_rating as em_rating,
        d.red_flag_rating as d_rating,
        em.doc_date_created as em_date,
        d.date_created as d_date
      FROM entity_mentions em
      JOIN documents d ON em.document_id = d.id
      WHERE 
        (em.doc_red_flag_rating IS NOT d.red_flag_rating)
        OR (em.doc_date_created IS NOT d.date_created)
      LIMIT 10
    `,
      )
      .all() as Mismatch[];

    console.log('\nSample mismatches:');
    samples.forEach((m) => {
      console.log(`  Mention ${m.mention_id} (doc ${m.document_id}):`);
      if (m.em_rating !== m.d_rating) {
        console.log(`    Rating: ${m.em_rating} → ${m.d_rating}`);
      }
      if (m.em_date !== m.d_date) {
        console.log(`    Date: ${m.em_date} → ${m.d_date}`);
      }
    });

    console.log('\nRun repair script: npx tsx scripts/repair_denormalized_mentions.ts');
  }
  console.log('='.repeat(80));

  db.close();

  if (!result.passed) {
    process.exit(1);
  }
}

// ES module compatible main check
const isMain = import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  main();
}
