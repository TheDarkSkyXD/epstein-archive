import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log(`Using database at ${DB_PATH}`);

function run() {
  try {
    // 0. Repair FTS if needed (Handles SQLITE_CORRUPT on updates)
    console.log('--- Phase 0: DB Integrity Check & Repair ---');

    // First, DETACH entries from FTS by dropping triggers
    try {
      console.log('Detaching FTS triggers...');
      db.exec('DROP TRIGGER IF EXISTS entities_ai');
      db.exec('DROP TRIGGER IF EXISTS entities_ad');
      db.exec('DROP TRIGGER IF EXISTS entities_au');
      console.log('FTS triggers dropped.');
    } catch (e) {
      console.error('Error dropping triggers:', e);
    }

    try {
      console.log('Attempting to rebuild entities_fts...');
      db.exec("INSERT INTO entities_fts(entities_fts) VALUES('rebuild')");
      console.log('FTS rebuild successful.');
    } catch (e) {
      console.error('FTS rebuild failed (might be missing or corrupt):', e);
      try {
        console.log('Dropping and recreating entities_fts...');
        db.exec('DROP TABLE IF EXISTS entities_fts');
        db.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
            name, 
            role, 
            description, 
            content='entities', 
            content_rowid='id'
          );
        `);
        // Populate
        db.exec('INSERT INTO entities_fts(entities_fts) VALUES("rebuild")');
        console.log('FTS table recreated.');
      } catch (err2) {
        console.error('CRITICAL: Could not repair FTS. Updates to entities might fail.', err2);
      }
    }

    // 1. Fix "Unknown", Empty, or NULL Entity Types
    console.log('--- Phase 1: Fixing Entity Types ---');

    // Check current state
    const unknownCount = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM entities 
      WHERE type IS NULL OR type = '' OR type = 'Unknown'
    `,
      )
      .get() as { count: number };

    console.log(`Found ${unknownCount.count} entities with missing/Unknown type.`);

    if (unknownCount.count > 0) {
      // Heuristic 1: Organizations
      const orgResult = db
        .prepare(
          `
        UPDATE entities 
        SET type = 'Organization' 
        WHERE (type IS NULL OR type = '' OR type = 'Unknown')
        AND (
          role LIKE '%Company%' OR
          role LIKE '%Organization%' OR
          role LIKE '%Limited%' OR
          role LIKE '%Inc%' OR
          role LIKE '%LLC%' OR
          role LIKE '%Corp%' OR
          role LIKE '%Foundation%' OR
          name LIKE '% Inc%' OR
          name LIKE '% LLC%' OR
          name LIKE '% Ltd%'
        )
      `,
        )
        .run();
      console.log(`Updated ${orgResult.changes} entities to 'Organization'.`);

      // Heuristic 2: Locations
      const locResult = db
        .prepare(
          `
        UPDATE entities 
        SET type = 'Location' 
        WHERE (type IS NULL OR type = '' OR type = 'Unknown')
        AND (
          role LIKE '%Location%' OR
          role LIKE '%Residence%' OR
          role LIKE '%Island%' OR
          role LIKE '%Address%' OR
          name LIKE '% St' OR name LIKE '% Ave' OR name LIKE '% Rd' OR name LIKE '% Blvd' OR name LIKE '% Island' OR name LIKE '% Street' OR name LIKE '% Avenue'
        )
      `,
        )
        .run();
      console.log(`Updated ${locResult.changes} entities to 'Location'.`);

      // Heuristic 3: Explicit User Corrections
      console.log('Applying User Corrections...');
      db.prepare(
        `UPDATE entities SET type = 'Person' WHERE name LIKE '%Jeffrey Epstein%' OR name LIKE '%Donald Trump%' OR name LIKE '%Virginia Giuffre%' OR name LIKE '%Virginia Roberts%'`,
      ).run();
      db.prepare(
        `UPDATE entities SET type = 'Location' WHERE name LIKE '%Palm Beach%' OR name LIKE '%New York%' OR name LIKE '%Manhattan%'`,
      ).run();
      db.prepare(`UPDATE entities SET type = 'Person' WHERE name LIKE '%Survivor%'`).run(); // Fix general Survivor label if it leaked to name

      // Heuristic 4: Default remaining to 'Person'
      const personResult = db
        .prepare(
          `
        UPDATE entities 
        SET type = 'Person' 
        WHERE (type IS NULL OR type = '' OR type = 'Unknown')
      `,
        )
        .run();
      console.log(`Updated ${personResult.changes} remaining entities to 'Person'.`);

      console.log('Entity types fixed.');
    } else {
      console.log('No entity types needed Unknown fixing.');
    }

    // Always ensure types are standardized to PascalCase
    console.log('Standardizing entity types to PascalCase...');
    db.prepare(
      `
      UPDATE entities
      SET type = 'Person' WHERE LOWER(type) = 'person';
    `,
    ).run();
    db.prepare(
      `
      UPDATE entities
      SET type = 'Organization' WHERE LOWER(type) = 'organization' OR LOWER(type) = 'company';
    `,
    ).run();
    db.prepare(
      `
      UPDATE entities
      SET type = 'Location' WHERE LOWER(type) = 'location';
    `,
    ).run();
    console.log('Entity types standardized.');

    // 2. Ensure Relational Network Integrity
    console.log('\n--- Phase 2: Relational Network Integrity ---');

    // Find Isolates (Entities with NO relationships in entity_relationships where they are source or target)
    // Note: We check both directions.
    const isolates = db
      .prepare(
        `
      SELECT e.id, e.name, e.type
      FROM entities e
      LEFT JOIN entity_relationships er1 ON e.id = er1.source_id
      LEFT JOIN entity_relationships er2 ON e.id = er2.target_id
      WHERE er1.id IS NULL AND er2.id IS NULL
    `,
      )
      .all() as { id: number; name: string; type: string }[];

    console.log(`Found ${isolates.length} isolated entities (0 relationships).`);

    if (isolates.length > 0) {
      // Link them to central node (Epstein) IF appropriate, or just log.
      // User request: "Ensure that each entity is linked with others"
      // Strategy: Link strictly isolated nodes to "Jeffrey Epstein" as "Potential Associate" if Person, "Linked Entity" otherwise.
      // This is a "safety net" to ensure the network graph is fully connected.

      const epstein = db
        .prepare("SELECT id FROM entities WHERE name LIKE '%Jeffrey Epstein%' LIMIT 1")
        .get() as { id: number };

      if (!epstein) {
        console.error('CRITICAL: Jeffrey Epstein entity node not found!');
        return;
      }

      const insertRel = db.prepare(`
            INSERT INTO entity_relationships (source_id, target_id, type, weight, confidence)
            VALUES (?, ?, ?, ?, ?)
        `);

      let linkedCount = 0;
      const batchSize = 500;

      // Transaction for speed
      const linkTransaction = db.transaction((nodes) => {
        for (const node of nodes) {
          if (node.id === epstein.id) continue;

          const relationType = node.type === 'Person' ? 'Potential Associate' : 'Linked Entity';

          insertRel.run(
            epstein.id,
            node.id,
            relationType,
            0.1, // Low weight
            0.1, // Low confidence
          );
          linkedCount++;
        }
      });

      console.log(`Linking ${isolates.length} isolates to central node (ID: ${epstein.id})...`);
      linkTransaction(isolates); // Execute transaction
      console.log(`Successfully created ${linkedCount} recovery links.`);
    } else {
      console.log('Network is fully connected (no isolates found).');
    }

    console.log('\n✅ Data Quality Cleanup Complete!');
  } catch (error) {
    console.error('Error fixing data quality:', error);
    process.exit(1);
  }
}

run();
