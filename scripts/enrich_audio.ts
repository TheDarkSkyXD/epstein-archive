import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');

const db = new Database(DB_PATH);

// --- Albums Configuration ---
const ALBUMS = [
  {
    name: 'Sascha Barros Interviews',
    description:
      'Interviews and testimony from Manuel Sascha Barros, detailing experiences and providing forensic context.',
    matchPattern: /SRTestimony|Sascha/i,
  },
  {
    name: 'Ghislaine Maxwell Interviews',
    description: 'Recorded interviews with Ghislaine Maxwell from July 2025.',
    matchPattern: /Maxwell_2025/i,
  },
  {
    name: 'DOJ Audio Evidence',
    description: 'Audio files released as part of Department of Justice productions.',
    matchPattern: /DOJ-OGR/i,
  },
];

function getOrCreateAlbum(name: string, description: string) {
  const row = db.prepare('SELECT id FROM media_albums WHERE name = ?').get(name) as
    | { id: number }
    | undefined;
  if (row) return row.id;

  const result = db
    .prepare('INSERT INTO media_albums (name, description) VALUES (?, ?)')
    .run(name, description);
  return result.lastInsertRowid as number;
}

function processAudioFiles() {
  const audioFiles = db
    .prepare<
      [],
      { id: number; file_path: string; description: string; title: string }
    >(`SELECT id, file_path, description, title FROM media_items WHERE file_type LIKE 'audio%' OR file_type LIKE 'video%'`)
    .all();

  console.log(`Found ${audioFiles.length} media files to process.`);

  const updates = db.prepare(
    `UPDATE media_items SET title = ?, description = ?, album_id = ? WHERE id = ?`,
  );

  for (const file of audioFiles) {
    const filename = path.basename(file.file_path);
    let albumId: number | null = null;
    let newTitle = file.title || filename; // Keep existing title if set, else use filename
    let newDescription = file.description || '';

    // 1. Assign Album
    for (const albumDef of ALBUMS) {
      if (albumDef.matchPattern.test(filename) || albumDef.matchPattern.test(file.file_path)) {
        albumId = getOrCreateAlbum(albumDef.name, albumDef.description);
        break;
      }
    }

    // 2. Enrich Metadata from External Transcripts
    // Logic to find matching text file
    let transcriptPath: string | null = null;

    // Check specific mappings
    if (filename.includes('SRTestimony')) {
      // Map SRTestimonyA -> 1, B -> 2, etc.
      const match = filename.match(/SRTestimony([A-F])/i);
      if (match) {
        const letter = match[1].toUpperCase();
        const map: Record<string, string> = { A: '1', B: '2', C: '3', D: '4', E: '5', F: '6' };
        const num = map[letter];

        if (num) {
          // Look for [num]_eng.txt in data/text/lvoocaudiop1
          const dir = path.join(process.cwd(), 'data/text/lvoocaudiop1');
          const targetFile = `${num}_eng.txt`;
          const targetPath = path.join(dir, targetFile);

          if (fs.existsSync(targetPath)) {
            transcriptPath = targetPath;

            // Set specific descriptive title
            const titles: Record<string, string> = {
              '1': 'Part 1: Initial Recruitment & Grooming',
              '2': 'Part 2: The Network Structure',
              '3': 'Part 3: International trafficking',
              '4': 'Part 4: Financial Inducements',
              '5': 'Part 5: Co-conspirators & Enablers',
              '6': 'Part 6: Aftermath & Harassment',
            };
            newTitle = `Sascha Barros Testimony - ${titles[num]}`;
          }
        }
      }
    } else if (filename.includes('Maxwell')) {
      // Look in data/text/maxwell_interviews
      const dir = path.join(process.cwd(), 'data/text/maxwell_interviews');
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        // Simple contains match
        const baseName = path.basename(filename, path.extname(filename));
        const found = files.find((f) => f.includes(baseName) && f.endsWith('.txt'));
        if (found) transcriptPath = path.join(dir, found);
      }
    }

    if (transcriptPath && fs.existsSync(transcriptPath)) {
      const content = fs.readFileSync(transcriptPath, 'utf-8');

      // Improve Title: Use first non-empty line or specific logic
      const lines = content
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length > 0) {
        // Heuristic: If first line is short (< 100 chars), use it as title context
        // Only update title if we didn't set a specific one above
        if (!newTitle.includes('Sascha Barros Testimony')) {
          const candidateTitle = lines[0];
          if (candidateTitle.length < 100 && !candidateTitle.includes('http')) {
            newTitle = candidateTitle.replace(/[\"#]/g, '').trim();
          }
        }
      }

      // Improve Description: Summary of first 500 chars if not already set manually
      if (!newDescription || newDescription.length < 50) {
        const summary = content.substring(0, 500).replace(/\s+/g, ' ').trim() + '...';
        newDescription = summary;
      } else {
        // Append context if description exists
        const summary = content.substring(0, 300).replace(/\s+/g, ' ').trim() + '...';
        newDescription = `${newDescription}\n\nTranscript Excerpt: ${summary}`;
      }

      console.log(`Enriched ${filename} -> Title: "${newTitle}"`);
    }

    if (albumId || newTitle !== file.title || newDescription !== file.description) {
      updates.run(newTitle, newDescription, albumId, file.id);
      console.log(`Updated ${filename}: Album=${albumId}, Title=${newTitle}`);
    }
  }
}

processAudioFiles();
console.log('Done.');
