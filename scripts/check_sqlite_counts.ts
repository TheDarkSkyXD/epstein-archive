import sqlite3 from 'sqlite3';
import { promisify } from 'util';

async function checkSQLite() {
  const db = new sqlite3.Database('epstein-archive.db');
  const get = promisify(db.get.bind(db));
  const all = promisify(db.all.bind(db));

  try {
    console.log('--- SQLite Table Row Counts ---');
    const tables = [
      'entities',
      'documents',
      'flights',
      'flight_passengers',
      'palm_beach_properties',
      'media_items',
      'black_book_entries',
    ];

    for (const table of tables) {
      try {
        const res = await get(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`${table.padEnd(25)}: ${res.count}`);
      } catch (err) {
        console.log(`${table.padEnd(25)}: [MISSING TABLE]`);
      }
    }

    console.log('\n--- Evidence Types in SQLite ---');
    try {
      const res = await all(
        'SELECT evidence_type, COUNT(*) as count FROM documents GROUP BY evidence_type',
      );
      res.forEach((r) => console.log(`  - ${String(r.evidence_type).padEnd(15)}: ${r.count}`));
    } catch (err) {
      console.log('Error checking sub-types in SQLite');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    db.close();
  }
}

checkSQLite();
