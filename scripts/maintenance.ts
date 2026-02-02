import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { statSync, existsSync } from 'fs';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';

async function main() {
  console.log('🧹 DATABASE MAINTENANCE ENGINE');
  console.log('================================');

  if (!existsSync(DB_PATH)) {
    console.error(`❌ Database not found at ${DB_PATH}`);
    process.exit(1);
  }

  const initialStats = statSync(DB_PATH);
  console.log(`📁 Target: ${DB_PATH}`);
  console.log(`📊 Initial Size: ${(initialStats.size / 1024 / 1024).toFixed(2)} MB`);

  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  try {
    // 1. Analysis
    console.log('\n🔍 Running Schema Analysis (ANALYZE)...');
    console.time('Analyze Duration');
    await db.run('ANALYZE');
    console.timeEnd('Analyze Duration');
    console.log('   ✅ Query planner statistics updated.');

    // 2. Vacuum (Reclaim Space)
    console.log('\n🌪️  Running Vacuum (Reclaim Space)...');
    console.log('   (This may take a while for large databases)');
    console.time('Vacuum Duration');
    // We use standard VACUUM.
    // WARN: This requires 2x disk space temporarily.
    // For "Safe" operation on low-disk servers, we might want to check available space first,
    // but for now we assume standard cloud env.
    await db.run('VACUUM');
    console.timeEnd('Vacuum Duration');

    // 3. Check Integrity
    console.log('\npw️  Verifying Integrity...');
    const integrity = await db.get('PRAGMA integrity_check');
    if (integrity.integrity_check === 'ok') {
      console.log('   ✅ Integrity Check: OK');
    } else {
      console.error(`   ❌ INTEGRITY ERROR: ${integrity.integrity_check}`);
      process.exit(1);
    }

    // 4. Report
    const finalStats = statSync(DB_PATH);
    const sizeDiff = initialStats.size - finalStats.size;
    console.log('\n================================');
    console.log(`📊 Final Size: ${(finalStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`💾 Reclaimed:  ${(sizeDiff / 1024 / 1024).toFixed(2)} MB`);

    if (sizeDiff > 0) {
      console.log('✅ Optimization Successful!');
    } else {
      console.log('✅ Database was already optimized.');
    }
  } catch (error) {
    console.error('❌ Maintenance Failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();
