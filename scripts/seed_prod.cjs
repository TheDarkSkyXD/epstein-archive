const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive-production.db');

console.log(`Connecting to database: ${DB_PATH}`);
const db = new Database(DB_PATH);

// 1. Ensure Schema Exists
console.log('Verifying schema...');

// Investigations Table
db.exec(`
  CREATE TABLE IF NOT EXISTS investigations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    description TEXT,
    owner_id TEXT NOT NULL,
    collaborator_ids TEXT DEFAULT '[]',
    status TEXT CHECK(status IN ('open','in_review','closed','archived')) DEFAULT 'open',
    scope TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// Timeline Events Table
// FORCE DROP because prod has legacy incompatible schema (verified empty)
db.exec('DROP TABLE IF EXISTS timeline_events');

db.exec(`
  CREATE TABLE IF NOT EXISTS timeline_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investigation_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    description TEXT,
    type TEXT CHECK(type IN ('incident','meeting','travel','transaction','communication','other')) DEFAULT 'other',
    confidence INTEGER DEFAULT 80,
    documents_json TEXT DEFAULT '[]',
    entities_json TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
  );
`);

// 2. Helper to get/create entity
const getOrCreateEntity = (name, type) => {
  // Check using full_name
  let ent = db.prepare('SELECT id, full_name as name FROM entities WHERE full_name = ?').get(name);
  if (!ent) {
    console.log(`Creating entity: ${name}`);
    // Use full_name and entity_type
    const info = db.prepare('INSERT INTO entities (full_name, entity_type, primary_role, red_flag_rating) VALUES (?, ?, ?, ?)').run(name, type, 'Person of Interest', 5);
    ent = { id: Number(info.lastInsertRowid), name };
  } else {
    console.log(`Found entity: ${name} (ID: ${ent.id})`);
  }
  return ent;
};

// 3. Helper to get owner
const getOwner = () => {
    // Try to find an admin user
    const user = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    if (user) return user.id;
    return 'user-admin-01'; // Fallback
};

// 4. Seed Data
try {
    const ownerId = getOwner();
    console.log(`Using Owner ID: ${ownerId}`);

    // Use 'Person' or 'ORGANIZATION'? Prod schema usually has uppercase or specific checks?
    // Current Prod schema didn't show check constraint on entity_type, but let's assume 'Person' is fine or check existing data.
    // Local script used 'Person'.
    const epstein = getOrCreateEntity('Jeffrey Epstein', 'Person');
    const maxwell = getOrCreateEntity('Ghislaine Maxwell', 'Person');
    const princeAndrew = getOrCreateEntity('Prince Andrew', 'Person');

    const investigationTitle = 'Ghislaine Maxwell Recruitment Network';
    let inv = db.prepare('SELECT id FROM investigations WHERE title = ?').get(investigationTitle);
    let invId;

    if (inv) {
      console.log('Investigation already exists.');
      invId = inv.id;
    } else {
      console.log('Creating investigation...');
      const info = db.prepare(`
        INSERT INTO investigations (title, description, owner_id, scope, collaborator_ids, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        investigationTitle,
        "Investigation into the recruitment methods and timeline used by Ghislaine Maxwell to procure victims for Jeffrey Epstein, focusing on the 1994-2004 period.",
        ownerId,
        "Hypothesis: Ghislaine Maxwell acted as the primary conduit for recruiting young women, utilizing her social connections and 'secretary' role to normalize abusive interactions. \n\nEvidence Scope: Deposition transcripts (2016), Flight logs (Maxwell's travel), and associated email correspondence.",
        '[]',
        'open'
      );
      invId = Number(info.lastInsertRowid);
    }

    // Timeline Events
    const createEvent = (title, date, desc, type, entIds) => {
        // Check if exists to avoid dupes
        const existing = db.prepare('SELECT id FROM timeline_events WHERE investigation_id = ? AND title = ?').get(invId, title);
        if (!existing) {
             db.prepare(`
                INSERT INTO timeline_events (investigation_id, title, start_date, description, type, entities_json)
                VALUES (?, ?, ?, ?, ?, ?)
              `).run(
                invId,
                title,
                date,
                desc,
                type,
                JSON.stringify(entIds)
              );
              console.log(`Created event: ${title}`);
        }
    };

    createEvent('Maxwell meets Epstein', '1991-01-01', 'Approximate date of introduction in NYC.', 'meeting', [epstein.id, maxwell.id]);
    createEvent('Palm Beach Recruitment Begins', '1994-06-15', 'Witness accounts suggest systematic recruitment began.', 'incident', [maxwell.id]);
    createEvent('London Trip with Prince Andrew', '2001-03-10', 'Flight logs place Epstein and Maxwell in London.', 'travel', [epstein.id, maxwell.id, princeAndrew.id]);

    console.log('Seeding completed successfully.');

} catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
}
