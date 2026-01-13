import { databaseService } from '../services/DatabaseService';
import { join } from 'path';
import { readFileSync, existsSync, statSync } from 'fs';

async function importDocuments() {
  console.log('Starting document import...');

  const jsonPath = join(process.cwd(), 'public', 'data', 'searchable_files.json');
  if (!existsSync(jsonPath)) {
    console.error('searchable_files.json not found at', jsonPath);
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  const files = data.files || [];

  console.log(`Found ${files.length} files to import.`);

  const importedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Use transaction for bulk insert
  await databaseService.transaction(async () => {
    for (const file of files) {
      try {
        if (!existsSync(file.path)) {
          console.warn(`File not found: ${file.path}`);
          skippedCount++;
          continue;
        }

        const content = readFileSync(file.path, 'utf-8');
        const stats = statSync(file.path);

        // Prepare metadata
        const metadata = {
          original_entities: file.entities,
          original_dates: file.dates,
          category: file.category,
        };

        // Calculate basic spice rating from keywords (simplified version of DocumentProcessor)
        const spiceRating = calculateSpiceRating(content);

        // Insert into database
        // We use direct SQL execution via databaseService's db property if accessible,
        // or we can use a raw query if databaseService exposes one.
        // Since databaseService.bulkInsertEntities is for entities, we'll use a direct prepare/run here
        // But we need access to the db object.
        // Looking at DatabaseService.ts, 'db' is private.
        // However, we can use the 'transaction' method which exposes the db implicitly or we can add a method.
        // Actually, let's just use the 'db' instance from 'better-sqlite3' directly in this script for simplicity
        // as we are in a script context.

        // Wait, we can't access private 'db'.
        // But we can use 'databaseService.transaction' to wrap our logic,
        // but inside we still need to execute queries.
        // Let's check if there is a generic 'run' or 'exec' method.
        // There isn't.

        // Alternative: Use 'better-sqlite3' directly in this script, connecting to the same DB file.
        // This is safer and easier for a script.
      } catch (error) {
        console.error(`Error processing ${file.filename}:`, error);
        errorCount++;
      }
    }
  });
}

// Helper for spice rating
function calculateSpiceRating(content: string): number {
  const keywords = [
    'sexual',
    'minor',
    'underage',
    'trafficking',
    'abuse',
    'island',
    'jet',
    'flight',
    'massage',
    'recruitment',
  ];
  const lowerContent = content.toLowerCase();
  let score = 0;

  keywords.forEach((word) => {
    if (lowerContent.includes(word)) score++;
  });

  if (score > 10) return 5;
  if (score > 7) return 4;
  if (score > 4) return 3;
  if (score > 1) return 2;
  return 1;
}

// We'll implement the main logic using better-sqlite3 directly
import Database from 'better-sqlite3';
const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

async function run() {
  console.log('Starting document import...');

  const jsonPath = (() => {
    const prod = join('/opt/epstein-archive', 'public', 'data', 'searchable_files.json');
    if (existsSync(prod)) return prod;
    return join(process.cwd(), 'public', 'data', 'searchable_files.json');
  })();
  if (!existsSync(jsonPath)) {
    console.error('searchable_files.json not found at', jsonPath);
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  const files = data.files || [];

  console.log(`Found ${files.length} files to import.`);

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO documents (
      file_name, file_path, file_type, file_size, date_created, 
      content, metadata_json, word_count, spice_rating, evidence_type
    ) VALUES (
      @file_name, @file_path, @file_type, @file_size, @date_created,
      @content, @metadata_json, @word_count, @spice_rating, @evidence_type
    )
  `);

  let importedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const transaction = db.transaction((filesToImport) => {
    for (const file of filesToImport) {
      try {
        const baseLocal = '/Users/veland/Downloads/Epstein Files';
        const baseProd = '/opt/epstein-archive/data';
        const mappedPath = (file.path || '').startsWith(baseLocal)
          ? file.path.replace(baseLocal, baseProd)
          : file.path;
        if (!existsSync(mappedPath)) {
          // console.warn(`File not found: ${file.path}`);
          skippedCount++;
          continue;
        }

        const content = readFileSync(mappedPath, 'utf-8');
        const stats = statSync(mappedPath);

        const metadata = {
          original_entities: file.entities,
          original_dates: file.dates,
          category: file.category,
          source: 'searchable_files.json',
        };

        const spiceRating = calculateSpiceRating(content);

        // Determine file type from extension
        const ext = file.filename.split('.').pop()?.toLowerCase() || 'txt';

        insertStmt.run({
          file_name: file.filename,
          file_path: mappedPath,
          file_type: ext,
          file_size: stats.size,
          date_created: new Date(stats.birthtime).toISOString(),
          content: content,
          metadata_json: JSON.stringify(metadata),
          word_count: file.word_count || 0,
          spice_rating: spiceRating,
          evidence_type: 'document',
        });

        importedCount++;
        if (importedCount % 100 === 0) process.stdout.write('.');
      } catch (error) {
        console.error(`Error importing ${file.filename}:`, error);
        errorCount++;
      }
    }
  });

  try {
    transaction(files);
    console.log(`\nImport completed.`);
    console.log(`Imported: ${importedCount}`);
    console.log(`Skipped (not found): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
  } catch (err) {
    console.error('Transaction failed:', err);
  } finally {
    db.close();
  }
}

run().catch(console.error);
