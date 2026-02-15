/**
 * FINAL SHIP CHECKLIST
 *
 * Comprehensive validation suite that must PASS before deployment
 *
 * Run: npx tsx scripts/ship_checklist.ts
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'epstein-archive.db');

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
}

const results: CheckResult[] = [];

function runCheck(name: string, fn: () => boolean | { passed: boolean; message: string }): void {
  console.log(`\n🔍 ${name}...`);
  const start = Date.now();

  try {
    const result = fn();
    const passed = typeof result === 'boolean' ? result : result.passed;
    const message = typeof result === 'boolean' ? (passed ? 'OK' : 'Failed') : result.message;
    const duration = Date.now() - start;

    results.push({ name, passed, message, duration });

    if (passed) {
      console.log(`  ✅ ${message} (${duration}ms)`);
    } else {
      console.log(`  ❌ ${message} (${duration}ms)`);
    }
  } catch (error: any) {
    const duration = Date.now() - start;
    results.push({ name, passed: false, message: error.message, duration });
    console.log(`  ❌ ${error.message} (${duration}ms)`);
  }
}

function main(): void {
  console.log('🚀 FINAL SHIP CHECKLIST\n');
  console.log('='.repeat(80));

  // 1. TypeScript compilation
  runCheck('TypeScript compilation (tsc --noEmit)', () => {
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe', cwd: join(__dirname, '..') });
      return true;
    } catch (error) {
      return { passed: false, message: 'TypeScript errors detected' };
    }
  });

  // 2. ESLint warnings
  runCheck('ESLint warnings = 0', () => {
    try {
      const output = execSync('npx eslint src --max-warnings 0', {
        stdio: 'pipe',
        cwd: join(__dirname, '..'),
        encoding: 'utf-8',
      });
      return true;
    } catch (error: any) {
      const warnings = error.stdout?.match(/(\d+) warning/);
      const warningCount = warnings ? warnings[1] : 'unknown';
      return { passed: false, message: `${warningCount} ESLint warnings` };
    }
  });

  // 3. Hot path validation (zero temp B-trees)
  runCheck('Design token compliance (enforced surfaces)', () => {
    try {
      execSync('npx tsx scripts/token_compliance.ts', {
        stdio: 'pipe',
        cwd: join(__dirname, '..'),
      });
      return { passed: true, message: 'Token compliance passed' };
    } catch (_error) {
      return { passed: false, message: 'Token compliance violations detected' };
    }
  });

  // 4. Hot path validation (zero temp B-trees)
  runCheck('Hot paths: zero temp B-trees', () => {
    const db = new Database(DB_PATH);

    const queries = [
      {
        name: 'Homepage Top 250',
        sql: `SELECT id FROM entities WHERE is_vip = 1 ORDER BY mentions DESC LIMIT 250`,
      },
      {
        name: 'People List',
        sql: `SELECT id FROM entities ORDER BY red_flag_rating DESC LIMIT 24`,
      },
      {
        name: 'Entity Documents',
        sql: `SELECT d.id FROM documents d JOIN entity_mentions em ON d.id = em.document_id WHERE em.entity_id = 1 ORDER BY em.doc_red_flag_rating DESC, em.doc_date_created DESC LIMIT 50`,
      },
      {
        name: 'Email Threads',
        sql: `SELECT id FROM documents WHERE type = 'email' ORDER BY date_created DESC LIMIT 500`,
      },
    ];

    let totalTempBtrees = 0;
    const failures: string[] = [];

    for (const query of queries) {
      const plan = db.prepare(`EXPLAIN QUERY PLAN ${query.sql}`).all();
      for (const step of plan as any[]) {
        if (step.detail.toUpperCase().includes('USE TEMP B-TREE')) {
          totalTempBtrees++;
          failures.push(query.name);
        }
      }
    }

    db.close();

    if (totalTempBtrees === 0) {
      return { passed: true, message: 'All hot paths optimized (0 temp B-trees)' };
    } else {
      return {
        passed: false,
        message: `${totalTempBtrees} temp B-trees in: ${failures.join(', ')}`,
      };
    }
  });

  // 5. Index coverage
  runCheck('Required indexes exist', () => {
    const db = new Database(DB_PATH);

    const requiredIndexes = [
      'idx_entities_vip_mentions_rating',
      'idx_entities_rating_mentions',
      'idx_documents_type_date',
      'idx_entity_mentions_entity_sorted',
    ];

    const missing: string[] = [];

    for (const indexName of requiredIndexes) {
      const exists = db
        .prepare(`SELECT 1 FROM sqlite_master WHERE type='index' AND name=?`)
        .get(indexName);

      if (!exists) {
        missing.push(indexName);
      }
    }

    db.close();

    if (missing.length === 0) {
      return { passed: true, message: `All ${requiredIndexes.length} required indexes exist` };
    } else {
      return { passed: false, message: `Missing indexes: ${missing.join(', ')}` };
    }
  });

  // 6. Denormalized columns backfilled
  runCheck('Denormalized columns backfilled', () => {
    const db = new Database(DB_PATH);

    const nullCount = db
      .prepare(
        `
      SELECT COUNT(*) as count 
      FROM entity_mentions 
      WHERE doc_red_flag_rating IS NULL OR doc_date_created IS NULL
    `,
      )
      .get() as { count: number };

    db.close();

    if (nullCount.count === 0) {
      return { passed: true, message: 'All rows backfilled' };
    } else {
      return { passed: false, message: `${nullCount.count.toLocaleString()} rows not backfilled` };
    }
  });

  // 7. Build succeeds
  runCheck('Production build succeeds', () => {
    try {
      execSync('npm run build', { stdio: 'pipe', cwd: join(__dirname, '..') });
      return { passed: true, message: 'Build successful' };
    } catch (error) {
      return { passed: false, message: 'Build failed' };
    }
  });

  // 8. Bundle size check
  runCheck('Bundle size < 500KB gzipped', () => {
    try {
      const fs = require('fs');
      const path = join(__dirname, '..', 'dist', 'assets');

      if (!fs.existsSync(path)) {
        return { passed: false, message: 'Build dist not found (run build first)' };
      }

      const files = fs.readdirSync(path);
      const jsFiles = files.filter((f: string) => f.endsWith('.js'));

      let totalSize = 0;
      for (const file of jsFiles) {
        const stats = fs.statSync(join(path, file));
        totalSize += stats.size;
      }

      const sizeKB = totalSize / 1024;

      if (sizeKB < 500) {
        return { passed: true, message: `${sizeKB.toFixed(0)}KB (< 500KB)` };
      } else {
        return { passed: false, message: `${sizeKB.toFixed(0)}KB (> 500KB budget)` };
      }
    } catch (error: any) {
      return { passed: false, message: error.message };
    }
  });

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}\n`);

  if (failed > 0) {
    console.log('Failed checks:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
    console.log('\n⚠️  FIX FAILURES BEFORE DEPLOY\n');
    process.exit(1);
  } else {
    console.log('🎉 ALL CHECKS PASSED - READY TO SHIP!\n');
  }
}

main();
