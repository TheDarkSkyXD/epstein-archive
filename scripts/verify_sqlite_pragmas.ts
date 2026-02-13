/**
 * SQLITE OPERATIONAL TUNING
 *
 * Verifies and sets safe PRAGMAs for production performance
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'epstein-archive.db');

interface PragmaSetting {
  name: string;
  expected: string | number;
  current?: string | number;
  rationale: string;
}

const REQUIRED_PRAGMAS: PragmaSetting[] = [
  {
    name: 'journal_mode',
    expected: 'wal',
    rationale: 'WAL mode for better concurrency and crash recovery',
  },
  {
    name: 'synchronous',
    expected: 'NORMAL',
    rationale: 'NORMAL is safe for WAL mode, faster than FULL',
  },
  {
    name: 'temp_store',
    expected: 'MEMORY',
    rationale: 'Store temp tables in memory for performance',
  },
  {
    name: 'cache_size',
    expected: -64000, // Negative = KB, so -64000 = 64MB
    rationale: '64MB cache for large dataset (8GB DB)',
  },
  {
    name: 'mmap_size',
    expected: 268435456, // 256MB
    rationale: 'Memory-mapped I/O for read performance',
  },
  {
    name: 'foreign_keys',
    expected: 'ON',
    rationale: 'Enforce referential integrity',
  },
];

export function verifyAndSetPragmas(db: Database.Database): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  console.log('🔧 SQLite Operational Tuning\n');
  console.log('='.repeat(80));

  for (const pragma of REQUIRED_PRAGMAS) {
    // Get current value
    const result = db.prepare(`PRAGMA ${pragma.name}`).get() as any;
    const current = result[pragma.name];

    pragma.current = current;

    // Check if matches expected
    const matches = current?.toString().toUpperCase() === pragma.expected.toString().toUpperCase();

    if (!matches) {
      console.log(`⚠️  ${pragma.name}: ${current} (expected: ${pragma.expected})`);
      console.log(`   Setting to: ${pragma.expected}`);
      console.log(`   Rationale: ${pragma.rationale}`);

      // Set pragma
      try {
        db.prepare(`PRAGMA ${pragma.name} = ${pragma.expected}`).run();

        // Verify it was set
        const newResult = db.prepare(`PRAGMA ${pragma.name}`).get() as any;
        const newValue = newResult[pragma.name];

        if (newValue?.toString().toUpperCase() === pragma.expected.toString().toUpperCase()) {
          console.log(`   ✅ Set successfully\n`);
        } else {
          const issue = `Failed to set ${pragma.name} to ${pragma.expected}`;
          console.log(`   ❌ ${issue}\n`);
          issues.push(issue);
        }
      } catch (error: any) {
        const issue = `Error setting ${pragma.name}: ${error.message}`;
        console.log(`   ❌ ${issue}\n`);
        issues.push(issue);
      }
    } else {
      console.log(`✅ ${pragma.name}: ${current}`);
      console.log(`   ${pragma.rationale}\n`);
    }
  }

  console.log('='.repeat(80));

  const passed = issues.length === 0;
  if (passed) {
    console.log('✅ All PRAGMAs configured correctly');
  } else {
    console.log(`❌ ${issues.length} PRAGMA issues detected`);
  }

  return { passed, issues };
}

function main(): void {
  const db = new Database(DB_PATH);
  const result = verifyAndSetPragmas(db);
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
