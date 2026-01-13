/**
 * Generate sensible titles for audio/video media items from transcripts
 *
 * This script:
 * 1. Reads existing media items without proper titles
 * 2. Extracts key information from transcripts
 * 3. Generates concise, descriptive titles
 * 4. Updates the database with new titles
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');

interface MediaItem {
  id: number;
  title: string;
  file_path: string;
  file_type: string;
  metadata_json: string;
}

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

function extractKeyPhrases(transcript: TranscriptSegment[]): string[] {
  const allText = transcript.map((s) => s.text).join(' ');
  const phrases: string[] = [];

  // Extract names (capitalized words that appear multiple times)
  const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const names = allText.match(namePattern) || [];
  const nameFreq = names.reduce(
    (acc, name) => {
      if (
        name.length > 3 &&
        !['From', 'The', 'This', 'That', 'They', 'There', 'Then'].includes(name)
      ) {
        acc[name] = (acc[name] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  // Get top 2 most frequent names
  const topNames = Object.entries(nameFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name]) => name);

  phrases.push(...topNames);

  // Extract key terms
  const keyTerms = [
    'testimony',
    'interview',
    'deposition',
    'statement',
    'investigation',
    'case',
    'evidence',
    'witness',
    'information',
    'call',
    'voicemail',
    'message',
  ];

  for (const term of keyTerms) {
    if (allText.toLowerCase().includes(term)) {
      phrases.push(term);
      break; // Only add one key term
    }
  }

  return phrases;
}

function generateTitle(item: MediaItem, metadata: any): string {
  const filename = path.basename(item.file_path, path.extname(item.file_path));

  // If it already has a good title (not just filename), keep it
  if (item.title && item.title !== filename && !item.title.match(/^(EFTA|SR|DOJ)/)) {
    return item.title;
  }

  // Use transcript to generate title
  if (metadata.transcript && Array.isArray(metadata.transcript) && metadata.transcript.length > 0) {
    const transcript = metadata.transcript as TranscriptSegment[];
    const phrases = extractKeyPhrases(transcript);

    // Get first few words of transcript for context
    const firstText = transcript[0].text.slice(0, 100);

    // Determine type of content
    let titleType = 'Recording';
    if (
      firstText.toLowerCase().includes('testimony') ||
      firstText.toLowerCase().includes('deposition')
    ) {
      titleType = 'Testimony';
    } else if (firstText.toLowerCase().includes('interview')) {
      titleType = 'Interview';
    } else if (
      firstText.toLowerCase().includes('voicemail') ||
      firstText.toLowerCase().includes('message')
    ) {
      titleType = 'Voicemail';
    } else if (
      firstText.toLowerCase().includes('news') ||
      firstText.toLowerCase().includes('abc') ||
      firstText.toLowerCase().includes('report')
    ) {
      titleType = 'News Report';
    } else if (firstText.toLowerCase().includes('call')) {
      titleType = 'Phone Call';
    }

    // Build title
    const namePart = phrases
      .filter((p) => p[0] === p[0].toUpperCase())
      .slice(0, 2)
      .join(' & ');

    if (namePart) {
      return `${titleType}: ${namePart}`;
    } else {
      // Use first meaningful sentence
      const firstSentence = firstText.split(/[.!?]/)[0].trim();
      if (firstSentence.length > 10 && firstSentence.length < 60) {
        return `${titleType} - ${firstSentence}`;
      }
    }
  }

  // Fallback: Parse filename for structure
  if (filename.match(/EFTA\d+/)) {
    return `DOJ Evidence File ${filename}`;
  }

  if (filename.match(/SR.*?([A-F])of6/i)) {
    const part = filename.match(/([A-F])of6/i)?.[1];
    return `Testimony Part ${part}`;
  }

  // Last resort: use filename with spaces
  return filename.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

async function main() {
  console.log('🎬 Starting media title generation...\n');

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  try {
    // Get all audio/video items
    const items = db
      .prepare(
        `
      SELECT id, title, file_path, file_type, metadata_json
      FROM media_items
      WHERE file_type LIKE 'audio/%' OR file_type LIKE 'video/%'
      ORDER BY id
    `,
      )
      .all() as MediaItem[];

    console.log(`📊 Found ${items.length} media items\n`);

    let updated = 0;
    let skipped = 0;

    const updateStmt = db.prepare(`
      UPDATE media_items
      SET title = ?
      WHERE id = ?
    `);

    for (const item of items) {
      let metadata: any = {};
      try {
        if (item.metadata_json) {
          metadata = JSON.parse(item.metadata_json);
        }
      } catch (e) {
        console.error(`⚠️  Failed to parse metadata for item ${item.id}`);
        continue;
      }

      const newTitle = generateTitle(item, metadata);

      if (newTitle !== item.title) {
        updateStmt.run(newTitle, item.id);
        console.log(`✅ ID ${item.id}: "${item.title}" → "${newTitle}"`);
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`\n🎉 Title generation complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${items.length}`);
  } catch (error) {
    console.error('❌ Error during title generation:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
