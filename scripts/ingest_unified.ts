
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { glob } from 'glob';
import { CompetitiveOCRService } from '../src/services/ocr/OCRService.js';
import { createHash } from 'crypto';

// Configuration
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);
const ocrService = new CompetitiveOCRService();

// Collection Definitions
interface CollectionConfig {
    name: string;
    rootPath: string;
    description: string;
    filePattern: string;
    excludePattern?: string[];
    // Hook for pre-loading metadata/OCR maps
    preload?: () => Promise<Map<string, string>>; // Returns Map<filename_without_ext, text>
    // Hook to determine manual text for a specific file from preloaded data
    getManualText?: (filename: string, preloadedData: any) => string | undefined;
}

const collections: CollectionConfig[] = [
    {
        name: 'DOJ Discovery VOL00001',
        rootPath: 'data/originals/DOJ VOL00001',
        description: 'FBI 2019 Search of Epstein Residence',
        filePattern: '**/*.{pdf,jpg,jpeg,png}',
        excludePattern: ['**/OCR/**', '**/thumbs/**'],
        preload: async () => {
            console.log('  📖 Pre-loading DOJ Vol 1 OCR data...');
            const ocrMap = new Map<string, string>();
            const ocrDir = 'data/originals/DOJ VOL00001/OCR';
            if (fs.existsSync(ocrDir)) {
                const files = fs.readdirSync(ocrDir).filter(f => f.endsWith('.txt'));
                for (const file of files) {
                    const content = fs.readFileSync(path.join(ocrDir, file), 'utf-8');
                    // EFTA ID parsing logic
                    const regex = /([\s\S]*?)(EFTA\d{8})/g;
                    let match;
                    while ((match = regex.exec(content)) !== null) {
                        const text = match[1].trim();
                        const id = match[2]; // e.g. EFTA00001234
                        ocrMap.set(id, text);
                    }
                }
            }
            console.log(`  ✅ Loaded ${ocrMap.size} OCR entries.`);
            return ocrMap;
        },
        getManualText: (filename, map: Map<string, string>) => {
            // Filename is likely "EFTA00001234.pdf"
            const id = path.parse(filename).name;
            return map.get(id);
        }
    },
    {
        name: 'DOJ Discovery VOL00007',
        rootPath: 'data/originals/DOJ VOL00007',
        description: 'Additional FBI Discovery Materials',
        filePattern: '**/*.{pdf,jpg,jpeg,png}',
        excludePattern: ['**/thumbs/**']
    },
    {
        name: 'Epstein Estate Documents - Seventh Production',
        rootPath: '/Users/veland/Downloads/Epstein Files/Epstein Estate Documents - Seventh Production', // Use env var in real prod
        description: 'House Oversight Committee Production',
        filePattern: '**/*.{pdf,jpg,jpeg,png}',
        excludePattern: ['**/NATIVES/**', '**/TEXT/**', '**/thumbs/**'], // NATIVES handled separately? Or just scan them all?
        // Note: This collection has complex metadata files. 
        // For unified script, we might just treat them as files unless we port the full logic.
        // Let's stick to basic file ingestion for now to ensure coverage, 
        // relying on Native/OCR. Metadata ingestion is a separate concern (enrichment).
    }
];

async function run() {
    console.log('🚀 Starting Unified Ingestion Pipeline...');
    console.log(`📁 Database: ${DB_PATH}`);

    // Ensure DB tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL UNIQUE,
            file_type TEXT,
            file_size INTEGER,
            date_created TEXT,
            date_modified TEXT,
            content_hash TEXT,
            evidence_type TEXT,
            content TEXT,
            metadata_json TEXT,
            source_collection TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            red_flag_rating INTEGER DEFAULT 0
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
            file_name, 
            content, 
            source_collection,
            content='documents', 
            content_rowid='id'
        );
    `);

    const insertStmt = db.prepare(`
        INSERT INTO documents (
            file_name, file_path, file_type, file_size, 
            date_created, date_modified, content_hash, evidence_type,
            content, metadata_json, source_collection, created_at
        ) VALUES (
            @fileName, @filePath, @fileType, @fileSize,
            @dateCreated, @dateModified, @contentHash, @evidenceType,
            @content, @metadataJson, @sourceCollection, @createdAt
        )
    `);

    const updateStmt = db.prepare(`
        UPDATE documents SET
            content = @content,
            metadata_json = @metadataJson,
            date_modified = @dateModified
        WHERE id = @id
    `);

    const checkStmt = db.prepare('SELECT id, content_hash, content FROM documents WHERE file_path = ?');

    for (const collection of collections) {
        console.log(`\n📦 Processing Collection: ${collection.name}`);
        
        if (!fs.existsSync(collection.rootPath)) {
            console.warn(`  ⚠️  Root path not found: ${collection.rootPath}`);
            continue;
        }

        // Preload data
        let preloadedData: any = null;
        if (collection.preload) {
            preloadedData = await collection.preload();
        }

        // Find files
        const files = await glob(collection.filePattern, { 
            cwd: collection.rootPath, 
            ignore: collection.excludePattern,
            absolute: true 
        });

        console.log(`  🔍 Found ${files.length} candidate files.`);

        let processed = 0;
        let skipped = 0;
        let updated = 0;
        let errors = 0;

        for (const filePath of files) {
            try {
                const relativePath = path.relative(process.cwd(), filePath); // Store relative to CWD if possible, or absolute
                // Actually, storing relative to project root is best for portability
                // But some paths are outside project root (Downloads).
                // Let's use the path as provided by glob (absolute) but normalize slashes.
                const storagePath = filePath.startsWith(process.cwd()) 
                    ? path.relative(process.cwd(), filePath) 
                    : filePath;

                const fileName = path.basename(filePath);
                const stats = fs.statSync(filePath);
                const fileType = path.extname(fileName).toLowerCase().replace('.', '');
                
                // Mime type for OCR
                const mimeType = fileType === 'pdf' ? 'application/pdf' : `image/${fileType}`;

                // Check manual override
                let manualText = undefined;
                if (collection.getManualText && preloadedData) {
                    manualText = collection.getManualText(fileName, preloadedData);
                }

                // Check existing
                const existing = checkStmt.get(storagePath) as any;
                
                // Decide if we need to process
                // 1. New file
                // 2. Existing file but content is empty/placeholder AND we have a better strategy now
                // 3. Existing file but manual override is available and different
                
                let shouldProcess = !existing;
                if (existing) {
                    const isPlaceholder = !existing.content || existing.content.startsWith('[') || existing.content.length < 50;
                    if (isPlaceholder || (manualText && existing.content !== manualText)) {
                        shouldProcess = true;
                    }
                }

                if (!shouldProcess) {
                    skipped++;
                    if (skipped % 100 === 0) process.stdout.write(`  ⏭️  Skipped ${skipped}...\r`);
                    continue;
                }

                // Process!
                // console.log(`  ⚙️  Processing: ${fileName}`);
                const ocrResult = await ocrService.process(filePath, mimeType, manualText);

                const record = {
                    fileName,
                    filePath: storagePath,
                    fileType,
                    fileSize: stats.size,
                    dateCreated: stats.birthtime.toISOString(),
                    dateModified: new Date().toISOString(),
                    contentHash: createHash('md5').update(ocrResult.text).digest('hex'),
                    evidenceType: 'Evidence',
                    content: ocrResult.text || `[No text extracted: ${ocrResult.engine}]`,
                    metadataJson: JSON.stringify({
                        ocrEngine: ocrResult.engine,
                        ocrConfidence: ocrResult.confidence,
                        collection: collection.name,
                        originalPath: filePath
                    }),
                    sourceCollection: collection.name,
                    createdAt: new Date().toISOString()
                };

                if (existing) {
                    updateStmt.run({ ...record, id: existing.id });
                    updated++;
                } else {
                    insertStmt.run(record);
                    processed++;
                }

                if ((processed + updated) % 10 === 0) {
                    process.stdout.write(`  📊 Processed: ${processed}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}\r`);
                }

            } catch (err) {
                console.error(`  ❌ Error processing ${path.basename(filePath)}:`, err);
                errors++;
            }
        }
        console.log(`\n  ✅ Collection Complete. Added: ${processed}, Updated: ${updated}, Errors: ${errors}`);
    }

    console.log('\n🧹 Optimizing Search Index...');
    db.exec("INSERT INTO documents_fts(documents_fts) VALUES('optimize');");
    
    console.log('🎉 Unified Ingestion Complete!');
}

run().catch(console.error);
