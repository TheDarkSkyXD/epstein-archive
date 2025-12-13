/**
 * Generate Titles for Photo Documents
 * 
 * This script generates descriptive titles for images in the documents table
 * based on their file names and source patterns.
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive-production.db');

// Mapping of filename patterns to descriptive titles
const TITLE_PATTERNS: { pattern: RegExp; titleFn: (match: RegExpMatchArray, fileName: string) => string }[] = [
  // House Oversight photos - HOUSE_OVERSIGHT_XXXXXX.jpg
  { 
    pattern: /^HOUSE_OVERSIGHT_(\d+)\./i, 
    titleFn: (m) => `House Oversight Document #${m[1]}` 
  },
  
  // Court exhibit images - EXHIBIT_X_XXXX.jpg
  { 
    pattern: /^EXHIBIT[_\s-]*(\w+)[_\s-]*(\d*)\./i, 
    titleFn: (m) => `Court Exhibit ${m[1]}${m[2] ? '-' + m[2] : ''}` 
  },
  
  // Flight log scans - flight_log*.jpg or FlightLog*.jpg
  { 
    pattern: /^flight[_\s-]?log[_\s-]?(\d*)\./i, 
    titleFn: (m) => `Flight Log Page${m[1] ? ' ' + m[1] : ''}` 
  },
  
  // Black Book scans - blackbook* or contact*
  { 
    pattern: /^(black[_\s-]?book|contact)[_\s-]?(\d*)\./i, 
    titleFn: (m) => `Black Book Page${m[2] ? ' ' + m[2] : ''}` 
  },
  
  // Deposition exhibits
  { 
    pattern: /^(giuffre|maxwell|roberts|farmer|ransome)[_\s-]?depo?[_\s-]?(\d*)/i, 
    titleFn: (m) => `${m[1].charAt(0).toUpperCase() + m[1].slice(1)} Deposition Exhibit${m[2] ? ' ' + m[2] : ''}` 
  },
  
  // Generic page scans - page*.jpg or p*.jpg
  { 
    pattern: /^p(?:age)?[_\s-]?(\d+)\./i, 
    titleFn: (m) => `Document Page ${m[1]}` 
  },
  
  // Scanned documents with numbers
  { 
    pattern: /^(\d{6,})\./i, 
    titleFn: (m) => `Scanned Document #${m[1]}` 
  },
  
  // Photos with dates - IMG_YYYYMMDD_XXXX.jpg
  { 
    pattern: /^IMG[_-](\d{4})(\d{2})(\d{2})[_-]?(\d*)/i, 
    titleFn: (m) => {
      const year = m[1];
      const month = new Date(parseInt(year), parseInt(m[2]) - 1, 1).toLocaleString('en-US', { month: 'short' });
      const day = m[3];
      return `Photo (${month} ${parseInt(day)}, ${year})`;
    }
  },
  
  // DJI drone footage
  { 
    pattern: /^DJI[_-](\d+)/i, 
    titleFn: () => 'Drone Footage - Little St. James Island' 
  },
  
  // Video files
  { 
    pattern: /^MVI[_-](\d+)/i, 
    titleFn: () => 'Video Recording - Property Footage' 
  },
  
  // Property photos
  { 
    pattern: /^IMG[_-](\d+)/i, 
    titleFn: (m) => `Property Photo #${m[1].slice(-4)}` 
  },
  
  // Email attachments
  { 
    pattern: /^(email|attachment)[_\s-]?(\d*)/i, 
    titleFn: (m) => `Email Attachment${m[2] ? ' ' + m[2] : ''}` 
  },
  
  // Court filings
  { 
    pattern: /^(case|docket|filing)[_\s-]?(\d*)/i, 
    titleFn: (m) => `Court Filing${m[2] ? ' #' + m[2] : ''}` 
  },
];

function generateTitle(fileName: string, evidenceType: string): string {
  // Try each pattern
  for (const { pattern, titleFn } of TITLE_PATTERNS) {
    const match = fileName.match(pattern);
    if (match) {
      return titleFn(match, fileName);
    }
  }
  
  // Fallback: Clean up the filename
  const baseName = path.basename(fileName, path.extname(fileName));
  
  // Remove common prefixes and clean up
  let cleanName = baseName
    .replace(/^(scan|img|photo|image|doc|document)[_-]*/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Capitalize first letter of each word
  if (cleanName) {
    cleanName = cleanName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Add evidence type context
  const typeLabel: Record<string, string> = {
    'photo': 'Photo',
    'legal': 'Legal Document',
    'deposition': 'Deposition Exhibit',
    'email': 'Email Attachment',
    'financial': 'Financial Record',
    'article': 'News Article Image',
    'document': 'Document Scan'
  };
  
  const prefix = typeLabel[evidenceType] || 'Evidence';
  
  if (cleanName && cleanName.length > 3 && !/^\d+$/.test(cleanName)) {
    return cleanName;
  }
  
  return `${prefix} - ${baseName}`;
}

async function main() {
  console.log('🔄 Generating titles for photo documents...\n');
  console.log(`📂 Database: ${DB_PATH}`);
  
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  
  // Get all photo documents without meaningful titles
  const photos = db.prepare(`
    SELECT id, file_name, evidence_type, title
    FROM documents 
    WHERE (evidence_type = 'photo' OR file_type = 'image')
      AND (title IS NULL OR title = '' OR title = file_name)
  `).all() as any[];
  
  console.log(`📊 Found ${photos.length} photos needing titles\n`);
  
  const updateStmt = db.prepare(`UPDATE documents SET title = ? WHERE id = ?`);
  
  let updated = 0;
  const titleCounts: Record<string, number> = {};
  
  const updateTransaction = db.transaction(() => {
    for (const photo of photos) {
      const title = generateTitle(photo.file_name, photo.evidence_type);
      updateStmt.run(title, photo.id);
      updated++;
      
      // Track title patterns
      const prefix = title.split(' ').slice(0, 2).join(' ');
      titleCounts[prefix] = (titleCounts[prefix] || 0) + 1;
      
      if (updated <= 10) {
        console.log(`✅ ${photo.file_name} -> "${title}"`);
      }
    }
  });
  
  updateTransaction();
  
  console.log(`\n📊 Summary:`);
  console.log(`   Photos updated: ${updated}`);
  console.log(`\n📊 Title Pattern Distribution:`);
  const sortedPatterns = Object.entries(titleCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [pattern, count] of sortedPatterns) {
    console.log(`   ${pattern}...: ${count}`);
  }
  
  db.close();
  console.log('\n✅ Title generation complete!');
}

main().catch(console.error);
