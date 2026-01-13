
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const TEXT_ROOT = 'data/text/lvoocaudiop1';
const db = new Database(DB_PATH);

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

function parseTimestamp(timeStr: string): number {
  // 00:00:00,060
  const [hms, ms] = timeStr.split(',');
  const [h, m, s] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + s + (parseInt(ms) / 1000);
}

function parseSRTTranscript(content: string): TranscriptSegment[] {
  const lines = content.split('\n');
  const segments: TranscriptSegment[] = [];
  
  let currentStart = 0;
  let currentEnd = 0;
  let currentSpeaker = '';
  let currentText = '';
  
  // Regex for timestamp line: 00:00:00,060 --> 00:00:02,960 [Speaker]
  const timeRegex = /^(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\s*(\[.*?\])?/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const match = line.match(timeRegex);
    if (match) {
        // Find end of previous segment (if any) and push it
        if (currentText) {
            segments.push({
                start: currentStart,
                end: currentEnd,
                text: currentText.trim(),
                speaker: currentSpeaker
            });
            currentText = '';
        }
        
        // Start new segment
        currentStart = parseTimestamp(match[1]);
        currentEnd = parseTimestamp(match[2]);
        currentSpeaker = match[3] ? match[3].replace(/[\[\]]/g, '') : 'Unknown';
    } else {
        // Content line
        if (line.startsWith('--') && line.endsWith('--')) continue; // Skip page markers
        currentText += ' ' + line;
    }
  }
  
  // Push last segment
  if (currentText) {
      segments.push({
          start: currentStart,
          end: currentEnd,
          text: currentText.trim(),
          speaker: currentSpeaker
      });
  }
  
  return segments;
}

function fixSaschaTranscripts() {
  console.log('🛠️ Fixing Sascha Barron Transcripts...');
  
  // Map Part -> File
  const map: {[key: string]: string} = {
      'Part 1': '1_eng.txt',
      'Part 2': '2_eng.txt',
      'Part 3': '3_eng.txt',
      'Part 4': '4_eng.txt',
      'Part 5': '5_eng.txt',
      'Part 6': '6_eng.txt'
  };
  
  const files = db.prepare("SELECT id, title, metadata_json FROM media_items WHERE title LIKE 'Sascha Barron Testimony - Part%'").all() as {id: number, title: string, metadata_json: string}[];
  
  console.log(`   Found ${files.length} DB records.`);

  const updateStmt = db.prepare('UPDATE media_items SET metadata_json = ? WHERE id = ?');

  db.transaction(() => {
      for (const record of files) {
          const partMatch = record.title.match(/Part (\d)/);
          if (!partMatch) continue;
          
          const partName = `Part ${partMatch[1]}`;
          const filename = map[partName];
          const txtPath = path.join(TEXT_ROOT, filename);
          
          if (fs.existsSync(txtPath)) {
             console.log(`   📝 Parsing ${filename} for ${record.title}...`);
             const content = fs.readFileSync(txtPath, 'utf-8');
             const segments = parseSRTTranscript(content);
             
             let meta: any = {};
             try {
                 meta = JSON.parse(record.metadata_json || '{}');
             } catch {}
             
             // UNIFY KEYS
             // Most of the app uses 'transcript_segments' or 'transcript' ?
             // 'ingest_audio' used 'transcript'. 
             // AudioPlayer often checks 'transcript_segments'.
             // Let's populate BOTH to be safe.
             meta.transcript = segments;
             meta.transcript_segments = segments; 
             meta.chapters = [
                 { title: 'Start', start: 0 },
                 ...segments.filter((s, i) => i > 0 && i % 20 === 0).map(s => ({ title: `Segment ${Math.floor(s.start/60)}m`, start: s.start }))
             ].slice(0, 10); // Limit chapters
             
             updateStmt.run(JSON.stringify(meta), record.id);
             console.log(`      ✅ Updated with ${segments.length} segments.`);
          } else {
              console.log(`      ❌ Transcript file not found: ${txtPath}`);
          }
      }
  })();
  
  console.log('✅ Transcript Fix Complete.');
}

fixSaschaTranscripts();
