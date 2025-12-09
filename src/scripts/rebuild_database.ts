import Database from 'better-sqlite3';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { parse } from 'csv-parse/sync';

// Configuration
const DB_PATH = resolve(process.cwd(), 'epstein-archive.db');
const DATA_ROOT = resolve(process.cwd(), 'data');
const CSV_PATH = join(DATA_ROOT, 'csv', 'house_oversight_clean.csv');

console.log(`[Rebuild] Starting database rebuild...`);
console.log(`[Rebuild] DB Path: ${DB_PATH}`);
console.log(`[Rebuild] Data Root: ${DATA_ROOT}`);

// Initialize Database
try {
    if (existsSync(DB_PATH)) {
        console.log('[Rebuild] Removing existing database...');
        try {
           unlinkSync(DB_PATH);
        } catch(e) {
           console.log('Could not delete DB, maybe locked?', e);
           // If we can't delete, we should probably exit or try to drop tables.
           // But let's assume it works or we manually delete.
           process.exit(1); 
        }
    }
} catch (e) {
    console.error('Error prepping DB file:', e);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 1. Define Schema
console.log('[Rebuild] Defining Schema...');

const SCHEMA = `
-- Entities (People, Orgs, Locations)
CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT CHECK(type IN ('Person', 'Organization', 'Location', 'Unknown')) DEFAULT 'Unknown',
    role TEXT,
    description TEXT,
    red_flag_rating INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bates_number TEXT UNIQUE,
    title TEXT,
    file_type TEXT,
    file_path TEXT,
    file_size INTEGER DEFAULT 0,
    author TEXT,
    custodian TEXT,
    date_created DATE,
    md5_hash TEXT,
    content TEXT,
    word_count INTEGER DEFAULT 0,
    metadata_json TEXT,
    red_flag_rating INTEGER DEFAULT 0,
    evidence_type TEXT DEFAULT 'document',
    parent_document_id INTEGER REFERENCES documents(id),
    thread_id TEXT,
    thread_position INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Full Text Search
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    title, 
    content, 
    content='documents', 
    content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
    name, 
    role, 
    description, 
    content='entities', 
    content_rowid='id'
);

-- Relationships
CREATE TABLE IF NOT EXISTS entity_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    weight REAL DEFAULT 1.0,
    confidence REAL DEFAULT 1.0,
    evidence_document_id INTEGER,
    FOREIGN KEY(source_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY(target_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY(evidence_document_id) REFERENCES documents(id)
);

-- Investigations
CREATE TABLE IF NOT EXISTS investigations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active'
);

-- Investigation Evidence Join
CREATE TABLE IF NOT EXISTS investigation_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investigation_id INTEGER NOT NULL,
    evidence_type TEXT CHECK(evidence_type IN ('document', 'entity')),
    document_id INTEGER,
    entity_id INTEGER,
    notes TEXT,
    FOREIGN KEY(investigation_id) REFERENCES investigations(id) ON DELETE CASCADE,
    FOREIGN KEY(document_id) REFERENCES documents(id),
    FOREIGN KEY(entity_id) REFERENCES entities(id)
);

-- Triggers for FTS Sync
-- Documents
CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
END;
CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
  INSERT INTO documents_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;

-- Entities
CREATE TRIGGER IF NOT EXISTS entities_ai AFTER INSERT ON entities BEGIN
  INSERT INTO entities_fts(rowid, name, role, description) VALUES (new.id, new.name, new.role, new.description);
END;
CREATE TRIGGER IF NOT EXISTS entities_ad AFTER DELETE ON entities BEGIN
  INSERT INTO entities_fts(entities_fts, rowid, name, role, description) VALUES('delete', old.id, old.name, old.role, old.description);
END;
CREATE TRIGGER IF NOT EXISTS entities_au AFTER UPDATE ON entities BEGIN
  INSERT INTO entities_fts(entities_fts, rowid, name, role, description) VALUES('delete', old.id, old.name, old.role, old.description);
  INSERT INTO entities_fts(rowid, name, role, description) VALUES (new.id, new.name, new.role, new.description);
END;

-- Media Albums
CREATE TABLE IF NOT EXISTS media_albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    cover_image_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_modified DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Media Images
CREATE TABLE IF NOT EXISTS media_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_filename TEXT,
    path TEXT NOT NULL,
    thumbnail_path TEXT,
    title TEXT,
    description TEXT,
    album_id INTEGER,
    width INTEGER,
    height INTEGER,
    file_size INTEGER DEFAULT 0,
    format TEXT,
    date_taken DATETIME,
    date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    camera_make TEXT,
    camera_model TEXT,
    lens TEXT,
    focal_length TEXT,
    aperture TEXT,
    shutter_speed TEXT,
    iso TEXT,
    latitude REAL,
    longitude REAL,
    color_profile TEXT,
    orientation INTEGER DEFAULT 1,
    FOREIGN KEY(album_id) REFERENCES media_albums(id) ON DELETE SET NULL
);

-- Media Tags
CREATE TABLE IF NOT EXISTS media_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT
);

-- Media Image Tags
CREATE TABLE IF NOT EXISTS media_image_tags (
    image_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY(image_id, tag_id),
    FOREIGN KEY(image_id) REFERENCES media_images(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES media_tags(id) ON DELETE CASCADE
);

-- Media FTS
CREATE VIRTUAL TABLE IF NOT EXISTS media_images_fts USING fts5(
    title,
    description,
    content='media_images',
    content_rowid='id'
);

-- Triggers for Media FTS
CREATE TRIGGER IF NOT EXISTS media_images_ai AFTER INSERT ON media_images BEGIN
  INSERT INTO media_images_fts(rowid, title, description) VALUES (new.id, new.title, new.description);
END;
CREATE TRIGGER IF NOT EXISTS media_images_ad AFTER DELETE ON media_images BEGIN
  INSERT INTO media_images_fts(media_images_fts, rowid, title, description) VALUES('delete', old.id, old.title, old.description);
END;
CREATE TRIGGER IF NOT EXISTS media_images_au AFTER UPDATE ON media_images BEGIN
  INSERT INTO media_images_fts(media_images_fts, rowid, title, description) VALUES('delete', old.id, old.title, old.description);
  INSERT INTO media_images_fts(rowid, title, description) VALUES (new.id, new.title, new.description);
END;



`;

db.exec(SCHEMA);
console.log('[Rebuild] Schema applied.');

// 2. Ingest CSV Data
async function ingestInventory() {
    console.log('[Rebuild] Ingesting Inventory from CSV...');
    
    if (!existsSync(CSV_PATH)) {
        console.error(`CSV not found at: ${CSV_PATH}`);
        return;
    }

    const fileContent = readFileSync(CSV_PATH);
    // Parse CSV. Assuming headers are on line 2 (index 1) based on view_file output. 
    // Line 1 was 0,1,2,3... Line 2 was "Bates Begin", "Bates End"...
    // so we need to skip line 1 and use line 2 as headers.
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        from_line: 2 // Start reading from line 2
    });

    console.log(`[Rebuild] Parsed ${records.length} records.`);

    const insertDoc = db.prepare(`
        INSERT INTO documents (bates_number, title, file_type, file_path, file_size, author, custodian, date_created, md5_hash, content, word_count)
        VALUES (@bates, @title, @type, @path, @size, @author, @custodian, @date, @hash, @content, @words)
        ON CONFLICT(bates_number) DO UPDATE SET title=excluded.title
    `);

    const upsertEntity = db.prepare(`
        INSERT INTO entities (name, type, role) 
        VALUES (@name, @type, @role)
        ON CONFLICT(name) DO NOTHING
    `);

interface CsvRow {
    'Bates Begin': string;
    'Bates End': string;
    'Document Title': string;
    'Original Filename': string;
    'Author': string;
    'Custodian/Source': string;
    'Date Created': string;
    'MD5 Hash': string;
    'Document Extension': string;
    'Text Link': string;
}

    let count = 0;
    for (const rowObj of records) {
        const row = rowObj as CsvRow;
        // Map CSV columns
        const bates = row['Bates Begin'];
        const title = row['Document Title'] || row['Original Filename'] || bates;
        const author = row['Author'];
        const custodian = row['Custodian/Source'];
        const date = row['Date Created'];
        const hash = row['MD5 Hash'];
        const rawType = row['Document Extension'] || 'TXT';
        const type = rawType.toLowerCase();
        
        // Path handling
        let relPath = row['Text Link']; // e.g. \HOUSE_OVERSIGHT_009\TEXT\001\HOUSE_OVERSIGHT_010477.txt
        let content = '';
        let filePath = '';
        let size = 0;
        let words = 0;

        if (relPath) {
            // Convert win to lin
            const cleanPath = relPath.replace(/\\/g, '/').replace(/^\//, ''); // Remove leading slash
            // cleanPath is now "HOUSE_OVERSIGHT_009/TEXT/001/..."
            // We assume /data/text/ contains the text files or mirrors this structure?
            // "data/csv" contains subdirs like "HOUSE_OVERSIGHT_016552".
            // "data/text" dir listing showed children.
            // Let's try matching filename in `data/text` directly if specific structure fails.
            
            const filename = cleanPath.split('/').pop();
            const potentialPath = join(DATA_ROOT, 'text', filename!);
            
            if (existsSync(potentialPath)) {
                filePath = `/data/text/${filename}`;
                try {
                    content = readFileSync(potentialPath, 'utf-8');
                } catch (e) {
                    console.warn(`Failed to read content for ${filename}`);
                }
            } else {
               // Fallback: Check if path exists inside data Root
               const fullPath = join(DATA_ROOT, cleanPath);
               if (existsSync(fullPath)) {
                   filePath = `/data/${cleanPath}`;
                   content = readFileSync(fullPath, 'utf-8');
               }
            }
        }
        
        size = content.length;
        words = content.length > 0 ? content.trim().split(/\s+/).length : 0;

        insertDoc.run({
            bates, title, type, path: filePath, size, author, custodian, date, hash, content, words
        });

        // Entity Extraction
        if (author && author.length > 2) {
            // "Epstein, Jeffrey" -> "Jeffrey Epstein"
            const name = normalizeName(author);
            upsertEntity.run({ name, type: 'Person', role: 'Author' });
        }
        if (custodian && custodian.length > 2) {
            const name = normalizeName(custodian);
            upsertEntity.run({ name, type: 'Person', role: 'Custodian' });
        }

        count++;
        if (count % 100 === 0) console.log(`Processed ${count} documents...`);
    }
    console.log('[Rebuild] Inventory Ingestion Complete.');
}

function normalizeName(name: string): string {
    // Basic "Last, First" -> "First Last"
    if (name.includes(',')) {
        const parts = name.split(',').map(s => s.trim());
        if (parts.length === 2) {
            return `${parts[1]} ${parts[0]}`;
        }
    }
    return name.trim();
}

// Run
async function run() {
    await ingestInventory();
    await ingestMedia();
}

run().catch(console.error);

async function ingestMedia() {
    console.log('[Rebuild] Ingesting Media from data/media/images...');
    const MEDIA_ROOT = join(DATA_ROOT, 'media', 'images');
    
    if (!existsSync(MEDIA_ROOT)) {
        console.warn(`[Rebuild] Media directory not found at: ${MEDIA_ROOT}`);
        return;
    }

    const { readdirSync, statSync, readFileSync } = await import('fs');
    // @ts-ignore
    const exifParser = await import('exif-parser');

    // Get albums (directories)
    const albums = readdirSync(MEDIA_ROOT).filter(f => {
        return statSync(join(MEDIA_ROOT, f)).isDirectory();
    });

    const insertAlbum = db.prepare(`
        INSERT INTO media_albums (name, description, cover_image_id) 
        VALUES (@name, @description, NULL)
    `);

    const insertImage = db.prepare(`
        INSERT INTO media_images (
            filename, path, thumbnail_path, title, album_id, file_size, format,
            width, height, date_taken, camera_make, camera_model, 
            focal_length, aperture, shutter_speed, iso
        )
        VALUES (
            @filename, @path, @path, @title, @album_id, @size, @format,
            @width, @height, @date_taken, @camera_make, @camera_model,
            @focal_length, @aperture, @shutter_speed, @iso
        )
    `);

    const updateAlbumCover = db.prepare(`
        UPDATE media_albums SET cover_image_id = @imageId WHERE id = @albumId
    `);

    for (const albumName of albums) {
        console.log(`[Rebuild] Processing Album: ${albumName}`);
        
        // Create Album
        const albumResult = insertAlbum.run({
            name: albumName,
            description: `Images related to ${albumName}`
        });
        const albumId = albumResult.lastInsertRowid;
        
        // Process Images
        const albumPath = join(MEDIA_ROOT, albumName);
        const files = readdirSync(albumPath).filter(f => {
            const ext = f.split('.').pop()?.toLowerCase();
            return ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
        });

        let firstImageId: bigint | number | null = null;

        for (const file of files) {
            const filePath = join(albumPath, file);
            const stats = statSync(filePath);
            const webPath = `/data/media/images/${albumName}/${file}`;
            const ext = file.split('.').pop()?.toLowerCase() || 'jpg';
            
            let width = 0;
            let height = 0;
            let dateTaken = null;
            let make = null;
            let model = null;
            let focal = null;
            let aperture = null;
            let shutter = null;
            let iso = null;

            // Attempt EXIF extraction
            if (['jpg', 'jpeg'].includes(ext)) {
                try {
                    const buffer = readFileSync(filePath);
                    const parser = exifParser.default.create(buffer);
                    const result = parser.parse();
                    
                    if (result.tags) {
                        width = result.tags.ExifImageWidth || result.imageSize?.width || 0;
                        height = result.tags.ExifImageHeight || result.imageSize?.height || 0;
                        // DateTimeOriginal is usually a timestamp or string
                        if (result.tags.DateTimeOriginal) {
                             dateTaken = new Date(result.tags.DateTimeOriginal * 1000).toISOString();
                        }
                        make = result.tags.Make;
                        model = result.tags.Model;
                        focal = result.tags.FocalLength ? result.tags.FocalLength.toString() : null;
                        aperture = result.tags.FNumber ? `f/${result.tags.FNumber}` : null;
                        shutter = result.tags.ExposureTime ? `${result.tags.ExposureTime}s` : null;
                        iso = result.tags.ISO ? result.tags.ISO.toString() : null;
                    }
                } catch (e) {
                   // Ignore parsing errors
                }
            }

            const imgResult = insertImage.run({
                filename: file,
                path: webPath,
                title: file.split('.')[0], 
                album_id: albumId,
                size: stats.size, // integer bytes
                format: ext,
                width,
                height,
                date_taken: dateTaken,
                camera_make: make,
                camera_model: model,
                focal_length: focal,
                aperture,
                shutter_speed: shutter,
                iso
            });

            if (!firstImageId) firstImageId = imgResult.lastInsertRowid;
        }

        // Set cover image to first image
        if (firstImageId) {
            updateAlbumCover.run({ imageId: firstImageId, albumId: albumId });
        }
    }
    console.log('[Rebuild] Media Ingestion Complete.');
}
