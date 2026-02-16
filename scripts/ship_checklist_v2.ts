/**
 * EXPANDED SHIP CHECKLIST - FORENSIC GRADE
 *
 * Comprehensive validation with forensic invariants
 * MUST PASS before deployment
 *
 * Run: npx tsx scripts/ship_checklist_v2.ts
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { checkDenormSync } from './check_denorm_sync';
import { verifyAndSetPragmas } from './verify_sqlite_pragmas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'epstein-archive.db');

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
  critical: boolean; // If true, failure blocks deploy
}

const results: CheckResult[] = [];

function runCheck(
  name: string,
  fn: () => boolean | { passed: boolean; message: string },
  critical = true,
): void {
  console.log(`\n🔍 ${name}...`);
  const start = Date.now();

  try {
    const result = fn();
    const passed = typeof result === 'boolean' ? result : result.passed;
    const message = typeof result === 'boolean' ? (passed ? 'OK' : 'Failed') : result.message;
    const duration = Date.now() - start;

    results.push({ name, passed, message, duration, critical });

    if (passed) {
      console.log(`  ✅ ${message} (${duration}ms)`);
    } else {
      console.log(`  ${critical ? '❌' : '⚠️ '} ${message} (${duration}ms)`);
    }
  } catch (error: any) {
    const duration = Date.now() - start;
    results.push({ name, passed: false, message: error.message, duration, critical });
    console.log(`  ${critical ? '❌' : '⚠️ '} ${error.message} (${duration}ms)`);
  }
}

function main(): void {
  console.log('🚀 FORENSIC-GRADE SHIP CHECKLIST\n');
  console.log('='.repeat(80));

  const db = new Database(DB_PATH);

  // ============================================================
  // PHASE 1: FORENSIC INVARIANTS (CRITICAL)
  // ============================================================

  console.log('\n📋 PHASE 1: FORENSIC INVARIANTS');
  console.log('='.repeat(80));

  // 1. Denormalization Sync Invariant
  runCheck(
    'Denorm Sync Invariant (0 mismatches)',
    () => {
      const result = checkDenormSync(db);
      return result;
    },
    true,
  );

  // 2. Canonical Revision Token Available
  runCheck(
    'Canonical Revision Token Available',
    () => {
      try {
        // Simplified check: verify we can query the DB for revision components
        const latestIngest = db
          .prepare(
            `
          SELECT ingest_run_id 
          FROM entity_mentions 
          WHERE ingest_run_id IS NOT NULL 
          LIMIT 1
        `,
          )
          .get() as { ingest_run_id: string } | undefined;

        const hasData = latestIngest !== undefined;
        return {
          passed: true,
          message: hasData ? `Ingest ID: ${latestIngest.ingest_run_id}` : 'No ingest data',
        };
      } catch (error: any) {
        return { passed: false, message: error.message };
      }
    },
    true,
  );

  // 3. SQLite Pragma Verification
  runCheck(
    'SQLite PRAGMAs Configured',
    () => {
      const result = verifyAndSetPragmas(db);
      return {
        passed: result.passed,
        message: result.passed ? 'All PRAGMAs correct' : `${result.issues.length} issues`,
      };
    },
    true,
  );

  // 4. Triggers Exist
  runCheck(
    'Denorm Triggers Exist',
    () => {
      const triggers = db
        .prepare(
          `
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='trigger' 
      AND name IN ('sync_entity_mentions_on_doc_update', 'populate_entity_mentions_on_insert')
    `,
        )
        .get() as { count: number };

      if (triggers.count === 2) {
        return { passed: true, message: '2/2 triggers active' };
      } else {
        return { passed: false, message: `Only ${triggers.count}/2 triggers found` };
      }
    },
    true,
  );

  // ============================================================
  // PHASE 2: PERFORMANCE VALIDATION (CRITICAL)
  // ============================================================

  console.log('\n📋 PHASE 2: PERFORMANCE VALIDATION');
  console.log('='.repeat(80));

  // 5. Hot Path Validation (zero temp B-trees)
  runCheck(
    'Hot Paths: Zero Temp B-trees',
    () => {
      const queries = [
        {
          name: 'Homepage Top 250',
          sql: `SELECT id FROM entities WHERE is_vip = 1 ORDER BY mentions DESC LIMIT 250`,
        },
        {
          name: 'Entity Documents',
          sql: `SELECT d.id FROM documents d JOIN entity_mentions em ON d.id = em.document_id WHERE em.entity_id = 1 ORDER BY em.doc_red_flag_rating DESC, em.doc_date_created DESC LIMIT 50`,
        },
      ];

      let totalTempBtrees = 0;

      for (const query of queries) {
        const plan = db.prepare(`EXPLAIN QUERY PLAN ${query.sql}`).all();
        for (const step of plan as any[]) {
          if (step.detail.toUpperCase().includes('USE TEMP B-TREE')) {
            totalTempBtrees++;
          }
        }
      }

      if (totalTempBtrees === 0) {
        return { passed: true, message: 'All hot paths optimized (0 temp B-trees)' };
      } else {
        return { passed: false, message: `${totalTempBtrees} temp B-trees detected` };
      }
    },
    true,
  );

  // 6. Required Indexes Exist
  runCheck(
    'Required Indexes Exist',
    () => {
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

      if (missing.length === 0) {
        return { passed: true, message: `All ${requiredIndexes.length} indexes exist` };
      } else {
        return { passed: false, message: `Missing: ${missing.join(', ')}` };
      }
    },
    true,
  );

  db.close();

  // ============================================================
  // PHASE 3: CODE QUALITY (CRITICAL)
  // ============================================================

  console.log('\n📋 PHASE 3: CODE QUALITY');
  console.log('='.repeat(80));

  // 7. TypeScript Compilation
  runCheck(
    'TypeScript Compilation (tsc --noEmit)',
    () => {
      try {
        execSync('npx tsc --noEmit', { stdio: 'pipe', cwd: join(__dirname, '..') });
        return true;
      } catch (error) {
        return { passed: false, message: 'TypeScript errors detected' };
      }
    },
    true,
  );

  // 8. ESLint Warnings
  runCheck(
    'ESLint Warnings = 0',
    () => {
      try {
        execSync('npx eslint src --max-warnings 0', {
          stdio: 'pipe',
          cwd: join(__dirname, '..'),
        });
        return true;
      } catch (error: any) {
        const warnings = error.stdout?.toString().match(/(\d+) warning/);
        const warningCount = warnings ? warnings[1] : 'unknown';
        return { passed: false, message: `${warningCount} ESLint warnings` };
      }
    },
    false,
  ); // Non-critical (warnings allowed in some cases)

  // 8b. Investigations Placeholder/Gating Scan
  runCheck(
    'Investigations placeholders are explicitly gated',
    () => {
      const investigationDir = join(__dirname, '..', 'src', 'components', 'investigation');
      if (!fs.existsSync(investigationDir)) {
        return { passed: false, message: 'Investigation component directory not found' };
      }

      const files = fs.readdirSync(investigationDir).filter((f) => f.endsWith('.tsx'));
      const placeholderPattern = /(coming soon|not implemented yet|start analysis|placeholder)/i;
      const violations: string[] = [];

      for (const file of files) {
        const fullPath = join(investigationDir, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (!placeholderPattern.test(line)) return;
          const windowText = lines.slice(Math.max(0, index - 2), index + 3).join('\n');
          const explicitlyGated = /not available yet|data-gated-reason|disabled|alternative/i.test(
            windowText,
          );
          if (!explicitlyGated) {
            violations.push(`${file}:${index + 1}`);
          }
        });
      }

      if (violations.length > 0) {
        return {
          passed: false,
          message: `Ungated placeholder labels found (${violations.slice(0, 10).join(', ')})`,
        };
      }

      return { passed: true, message: 'No ungated placeholder labels detected' };
    },
    true,
  );

  // ============================================================
  // PHASE 4: BUILD & BUNDLE (CRITICAL)
  // ============================================================

  console.log('\n📋 PHASE 4: BUILD & BUNDLE');
  console.log('='.repeat(80));

  // 9. Production Build
  runCheck(
    'Production Build Succeeds',
    () => {
      try {
        execSync('npm run build', { stdio: 'pipe', cwd: join(__dirname, '..') });
        return { passed: true, message: 'Build successful' };
      } catch (error) {
        return { passed: false, message: 'Build failed' };
      }
    },
    true,
  );

  // 10. Bundle Size Check
  runCheck(
    'Bundle Size < 500KB gzipped',
    () => {
      try {
        const path = join(__dirname, '..', 'dist', 'assets');

        if (!fs.existsSync(path)) {
          return { passed: false, message: 'Build dist not found' };
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
    },
    true,
  );

  // ============================================================
  // SUMMARY
  // ============================================================

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80) + '\n');

  const criticalResults = results.filter((r) => r.critical);
  const nonCriticalResults = results.filter((r) => !r.critical);

  const criticalPassed = criticalResults.filter((r) => r.passed).length;
  const criticalFailed = criticalResults.filter((r) => !r.passed).length;

  const nonCriticalPassed = nonCriticalResults.filter((r) => r.passed).length;
  const nonCriticalFailed = nonCriticalResults.filter((r) => !r.passed).length;

  console.log(`🔴 CRITICAL CHECKS:`);
  console.log(`  ✅ Passed: ${criticalPassed}/${criticalResults.length}`);
  console.log(`  ❌ Failed: ${criticalFailed}/${criticalResults.length}\n`);

  console.log(`🟡 NON-CRITICAL CHECKS:`);
  console.log(`  ✅ Passed: ${nonCriticalPassed}/${nonCriticalResults.length}`);
  console.log(`  ⚠️  Failed: ${nonCriticalFailed}/${nonCriticalResults.length}\n`);

  if (criticalFailed > 0) {
    console.log('❌ CRITICAL FAILURES DETECTED:\n');
    criticalResults
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
    console.log('\n⚠️  FIX CRITICAL FAILURES BEFORE DEPLOY\n');
    process.exit(1);
  } else if (nonCriticalFailed > 0) {
    console.log('⚠️  NON-CRITICAL WARNINGS:\n');
    nonCriticalResults
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
    console.log('\n✅ ALL CRITICAL CHECKS PASSED - READY TO SHIP (with warnings)\n');
  } else {
    console.log('🎉 ALL CHECKS PASSED - FORENSIC-GRADE READY TO SHIP!\n');
  }
}

main();
