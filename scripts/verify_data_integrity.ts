import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log('🛡️  Running Data Integrity Check...');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

try {
  // 1. Database Integrity
  const integrityQuery = db.prepare('PRAGMA integrity_check').get() as any;
  assert(integrityQuery['integrity_check'] === 'ok', 'SQLite Integrity Check');

  // 2. Schema Verification (Key columns)
  const columns = db.prepare('PRAGMA table_info(entities)').all() as any[];
  const colNames = columns.map((c) => c.name);
  assert(colNames.includes('aliases'), 'Schema: aliases column exists');
  assert(colNames.includes('entity_type'), 'Schema: entity_type column exists');
  assert(colNames.includes('risk_factor'), 'Schema: risk_factor column exists');

  // 3. Entity Quantity
  const entityCount = db.prepare('SELECT COUNT(*) as count FROM entities').get() as {
    count: number;
  };
  assert(entityCount.count > 40000, `Entity Count: ${entityCount.count} (> 40k)`);

  // 4. Critical Entity Presence
  const keyEntities = [
    'Jeffrey Epstein',
    'Ghislaine Maxwell',
    'Virginia Giuffre',
    'Jean-Luc Brunel',
  ];
  for (const name of keyEntities) {
    const entity = db
      .prepare('SELECT id, aliases FROM entities WHERE full_name = ?')
      .get(name) as any;
    assert(!!entity, `Critical Entity: ${name} exists`);
    if (entity) {
      assert(!!entity.aliases && entity.aliases.length > 5, `Aliases for ${name} are populated`);
    }
  }

  // 5. Relationship Health
  const relCount = db.prepare('SELECT COUNT(*) as count FROM entity_relationships').get() as {
    count: number;
  };
  assert(relCount.count > 0, `Relationships: ${relCount.count} records exist`);

  console.log('\n🌟 DATA INTEGRITY VERIFIED - ALL SYSTEMS NOMINAL 🌟');
  db.close();
} catch (error: any) {
  console.error('🛑 CRITICAL ERROR DURING INTEGRITY CHECK:');
  console.error(error.message);
  process.exit(1);
}
