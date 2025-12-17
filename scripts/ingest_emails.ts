
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration ---
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../epstein-archive-production.db');
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../data');
const EMAILS_DIR = path.join(DATA_DIR, 'emails');
const EHUD_BARAK_DIR = path.join(EMAILS_DIR, 'ehud_barak_emails');
const JEEPROJECT_DIR = path.join(DATA_DIR, 'emails/jeeproject_yahoo');

// --- Database Setup ---
const db = new Database(DB_PATH);

// Helper for logging
const log = (msg: string) => console.log(`[Email Ingest] ${msg}`);

// --- Types ---
interface EmailDoc {
  title: string;
  date?: string; // ISO string
  sender?: string;
  recipient?: string;
  content: string;
  file_path: string;
  evidence_type: string;
  metadata: any;
  thread_id?: string;
}

// --- Parsing Helpers ---

// Better HTML strip: preserve newlines
function stripHtml(html: string): string {
  if (!html) return '';
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>?/gm, ' ') // Strip remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
  
  // Collapse multiple spaces/newlines
  text = text.replace(/\s+/g, ' ').trim(); 
  
  return text; 
}

function normalizeSubject(subject: string): string {
    if (!subject) return '';
    return subject.replace(/^(re|fwd|fw):\s*/i, '').trim().toLowerCase();
}

function getThreadId(headers: Record<string, string>, subject: string): string {
    // 1. Use References (first ID is usually thread root)
    if (headers['references']) {
        const refs = headers['references'].split(/\s+/).map(r => r.trim()).filter(r => r);
        if (refs.length > 0) return refs[0]; // Root ID
    }
    // 2. Use In-Reply-To (if no refs, parent is thread ID - imperfect but works for simple reply)
    if (headers['in-reply-to']) {
        return headers['in-reply-to'];
    }
    // 3. Fallback: Subject grouping
    const norm = normalizeSubject(subject);
    if (norm) {
        return crypto.createHash('md5').update(norm).digest('hex');
    }
    // 4. Unique
    return crypto.randomUUID();
}


// Enhanced header parser
function parseHeaders(content: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const headerSection = content.split(/\r?\n\r?\n/)[0]; 
  const lines = headerSection.split(/\r?\n/);
  
  let currentKey = '';
  for (const line of lines) {
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
  if (!contentTypeHeader) return content;

  const boundaryMatch = contentTypeHeader.match(/boundary="?([^";]+)"?/);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = content.split(`--${boundary}`);
    
    let plainText = '';
    let htmlText = '';

    for (const part of parts) {
      if (part.trim() === '--' || !part.trim()) continue;

      const [partHeadersRaw, ...partBodyLines] = part.split(/\r?\n\r?\n/);
      const partBody = partBodyLines.join('\n');
      const partHeaders = parseHeaders(partHeadersRaw || '');
      
      const partType = partHeaders['content-type'] || '';
      
      if (partType.includes('text/plain')) {
        plainText += partBody;
      } else if (partType.includes('text/html')) {
        htmlText += partBody;
      } else if (partType.includes('multipart/')) {
          const nested = extractBody(partBody, partType);
          if (nested) plainText += nested; 
      }
    }
    return plainText || stripHtml(htmlText);
  }

  if (contentTypeHeader.includes('text/html')) {
      return stripHtml(content);
  }

  return content;
}

function parseEml(rawContent: string): { headers: Record<string, string>, body: string } {
  const [headerChunk, ...bodyChunks] = rawContent.split(/\r?\n\r?\n/);
  const headers = parseHeaders(headerChunk);
  const rawBody = bodyChunks.join('\n\n');
  const body = extractBody(rawBody, headers['content-type']);
  return { headers, body };
}


// --- Ingestion Logic ---

async function ingestEhudBarak(dryRun: boolean) {
  log(`Scanning Ehud Barak Emails in ${EHUD_BARAK_DIR}...`);
  if (!fs.existsSync(EHUD_BARAK_DIR)) return;

  const files = fs.readdirSync(EHUD_BARAK_DIR);
  const groups: Record<string, { meta?: string, html?: string, id: string }> = {};
  
  for (const file of files) {
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
    let threadId = `ehud_${id}`; 

    if (g.meta) {
      try {
        const metaPath = path.join(EHUD_BARAK_DIR, g.meta);
        const raw = fs.readFileSync(metaPath, 'utf-8');
        metaJson = JSON.parse(raw);
        if (metaJson.subject) title = metaJson.subject;
        if (metaJson.sender) sender = metaJson.sender;
        if (metaJson.date) {
            const d = new Date(metaJson.date * 1000);
            if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
        }
        if (metaJson.parent_id) {
            threadId = `ehud_${metaJson.parent_id}`;
            // Ehud Barak files often have parent_id = self ID if root?
            // If parent_id === id, it's root.
            if (String(metaJson.parent_id) === String(id)) {
                 threadId = `ehud_${id}`;   
            }
        } else {
            threadId = getThreadId({}, title);
        }

      } catch (e) {
        log(`Error parsing meta for ${id}: ${e}`);
      }
    }

    if (g.html) {
      const htmlPath = path.join(EHUD_BARAK_DIR, g.html);
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      content = stripHtml(htmlContent);
    }

    if (!content && metaJson.metadata) {
        content = metaJson.metadata;
    }

    const finalMeta = {
        ...metaJson,
        from: sender,
        subject: title,
        thread_id: threadId,
        source_account: 'Ehud Barak'
    };

    const doc: EmailDoc = {
      title,
      date: dateStr,
      sender,
      content,
      evidence_type: 'Ehud Barak Emails',
      file_path: '/data/emails/ehud_barak_emails/' + (g.html || g.meta),
      metadata: finalMeta
    };
    
    docsToInsert.push(doc);
    processed++;
  }

  log(`Prepared ${processed} Ehud Barak emails.`);
  if (!dryRun) await batchInsert(docsToInsert);
}

async function ingestJeeproject(dryRun: boolean) {
  log(`Scanning Jeeproject Emails in ${JEEPROJECT_DIR}...`);
  if (!fs.existsSync(JEEPROJECT_DIR)) return;

  const files = fs.readdirSync(JEEPROJECT_DIR).filter(f => f.endsWith('.eml'));
  log(`Found ${files.length} .eml files.`);

  let processed = 0;
  const docsToInsert: EmailDoc[] = [];

  for (const file of files) {
    const filePath = path.join(JEEPROJECT_DIR, file);
    try {
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const { headers, body } = parseEml(rawContent);
        
        let dateStr = '';
        if (headers['date']) {
            const d = new Date(headers['date']);
            if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
        }

        const subject = headers['subject'] || file;
        const threadId = getThreadId(headers, subject);

        const metadata = {
            ...headers,
            thread_id: threadId,
            message_id: headers['message-id'],
            source_account: 'Jeeproject Yahoo'
        };

        const doc: EmailDoc = {
            title: subject,
            date: dateStr,
            sender: headers['from'],
            recipient: headers['to'],
            content: body,
            evidence_type: 'Jeeproject Emails',
            file_path: '/data/emails/jeeproject_yahoo/' + file,
            metadata: metadata
        };

        docsToInsert.push(doc);
        processed++;
    } catch (e) {
        log(`Failed to process ${file}: ${e}`);
    }
  }

  log(`Prepared ${processed} Jeeproject emails.`);
  if (!dryRun) await batchInsert(docsToInsert);
}

async function batchInsert(docs: EmailDoc[]) {
  const insertStmt = db.prepare(`
    INSERT INTO documents (title, date_created, content, file_path, evidence_type, metadata_json, file_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE documents 
    SET title=?, date_created=?, content=?, evidence_type=?, metadata_json=?, file_name=?
    WHERE file_path=?
  `);

  const checkStmt = db.prepare(`SELECT id FROM documents WHERE file_path = ?`);

  const transaction = db.transaction((documents: EmailDoc[]) => {
    let inserted = 0;
    let updated = 0;
    for (const doc of documents) {
      const existing = checkStmt.get(doc.file_path);
      if (existing) {
        updateStmt.run(
            doc.title,
            doc.date,
            doc.content,
            doc.evidence_type,
            JSON.stringify(doc.metadata),
            path.basename(doc.file_path),
            doc.file_path
        );
        updated++;
      } else {
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
    }
    log(`Inserted ${inserted}, Updated ${updated}.`);
  });

  transaction(docs);
}

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
