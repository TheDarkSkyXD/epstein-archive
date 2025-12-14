
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration ---
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../epstein-archive-production.db');
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../data');
const EMAILS_DIR = path.join(DATA_DIR, 'emails');
const EHUD_BARAK_DIR = path.join(EMAILS_DIR, 'ehud_barak_emails');
const JEEPROJECT_DIR = path.join(DATA_DIR, 'emails/jeeproject_yahoo'); // Corrected path based on previous ls

// --- Database Setup ---
const db = new Database(DB_PATH);

// Helper for logging
const log = (msg: string) => console.log(`[Email Ingest] ${msg}`);

// --- Types ---
interface EmailDoc {
  title: string;
  date?: string; // ISO string if available
  sender?: string;
  recipient?: string;
  content: string;
  file_path: string;
  evidence_type: string;
  metadata: any;
}

// --- Parsing Helpers ---

// Strip HTML tags for search content
function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, ' ')
             .replace(/&nbsp;/g, ' ')
             .replace(/\s+/g, ' ')
             .trim();
}

// Simple header parser for .eml content
function parseHeaders(content: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const headerSection = content.split(/\r?\n\r?\n/)[0]; // Split at first double newline
  const lines = headerSection.split(/\r?\n/);
  
  let currentKey = '';
  for (const line of lines) {
    // Check for continuation line (starts with space/tab)
    if (/^\s/.test(line) && currentKey) {
      headers[currentKey] += ' ' + line.trim();
    } else {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        currentKey = match[1].toLowerCase();
        headers[currentKey] = match[2].trim();
      }
    }
  }
  return headers;
}

// Basic multipart parser
function extractBody(content: string, contentTypeHeader: string | undefined): string {
  // If no content type, assume text
  if (!contentTypeHeader) return content;

  // Check for boundary
  const boundaryMatch = contentTypeHeader.match(/boundary="?([^";]+)"?/);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = content.split(`--${boundary}`);
    
    // Prefer text/plain, then text/html
    let plainText = '';
    let htmlText = '';

    for (const part of parts) {
      if (part.trim() === '--' || !part.trim()) continue; // Skip end boundary or empty

      // Parse part headers
      const [partHeadersRaw, ...partBodyLines] = part.split(/\r?\n\r?\n/);
      const partBody = partBodyLines.join('\n');
      const partHeaders = parseHeaders(partHeadersRaw || ''); // Handle case where split fails? split header usually works
      
      const partType = partHeaders['content-type'] || '';
      
      if (partType.includes('text/plain')) {
        plainText += partBody;
      } else if (partType.includes('text/html')) {
        htmlText += partBody;
      } else if (partType.includes('multipart/')) {
          // Recursive? Maybe too complex for now. 
          // If we find nested multipart, we might just try to grep text.
          // For now, let's keep it simple.
          const nested = extractBody(partBody, partType);
          if (nested) plainText += nested; 
      }
    }
    return plainText || stripHtml(htmlText);
  }

  // If not multipart but text/html
  if (contentTypeHeader.includes('text/html')) {
      const bodyParts = content.split(/\r?\n\r?\n/);
      // Determine where body starts - after first double newline of the file usually passed in "content"
      // But wait, parseHeaders took the first chunk. So if we passed full content to this function...
      // The `content` arg here assumes full raw email content for the simple case, 
      // BUT for parsed execution, `parseEml` below splits it.
      // Let's refine `extractBody` to take just the BODY part of the email.
      return stripHtml(content);
  }

  return content; // Fallback
}

// Orchestrator for EML parsing
function parseEml(rawContent: string): { headers: Record<string, string>, body: string } {
  const [headerChunk, ...bodyChunks] = rawContent.split(/\r?\n\r?\n/);
  const headers = parseHeaders(headerChunk);
  const rawBody = bodyChunks.join('\n\n'); // Reconstruct body if it had double newlines
  
  const body = extractBody(rawBody, headers['content-type']);
  return { headers, body };
}


// --- Ingestion Logic ---

async function ingestEhudBarak(dryRun: boolean) {
  log(`Scanning Ehud Barak Emails in ${EHUD_BARAK_DIR}...`);
  if (!fs.existsSync(EHUD_BARAK_DIR)) {
    log(`Directory not found: ${EHUD_BARAK_DIR}`);
    return;
  }

  const files = fs.readdirSync(EHUD_BARAK_DIR);
  // Group by ID
  const groups: Record<string, { meta?: string, html?: string, id: string }> = {};
  
  for (const file of files) {
    // Extract ID: 0000000343-...
    const match = file.match(/^(\d+)-/);
    if (!match) continue;
    const id = match[1];
    
    if (!groups[id]) groups[id] = { id };
    
    if (file.endsWith('.eml.meta')) groups[id].meta = file;
    else if (file.endsWith('.html')) groups[id].html = file;
  }

  log(`Found ${Object.keys(groups).length} email groups.`);

  let processed = 0;
  const docsToInsert: EmailDoc[] = [];

  for (const id in groups) {
    const g = groups[id];
    let title = `Email ${id}`;
    let dateStr = '';
    let sender = '';
    let content = '';
    let metaJson: any = {};

    // 1. Process Metadata
    if (g.meta) {
      try {
        const metaPath = path.join(EHUD_BARAK_DIR, g.meta);
        const raw = fs.readFileSync(metaPath, 'utf-8');
        metaJson = JSON.parse(raw);
        if (metaJson.subject) title = metaJson.subject;
        if (metaJson.sender) sender = metaJson.sender;
        if (metaJson.date) {
            // Check if unix timestamp (seconds or ms)
            // Example: 1458419877 -> 2016. Looks like seconds.
            const d = new Date(metaJson.date * 1000);
            if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
        }
      } catch (e) {
        log(`Error parsing meta for ${id}: ${e}`);
      }
    }

    // 2. Process Content (HTML)
    if (g.html) {
      const htmlPath = path.join(EHUD_BARAK_DIR, g.html);
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      
      // Try to parse headers from HTML Table if we missed them in meta?
      // Actually meta is usually better for sender/date. 
      // But let's get the body.
      content = stripHtml(htmlContent);
      
      // If title is generic, try to find subject in content? 
      // Usually meta has it.
    }

    // Fallback if no content
    if (!content && metaJson.metadata) {
        content = metaJson.metadata; // Better than nothing
    }

    const doc: EmailDoc = {
      title,
      date: dateStr,
      sender,
      content,
      evidence_type: 'Ehud Barak Emails',
      file_path: '/data/emails/ehud_barak_emails/' + (g.html || g.meta), // virtual path
      metadata: metaJson
    };
    
    docsToInsert.push(doc);
    processed++;
  }

  log(`Prepared ${processed} Ehud Barak emails.`);
  if (!dryRun) await batchInsert(docsToInsert);
}

async function ingestJeeproject(dryRun: boolean) {
  log(`Scanning Jeeproject Emails in ${JEEPROJECT_DIR}...`);
  if (!fs.existsSync(JEEPROJECT_DIR)) {
    log(`Directory not found: ${JEEPROJECT_DIR}`);
    return;
  }

  const files = fs.readdirSync(JEEPROJECT_DIR).filter(f => f.endsWith('.eml') || f.endsWith('.eml.meta'));
  // Note: listing showed .eml and .eml.meta. The .eml is the main file. 
  // Let's focus on .eml.
  const emlFiles = files.filter(f => f.endsWith('.eml'));

  log(`Found ${emlFiles.length} .eml files.`);

  let processed = 0;
  const docsToInsert: EmailDoc[] = [];

  for (const file of emlFiles) {
    const filePath = path.join(JEEPROJECT_DIR, file);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    
    const { headers, body } = parseEml(rawContent);
    
    let dateStr = '';
    if (headers['date']) {
        const d = new Date(headers['date']);
        if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
    }

    const doc: EmailDoc = {
      title: headers['subject'] || file,
      date: dateStr,
      sender: headers['from'],
      recipient: headers['to'],
      content: body,
      evidence_type: 'Jeeproject Emails',
      file_path: '/data/emails/jeeproject_yahoo/' + file,
      metadata: headers
    };

    docsToInsert.push(doc);
    processed++;
  }

  log(`Prepared ${processed} Jeeproject emails.`);
  if (!dryRun) await batchInsert(docsToInsert);
}

// --- Database Insertion ---

async function batchInsert(docs: EmailDoc[]) {
  const insertStmt = db.prepare(`
    INSERT INTO documents (title, date_created, content, file_path, evidence_type, metadata_json, file_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const checkStmt = db.prepare(`SELECT id FROM documents WHERE file_path = ?`);

  const transaction = db.transaction((documents: EmailDoc[]) => {
    let inserted = 0;
    let skipped = 0;
    for (const doc of documents) {
      const exists = checkStmt.get(doc.file_path);
      if (exists) {
        skipped++;
        continue;
      }
      insertStmt.run(
        doc.title,
        doc.date,
        doc.content,
        doc.file_path,
        doc.evidence_type,
        JSON.stringify(doc.metadata),
        path.basename(doc.file_path)
      );
      inserted++;
    }
    log(`Inserted ${inserted}, Skipped ${skipped} duplicates.`);
  });

  transaction(docs);
}

// --- Main ---

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) log('Running in DRY RUN mode. No database changes.');

  try {
    await ingestEhudBarak(dryRun);
    await ingestJeeproject(dryRun);
    log('Ingestion complete.');
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

main();
