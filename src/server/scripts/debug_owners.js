
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Correct path to the root of the project
const dbPath = path.resolve(__dirname, '../../../epstein-archive.db');
console.log(`Connecting to database at: ${dbPath}`);
const db = new Database(dbPath);

function runQuery(label, query, params = []) {
  try {
    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    console.log(`\n--- ${label} ---`);
    console.log(`Row count: ${rows.length}`);
    if (rows.length > 0) {
      console.log('First 3 rows:', rows.slice(0, 3));
    } else {
        try {
             // Check if table exists
            const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='palm_beach_properties'").get();
            if (!tableCheck) {
                console.log("TABLE palm_beach_properties DOES NOT EXIST!");
            } else {
                const sample = db.prepare("SELECT owner_name_1, total_tax_value FROM palm_beach_properties LIMIT 5").all();
                console.log("Sample data from palm_beach_properties:", sample);
            }
        } catch (e) {
            console.log("Could not check table/fetch sample data:", e.message);
        }
    }
    return rows;
  } catch (err) {
    console.error(`Error running ${label}:`, err.message);
    return [];
  }
}

function debug() {
    // 1. Current Query
    runQuery('Current Query', `
      SELECT 
        COALESCE(owner_name_1, 'Unknown') as owner,
        COUNT(*) as propertyCount,
        SUM(total_tax_value) as totalValue
      FROM palm_beach_properties
      WHERE owner_name_1 IS NOT NULL AND owner_name_1 != '' AND owner_name_1 != 'Unknown'
      GROUP BY owner_name_1
      HAVING totalValue > 0
      ORDER BY totalValue DESC
      LIMIT 10
    `);

    // 2. Simple Count
    runQuery('Simple Count', `SELECT count(*) as count FROM palm_beach_properties`);
    
    // 3. Check for owner_name_1 values
    runQuery('Owner Name Check', `SELECT owner_name_1, count(*) as c FROM palm_beach_properties GROUP BY owner_name_1 ORDER BY c DESC LIMIT 10`);

     // 4. Check Known Associates Linkage
    runQuery('Known Associates Linkage', `
        SELECT id, owner_name_1, is_known_associate, linked_entity_id 
        FROM palm_beach_properties 
        WHERE is_known_associate = 1 OR linked_entity_id IS NOT NULL 
        LIMIT 10
    `);
}

debug();
