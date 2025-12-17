#!/usr/bin/env tsx
/**
 * Comprehensive Email Ingestion Script
 * 
 * Handles all email sources:
 * 1. ehud_barak_emails (.html, .eml, .eml.meta)
 * 2. jeeproject_yahoo (.eml dated files)
 * 3. House Oversight emails (already parsed text)
 * 
 * Goals:
 * - Parse email headers correctly (From, To, Date, Subject)
 * - Strip headers from body content to display clean emails
 * - Handle HTML, EML, and text formats
 * - Extract entities and create relationships
 * - Thread emails by subject when possible
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../epstein-archive-production.db');
const DATA_DIR = path.join(__dirname, '../../data/emails');

console.log(`[Email Ingestion] Database: ${DB_PATH}`);
console.log(`[Email Ingestion] Data directory: ${DATA_DIR}`);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ============================================================================
// HEADER PARSING UTILITIES
// ============================================================================

// Standard email header patterns
const HEADER_PATTERNS = {
  from: /^From:\s*(.+)$/im,
  to: /^To:\s*(.+)$/im,
  cc: /^CC:\s*(.+)$/im,
  date: /^(?:Date|Sent):\s*(.+)$/im,
  subject: /^Subject:\s*(.+)$/im,
  messageId: /^Message-ID:\s*<?(.+?)>?$/im,
  inReplyTo: /^In-Reply-To:\s*<?(.+?)>?$/im,
  references: /^References:\s*(.+)$/im,
};

// Decode HTML entities common in email exports
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
    '&nbsp;': ' ', '&#64;': '@', '&#46;': '.', '&#49;': '1', '&#50;': '2',
    '&#51;': '3', '&#52;': '4', '&#53;': '5', '&#54;': '6', '&#55;': '7',
    '&#56;': '8', '&#57;': '9', '&#48;': '0', '&#58;': ':', '&#47;': '/',
    '&#44;': ',', '&#45;': '-', '&#65;': 'A', '&#66;': 'B', '&#67;': 'C',
    '&#68;': 'D', '&#69;': 'E', '&#70;': 'F', '&#71;': 'G', '&#72;': 'H',
    '&#73;': 'I', '&#74;': 'J', '&#75;': 'K', '&#76;': 'L', '&#77;': 'M',
    '&#78;': 'N', '&#79;': 'O', '&#80;': 'P', '&#81;': 'Q', '&#82;': 'R',
    '&#83;': 'S', '&#84;': 'T', '&#85;': 'U', '&#86;': 'V', '&#87;': 'W',
    '&#88;': 'X', '&#89;': 'Y', '&#90;': 'Z',
  };
  
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'gi'), char);
  }
  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  return result;
}

// Parse date strings into ISO format
function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  
  // Clean up common noise
  let cleaned = dateStr
    .replace(/\s+at\s+/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  
  // Try parsing
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }
  
  // Try common formats
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?/i,
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})/i,
  ];
  
  for (const fmt of formats) {
    const match = cleaned.match(fmt);
    if (match) {
      const parsed = new Date(cleaned);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }
  
  return null;
}

// Generate thread ID from subject line (normalize Re:, Fwd:, etc.)
function generateThreadId(subject: string | undefined): string {
  if (!subject) return crypto.randomUUID();
  
  const normalized = subject
    .replace(/^(?:Re|Fwd|Fw):\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  
  return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 16);
}

// ============================================================================
// HTML EMAIL PARSER (Ehud Barak format)
// ============================================================================

interface ParsedEmail {
  from?: string;
  to?: string;
  cc?: string;
  date?: string;
  subject?: string;
  body: string;
  threadId?: string;
  messageId?: string;
}

function parseHtmlEmail(htmlContent: string): ParsedEmail {
  try {
    const dom = new JSDOM(htmlContent);
    const doc = dom.window.document;
    
    // Extract from header table (Ehud Barak format)
    const fromRow = doc.querySelector('#from_row td:not(#from_caption)');
    const toRow = doc.querySelector('#to_row td:not(#to_caption)');
    const ccRow = doc.querySelector('#cc_row td:not(#cc_caption)');
    const dateRow = doc.querySelector('#date_row td:not(#date_caption)');
    const subjectRow = doc.querySelector('#subject_row td:not(#subject_caption)');
    const bodyDiv = doc.querySelector('#msg_body');
    
    const from = fromRow ? decodeHtmlEntities(fromRow.textContent?.trim() || '') : undefined;
    const to = toRow ? decodeHtmlEntities(toRow.textContent?.trim() || '') : undefined;
    const cc = ccRow ? decodeHtmlEntities(ccRow.textContent?.trim() || '') : undefined;
    const date = dateRow ? decodeHtmlEntities(dateRow.textContent?.trim() || '') : undefined;
    const subject = subjectRow ? decodeHtmlEntities(subjectRow.textContent?.trim() || '') : undefined;
    
    // Get body text and clean it
    let body = '';
    if (bodyDiv) {
      body = bodyDiv.textContent || '';
    } else {
      // Fallback: get all text after removing header table
      const headerTable = doc.querySelector('#header_table');
      if (headerTable) headerTable.remove();
      body = doc.body?.textContent || '';
    }
    
    // Clean up body
    body = body
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // Remove common email signatures/disclaimers from body
    const disclaimerPatterns = [
      /^The information contained in this communication[\s\S]*?copyright.*?reserved\.?$/mi,
      /^Sent from my iPhone.*$/mi,
      /^--\s*$/m,
    ];
    
    for (const pattern of disclaimerPatterns) {
      const match = body.match(pattern);
      if (match && match.index !== undefined) {
        // Only remove if it's at the end
        if (match.index > body.length * 0.7) {
          body = body.substring(0, match.index).trim();
        }
      }
    }
    
    return {
      from: from || undefined,
      to: to || undefined,
      cc: cc || undefined,
      date: date || undefined,
      subject: subject || undefined,
      body,
      threadId: generateThreadId(subject),
    };
  } catch (e) {
    console.error('[HTML Parser] Error:', e);
    return { body: htmlContent };
  }
}

// ============================================================================
// EML EMAIL PARSER
// ============================================================================

function parseEmlEmail(emlContent: string): ParsedEmail {
  // Split headers and body (separated by blank line)
  const blankLineIndex = emlContent.search(/\r?\n\r?\n/);
  
  let headerSection = '';
  let bodySection = '';
  
  if (blankLineIndex !== -1) {
    headerSection = emlContent.substring(0, blankLineIndex);
    bodySection = emlContent.substring(blankLineIndex).trim();
  } else {
    headerSection = emlContent;
  }
  
  // Parse headers (handle folded headers - continuation lines start with whitespace)
  const unfoldedHeaders = headerSection.replace(/\r?\n[ \t]+/g, ' ');
  
  const from = unfoldedHeaders.match(HEADER_PATTERNS.from)?.[1]?.trim();
  const to = unfoldedHeaders.match(HEADER_PATTERNS.to)?.[1]?.trim();
  const cc = unfoldedHeaders.match(HEADER_PATTERNS.cc)?.[1]?.trim();
  const date = unfoldedHeaders.match(HEADER_PATTERNS.date)?.[1]?.trim();
  const subject = unfoldedHeaders.match(HEADER_PATTERNS.subject)?.[1]?.trim();
  const messageId = unfoldedHeaders.match(HEADER_PATTERNS.messageId)?.[1]?.trim();
  const inReplyTo = unfoldedHeaders.match(HEADER_PATTERNS.inReplyTo)?.[1]?.trim();
  
  // Decode MIME encoded words in headers (=?UTF-8?B?...?=)
  const decodeSubject = (s: string | undefined) => {
    if (!s) return undefined;
    return s.replace(/=\?(UTF-8|ISO-8859-1)\?[BQ]\?([^?]+)\?=/gi, (_: string, charset: string, encoded: string) => {
      try {
        if (_.includes('?B?')) {
          return Buffer.from(encoded, 'base64').toString('utf-8');
        }
        return encoded.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (_match: string, hex: string) => 
          String.fromCharCode(parseInt(hex, 16))
        );
      } catch {
        return encoded;
      }
    });
  };
  
  // Clean body - handle various content types
  let cleanBody = bodySection;
  
  // Check for multipart content
  const contentTypeMatch = headerSection.match(/Content-Type:\s*([^;\r\n]+)/i);
  const contentType = contentTypeMatch?.[1]?.toLowerCase() || 'text/plain';
  
  if (contentType.includes('multipart')) {
    // Find boundary
    const boundaryMatch = headerSection.match(/boundary="?([^"\r\n]+)"?/i);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1];
      const parts = bodySection.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      
      // Find text/plain or text/html part
      for (const part of parts) {
        if (part.includes('Content-Type: text/plain')) {
          const partBlankLine = part.search(/\r?\n\r?\n/);
          if (partBlankLine !== -1) {
            cleanBody = part.substring(partBlankLine).trim();
            break;
          }
        }
        if (part.includes('Content-Type: text/html')) {
          const partBlankLine = part.search(/\r?\n\r?\n/);
          if (partBlankLine !== -1) {
            const html = part.substring(partBlankLine);
            try {
              const dom = new JSDOM(html);
              cleanBody = dom.window.document.body?.textContent || html;
            } catch {
              cleanBody = html.replace(/<[^>]+>/g, ' ');
            }
          }
        }
      }
    }
  } else if (contentType.includes('text/html')) {
    try {
      const dom = new JSDOM(cleanBody);
      cleanBody = dom.window.document.body?.textContent || cleanBody;
    } catch {
      cleanBody = cleanBody.replace(/<[^>]+>/g, ' ');
    }
  }
  
  // Handle quoted-printable or base64 encoding
  const transferEncoding = headerSection.match(/Content-Transfer-Encoding:\s*(\S+)/i)?.[1]?.toLowerCase();
  if (transferEncoding === 'quoted-printable') {
    cleanBody = cleanBody
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  } else if (transferEncoding === 'base64') {
    try {
      cleanBody = Buffer.from(cleanBody.replace(/\s/g, ''), 'base64').toString('utf-8');
    } catch {
      // Keep as-is if decode fails
    }
  }
  
  // Final cleanup
  cleanBody = cleanBody
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return {
    from,
    to,
    cc,
    date,
    subject: decodeSubject(subject),
    body: cleanBody,
    threadId: generateThreadId(subject),
    messageId,
  };
}

// ============================================================================
// TEXT EMAIL PARSER (House Oversight format)
// ============================================================================

function parseTextEmail(textContent: string): ParsedEmail {
  let from, to, date, subject;
  let body = textContent;
  let headerEndIndex = 0;
  
  // Single-line squashed header pattern
  const singleLineMatch = textContent.match(
    /(?:^|[\r\n])From:[ \t]*([^\n\r]+?)[ \t]+Sent:[ \t]*([^\n\r]+?)[ \t]+To:[ \t]*(.*)/i
  );
  
  if (singleLineMatch) {
    from = singleLineMatch[1].trim();
    date = singleLineMatch[2].trim();
    to = singleLineMatch[3].trim();
    headerEndIndex = (singleLineMatch.index || 0) + singleLineMatch[0].length;
  } else {
    // Multi-line headers
    const fromMatch = textContent.match(/(?:^|[\r\n])(?:From|Source):\s*([^\n\r]+)/i);
    const sentMatch = textContent.match(/(?:^|[\r\n])(?:Sent|Date):\s*([^\n\r]+)/i);
    const toMatch = textContent.match(/(?:^|[\r\n])To:\s*([^\n\r]+)/i);
    const subjectMatch = textContent.match(/(?:^|[\r\n])Subject:\s*([^\n\r]+)/i);
    
    from = fromMatch?.[1]?.trim();
    date = sentMatch?.[1]?.trim();
    to = toMatch?.[1]?.trim();
    subject = subjectMatch?.[1]?.trim();
    
    // Find header block end
    const matches = [fromMatch, sentMatch, toMatch, subjectMatch].filter(m => m !== null);
    if (matches.length > 0) {
      const lastMatch = matches.sort((a, b) => (b!.index || 0) - (a!.index || 0))[0];
      if (lastMatch) {
        const startIdx = lastMatch.index || 0;
        const lineEnd = textContent.indexOf('\n', startIdx + lastMatch[0].length);
        headerEndIndex = lineEnd !== -1 ? lineEnd : textContent.length;
      }
    }
  }
  
  // Strip headers from body
  if (headerEndIndex > 0) {
    body = textContent.substring(headerEndIndex).trim();
    
    // Remove straggling header lines
    let cleaning = true;
    while (cleaning) {
      const original = body;
      body = body.replace(/^(?:From|Sent|Date|To|Subject|CC|Importance):\s*.*?\n/i, '');
      body = body.replace(/^-+\s*\n/, '');
      body = body.replace(/^\s+/, '');
      if (body === original) cleaning = false;
    }
  }
  
  return {
    from,
    to,
    date,
    subject,
    body,
    threadId: generateThreadId(subject),
  };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

const insertDocument = db.prepare(`
  INSERT OR IGNORE INTO documents (
    file_name, file_path, title, content, evidence_type, date_created, metadata_json, source_collection
  ) VALUES (?, ?, ?, ?, 'email', ?, ?, ?)
`);

const checkExists = db.prepare(`
  SELECT id FROM documents WHERE file_path = ?
`);

// ============================================================================
// MAIN INGESTION LOGIC
// ============================================================================

async function ingestEmailDirectory(dirPath: string, tranche: string): Promise<number> {
  console.log(`\n[Ingesting] ${tranche} from ${dirPath}`);
  
  if (!fs.existsSync(dirPath)) {
    console.log(`  Directory not found: ${dirPath}`);
    return 0;
  }
  
  const files = fs.readdirSync(dirPath);
  let ingested = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) continue;
    
    // Skip meta files and non-email files
    if (file.endsWith('.meta') || file.startsWith('.')) continue;
    
    // Check if already exists
    const existing = checkExists.get(filePath);
    if (existing) {
      skipped++;
      continue;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      let parsed: ParsedEmail;
      
      // Parse based on file type
      if (file.endsWith('.html')) {
        parsed = parseHtmlEmail(content);
      } else if (file.endsWith('.eml')) {
        parsed = parseEmlEmail(content);
      } else if (file.endsWith('.txt')) {
        parsed = parseTextEmail(content);
      } else {
        // Try to detect format
        if (content.includes('<html') || content.includes('#header_table')) {
          parsed = parseHtmlEmail(content);
        } else if (content.includes('Content-Type:') || content.includes('MIME-Version:')) {
          parsed = parseEmlEmail(content);
        } else {
          parsed = parseTextEmail(content);
        }
      }
      
      // Create metadata
      const metadata = {
        source_account: tranche,
        from: parsed.from,
        to: parsed.to,
        cc: parsed.cc,
        subject: parsed.subject,
        original_date: parsed.date,
        thread_id: parsed.threadId,
        message_id: parsed.messageId,
        is_parsed_email: true,
      };
      
      // Parse date
      const sqlDate = parseDate(parsed.date);
      
      // Generate title
      const title = parsed.subject || 
        (parsed.from ? `Email from ${parsed.from.split('<')[0].trim()}` : 
          path.basename(file, path.extname(file)));
      
      // Insert document
      insertDocument.run(
        file,         // file_name
        filePath,     // file_path
        title,        // title
        parsed.body,  // content
        sqlDate,      // date_created
        JSON.stringify(metadata), // metadata_json
        tranche       // source_collection
      );
      
      ingested++;
      if (ingested % 100 === 0) {
        process.stdout.write('.');
      }
    } catch (e: any) {
      errors++;
      if (errors < 10) {
        console.error(`\n  Error processing ${file}: ${e.message}`);
      }
    }
  }
  
  console.log(`\n  Ingested: ${ingested}, Skipped: ${skipped}, Errors: ${errors}`);
  return ingested;
}

async function reprocessExistingEmails(): Promise<number> {
  console.log('\n[Reprocessing] Existing email documents with headers in body...');
  
  // Find emails that still have headers in their content
  const emailsWithHeaders = db.prepare(`
    SELECT id, file_path, content, metadata_json
    FROM documents
    WHERE evidence_type = 'email'
    AND (
      content LIKE 'From:%' OR 
      content LIKE 'Sent:%' OR
      content LIKE '%\nFrom:%' OR
      content LIKE '%\nSent:%'
    )
    LIMIT 5000
  `).all() as any[];
  
  console.log(`  Found ${emailsWithHeaders.length} emails with potential headers in body`);
  
  const updateStmt = db.prepare(`
    UPDATE documents 
    SET content = ?, metadata_json = ?
    WHERE id = ?
  `);
  
  let updated = 0;
  
  for (const email of emailsWithHeaders) {
    const parsed = parseTextEmail(email.content);
    
    // Only update if we successfully stripped headers
    if (parsed.body !== email.content && parsed.body.length > 0) {
      let metadata = {};
      try {
        metadata = JSON.parse(email.metadata_json || '{}');
      } catch {}
      
      // Merge parsed data
      const newMetadata = {
        ...metadata,
        from: parsed.from || (metadata as any).from,
        to: parsed.to || (metadata as any).to,
        subject: parsed.subject || (metadata as any).subject,
        original_date: parsed.date || (metadata as any).original_date,
        is_parsed_email: true,
      };
      
      updateStmt.run(parsed.body, JSON.stringify(newMetadata), email.id);
      updated++;
    }
  }
  
  console.log(`  Updated: ${updated} emails`);
  return updated;
}

async function main() {
  console.log('==============================================');
  console.log('Comprehensive Email Ingestion Script');
  console.log('==============================================');
  
  let totalIngested = 0;
  
  // Ingest Ehud Barak emails
  totalIngested += await ingestEmailDirectory(
    path.join(DATA_DIR, 'ehud_barak_emails'),
    'Ehud Barak Emails'
  );
  
  // Ingest jeeproject Yahoo emails
  totalIngested += await ingestEmailDirectory(
    path.join(DATA_DIR, 'jeeproject_yahoo'),
    'Jeffrey Epstein Yahoo'
  );
  
  // Reprocess existing emails to strip headers from body
  const reprocessed = await reprocessExistingEmails();
  
  // Final stats
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_emails,
      COUNT(DISTINCT json_extract(metadata_json, '$.thread_id')) as unique_threads,
      COUNT(DISTINCT json_extract(metadata_json, '$.source_account')) as sources
    FROM documents
    WHERE evidence_type = 'email'
  `).get() as any;
  
  console.log('\n==============================================');
  console.log('INGESTION COMPLETE');
  console.log('==============================================');
  console.log(`  New emails ingested: ${totalIngested}`);
  console.log(`  Existing emails reprocessed: ${reprocessed}`);
  console.log(`  Total emails in database: ${stats?.total_emails || 0}`);
  console.log(`  Unique threads: ${stats?.unique_threads || 0}`);
  console.log(`  Email sources: ${stats?.sources || 0}`);
  
  db.close();
  console.log('\n[Done] Database closed.');
}

main().catch(console.error);
