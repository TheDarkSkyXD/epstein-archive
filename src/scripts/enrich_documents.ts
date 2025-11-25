import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log('Starting document enrichment...');

const documents = db.prepare('SELECT id, file_name, content, date_created, metadata_json FROM documents').all() as any[];
console.log(`Found ${documents.length} documents to process.`);

const updateStmt = db.prepare(`
  UPDATE documents 
  SET title = @title, 
      date_created = @date_created, 
      metadata_json = @metadata_json
  WHERE id = @id
`);

const DATE_PATTERNS = [
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g,
  /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
  /\b\d{4}-\d{2}-\d{2}\b/g
];

let updatedCount = 0;

db.transaction(() => {
  for (const doc of documents) {
    const content = doc.content || '';
    let title = doc.file_name;
    let dateCreated = doc.date_created;
    let metadata: any = {};
    
    try {
      if (doc.metadata_json) {
        metadata = JSON.parse(doc.metadata_json);
      }
    } catch (e) {
      // Ignore metadata parsing errors
    }

    // --- CATEGORIZATION ---
    const categories = new Set<string>();
    const firstLines = content.split('\n').slice(0, 20).join('\n'); // Check header area

    // Email detection
    if (
      /From:\s/.test(firstLines) && 
      /To:\s/.test(firstLines) && 
      (/Subject:\s/.test(firstLines) || /Sent:\s/.test(firstLines))
    ) {
      categories.add('Email');
    }

    // Legal detection
    if (
      /case\s+no\.?/i.test(firstLines) || 
      /\sv\.\s/.test(firstLines) || 
      /deposition/i.test(firstLines) || 
      /affidavit/i.test(firstLines) || 
      /court/i.test(firstLines) ||
      /plaintiff/i.test(firstLines) ||
      /defendant/i.test(firstLines)
    ) {
      categories.add('Legal');
    }

    // Flight Log detection
    if (
      /N908JE/i.test(content) || 
      /flight\s+log/i.test(content) ||
      /passenger\s+list/i.test(content)
    ) {
      categories.add('Flight Log');
    }

    // Article/News detection
    if (
      /http[s]?:\/\//.test(firstLines) || 
      /published:/i.test(firstLines) ||
      /byline:/i.test(firstLines)
    ) {
      categories.add('Article');
    }

    // Default category
    if (categories.size === 0) {
      categories.add('Document');
    }

    metadata.categories = Array.from(categories);


    // --- TITLE EXTRACTION ---
    let extractedTitle = '';

    // 1. Email Subject
    if (categories.has('Email')) {
      const subjectMatch = firstLines.match(/^Subject:[\s]*(.+)$/im);
      if (subjectMatch) {
        extractedTitle = subjectMatch[1].trim();
      }
    }

    // 2. Legal Case/Deposition
    if (!extractedTitle && categories.has('Legal')) {
      const depoMatch = firstLines.match(/Deposition\s+of\s+([A-Z][a-zA-Z\s]+)/i);
      if (depoMatch) {
        extractedTitle = `Deposition of ${depoMatch[1].trim()}`;
      } else {
        const vsMatch = firstLines.match(/([A-Z][a-zA-Z\s]+)\s+v\.\s+([A-Z][a-zA-Z\s]+)/);
        if (vsMatch) {
          extractedTitle = `${vsMatch[1].trim()} v. ${vsMatch[2].trim()}`;
        }
      }
    }

    // 3. Fallback: First meaningful line
    if (!extractedTitle) {
      const lines = content.split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0 && !l.startsWith('http'));
      
      if (lines.length > 0) {
        let candidate = lines[0];
        // If first line is very short (e.g. "Page 1"), take the next one
        if (candidate.length < 10 && lines.length > 1) {
          candidate = lines[1];
        }
        if (candidate.length < 100) {
          extractedTitle = candidate;
        }
      }
    }

    // 4. Final Fallback: Filename cleanup
    if (!extractedTitle || extractedTitle.includes('Unknown')) {
      extractedTitle = doc.file_name
        .replace(/\.[^/.]+$/, "") // Remove extension
        .replace(/_/g, " ")       // Replace underscores
        .replace(/-/g, " ");      // Replace hyphens
    }

    // Clean title
    title = extractedTitle.replace(/[<>:"/\\|?*]/g, '').trim();
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    // Append original filename as requested
    title = `${title} (${doc.file_name})`;

    // --- DATE EXTRACTION ---
    const dates = new Set<string>();
    DATE_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach((m: string) => dates.add(m));
    });
    
    const dateArray = Array.from(dates);
    metadata.dates = dateArray;
    
    // Update date_created if missing
    if (!dateCreated && dateArray.length > 0) {
      // Try to parse dates and find earliest
      const validDates = dateArray.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
      if (validDates.length > 0) {
        validDates.sort((a, b) => a.getTime() - b.getTime());
        dateCreated = validDates[0].toISOString();
      }
    }
    
    // Fallback date if still missing
    if (!dateCreated) {
        dateCreated = new Date().toISOString(); // Default to now if absolutely no date found
    }

    updateStmt.run({
      id: doc.id,
      title: title,
      date_created: dateCreated,
      metadata_json: JSON.stringify(metadata)
    });
    
    updatedCount++;
    if (updatedCount % 100 === 0) process.stdout.write('.');
  }
})();

console.log(`\nEnriched ${updatedCount} documents.`);
db.close();
