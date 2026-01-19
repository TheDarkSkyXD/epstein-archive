import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');

function main() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  const title = 'Sascha Barros Testimony';
  const description =
    'Investigation based on Sascha Barros testimony series; auto-linked supporting testimony audio and related documents.';

  // Create investigation if not exists
  let investigation = db
    .prepare(`SELECT id, uuid, title FROM investigations WHERE title = ?`)
    .get(title) as any;
  if (!investigation) {
    const res = db
      .prepare(
        `
      INSERT INTO investigations (title, description, owner_id, status, scope, created_at, updated_at)
      VALUES (?, ?, ?, 'open', 'Victim testimony: corroborate implicated actors and timelines', datetime('now'), datetime('now'))
    `,
      )
      .run(title, description, 'system');
    investigation = db
      .prepare(`SELECT id, uuid, title FROM investigations WHERE id = ?`)
      .get(res.lastInsertRowid) as any;
    console.log(`[INV] Created investigation ${investigation.id} (${investigation.uuid})`);
  } else {
    console.log(`[INV] Using existing investigation ${investigation.id} (${investigation.uuid})`);
  }

  const invId = investigation.id;

  // Link audio testimonies as evidence (type=testimony)
  const audioItems = db
    .prepare(
      `
    SELECT id, file_path, title, description 
    FROM media_items 
    WHERE file_type='audio' AND title LIKE '%Sascha%' 
    ORDER BY created_at ASC
  `,
    )
    .all() as any[];

  for (const item of audioItems) {
    const src = item.file_path || '';
    // Upsert evidence by source_path
    let ev = db.prepare(`SELECT id FROM evidence WHERE source_path = ?`).get(src) as any;
    if (!ev) {
      const ins = db
        .prepare(
          `
        INSERT INTO evidence (evidence_type, source_path, original_filename, title, description, created_at, ingested_at, red_flag_rating)
        VALUES ('testimony', ?, ?, ?, ?, datetime('now'), datetime('now'), 5)
      `,
        )
        .run(src, path.basename(src), item.title, item.description || '');
      ev = { id: Number(ins.lastInsertRowid) };
      console.log(`[EV] Created testimony evidence ${ev.id} from ${src}`);
    }
    // Link to investigation
    db.prepare(
      `
      INSERT OR IGNORE INTO investigation_evidence (investigation_id, evidence_id, relevance, added_at)
      VALUES (?, ?, 'high', datetime('now'))
    `,
    ).run(invId, ev.id);
  }

  // Link related documents mentioning 'Sascha' via simple LIKE search (top 20)
  const docs = db
    .prepare(
      `
    SELECT id, file_name, file_path, evidence_type, red_flag_rating 
    FROM documents 
    WHERE file_name LIKE '%Sascha%' OR content LIKE '%Sascha%' 
    ORDER BY red_flag_rating DESC, date_created DESC 
    LIMIT 20
  `,
    )
    .all() as any[];

  for (const d of docs) {
    const src = d.file_path || `doc:${d.id}`;
    let ev = db.prepare(`SELECT id FROM evidence WHERE source_path = ?`).get(src) as any;
    if (!ev) {
      const ins = db
        .prepare(
          `
        INSERT INTO evidence (evidence_type, source_path, original_filename, title, description, created_at, ingested_at, red_flag_rating)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), 3)
      `,
        )
        .run(
          d.evidence_type || 'investigative_report',
          src,
          path.basename(src),
          d.file_name || `Document ${d.id}`,
          '',
        );
      ev = { id: Number(ins.lastInsertRowid) };
      console.log(`[EV] Created doc evidence ${ev.id} from ${src}`);
    }
    db.prepare(
      `
      INSERT OR IGNORE INTO investigation_evidence (investigation_id, evidence_id, relevance, added_at)
      VALUES (?, ?, 'medium', datetime('now'))
    `,
    ).run(invId, ev.id);
  }

  console.log(`[DONE] Investigation ready: /investigations/${investigation.uuid}`);
}

main();
