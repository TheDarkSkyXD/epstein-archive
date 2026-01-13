import { Database } from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import DatabaseConstructor from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive-production.db');
const SEARCH_DIR = path.join(process.cwd(), 'data/ocr_clean/text');

console.log(`Using database: ${DB_PATH}`);
const db = new DatabaseConstructor(DB_PATH);

// Regex patterns for email headers with anchors to prevent mid-text matches
// Matches "From:" at start of string OR after a newline.
const FROM_REGEX = /(?:^|[\r\n])(?:From|Source):\s*([^\n\r]+)/i;
const SENT_REGEX = /(?:^|[\r\n])(?:Sent|Date):\s*([^\n\r]+)/i;
const TO_REGEX = /(?:^|[\r\n])To:\s*([^\n\r]+)/i;
const SUBJECT_REGEX = /(?:^|[\r\n])(?:Subject|Re):\s*([^\n\r]+)/i;

// Regex for single-line squashed headers common in poor OCR
// e.g. "From: Foo Sent: Bar To: Baz"
// Must require ALL parts to avoid false variance. Use [ \t] to forbid newlines.
const SINGLE_LINE_HEADER_REGEX =
  /(?:^|[\r\n])From:[ \t]*([^\n\r]+?)[ \t]+Sent:[ \t]*([^\n\r]+?)[ \t]+To:[ \t]*(.*)/i;

// Helper to validate date string (basic)
function isValidDate(dateStr: string): boolean {
  if (!dateStr || dateStr.length < 5) return false;
  if (dateStr.toLowerCase().includes('iphone')) return false; // Common OCR noise
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

function parseEmailContent(content: string) {
  let from, to, date, subject;
  let body = content;
  let headerEndIndex = 0;

  // 1. Try single-line compact header match first
  const singleLineMatch = content.match(SINGLE_LINE_HEADER_REGEX);
  if (singleLineMatch) {
    from = singleLineMatch[1].trim();
    date = singleLineMatch[2].trim();
    to = singleLineMatch[3].trim();

    const matchIndex = singleLineMatch.index || 0;
    // Find the end of this line
    const lineEnd = content.indexOf('\n', matchIndex);
    headerEndIndex = lineEnd !== -1 ? lineEnd : matchIndex + singleLineMatch[0].length;
  } else {
    // 2. Fallback to standard multi-line headers
    const fromMatch = content.match(FROM_REGEX);
    const sentMatch = content.match(SENT_REGEX);
    const toMatch = content.match(TO_REGEX);
    const subjectMatch = content.match(SUBJECT_REGEX);

    // Must have at least FROM or SENT (and sent must be a valid date-ish) to consider it email
    // This prevents "Sent from my iPhone" alone from triggering 'email' classification without a From
    if (!fromMatch && !sentMatch) return null;

    if (sentMatch && !fromMatch) {
      // If only Sent matches, be careful. Is it a real date?
      if (!isValidDate(sentMatch[1])) return null;
    }

    from = fromMatch ? fromMatch[1].trim() : undefined;
    to = toMatch ? toMatch[1].trim() : undefined;
    date = sentMatch ? sentMatch[1].trim() : undefined;
    subject = subjectMatch ? subjectMatch[1].trim() : undefined;

    // Calculate header block end
    // We look for the LAST index of any matched header, then scan forward to end of that line
    const matches = [fromMatch, sentMatch, toMatch, subjectMatch].filter((m) => m !== null);
    if (matches.length > 0) {
      // Find the match that starts latest in the file
      const lastMatch = matches.sort((a, b) => (b!.index || 0) - (a!.index || 0))[0];
      if (lastMatch) {
        const startIdx = lastMatch.index || 0;
        const lineEnd = content.indexOf('\n', startIdx + lastMatch[0].length);
        headerEndIndex = lineEnd !== -1 ? lineEnd : content.length;
      }
    }
  }

  // Strip headers from body
  if (headerEndIndex > 0) {
    // Also, aggressively strip ANY lines at the start that look like headers up to headerEndIndex
    // Actually, headerEndIndex is just the last one we found.
    // Better strategy: Take substring from headerEndIndex
    body = content.substring(headerEndIndex).trim();

    // Secondary cleanup: If there are straggling headers (like "To: ..." that didn't generate the max index)
    // Remove leading lines that look like headers or specific noise
    // Loop a few times to peel off top layers
    let cleaning = true;
    while (cleaning) {
      const original = body;
      body = body.replace(/^(?:From|Sent|Date|To|Subject|Re|Importance):\s*.*?\n/i, '');
      body = body.replace(/^-+\s*\n/, ''); // Dashes
      body = body.replace(/^\s+/, ''); // Whitespace
      if (body === original) cleaning = false;
    }
  }

  // Filter out invalid "From" values (like "Sent:") if regex leaked
  if (from && /^Sent:?/i.test(from)) from = undefined;

  return {
    from,
    to,
    date,
    subject,
    body,
  };
}

async function main() {
  console.log('Starting refined email parsing (v3 - Strict Mode)...');

  // Find all House Oversight text files
  const docs = db
    .prepare(
      `
    SELECT id, file_path, content 
    FROM documents 
    WHERE file_path LIKE '%House Oversight%' 
      AND file_path LIKE '%.txt'
  `,
    )
    .all() as { id: number; file_path: string; content: string }[];

  console.log(`Found ${docs.length} candidate documents for re-parsing.`);

  let updatedCount = 0;

  const updateStmt = db.prepare(`
    UPDATE documents 
    SET evidence_type = 'email', 
        metadata_json = ?,
        content = ?, 
        date_created = COALESCE(?, date_created),
        title = COALESCE(?, title)
    WHERE id = ?
  `);

  // To fix false positives (documents that were wrongly marked as email but now fail strict check),
  // we should potentially revert them to 'document'.
  const revertStmt = db.prepare(`
    UPDATE documents 
    SET evidence_type = 'document',
        metadata_json = json_remove(metadata_json, '$.is_parsed_email', '$.from', '$.to', '$.original_date')
    WHERE id = ?
  `);

  for (const doc of docs) {
    let content = doc.content;

    // Always re-read file to get original full content with headers to re-parse from scratch
    // Robust path resolution:
    // 1. Try exact path from DB
    // 2. Try relative to CWD (if db path contains data/...)
    // 3. Try adjusting specific known mac-to-linux or path mismatches

    let realPath = doc.file_path;
    if (!fs.existsSync(realPath)) {
      // Try finding 'data/' segment
      const dataIndex = doc.file_path.indexOf('/data/');
      if (dataIndex !== -1) {
        const relativePath = doc.file_path.substring(dataIndex + 1); // data/...
        const cwdPath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(cwdPath)) {
          realPath = cwdPath;
        }
      }
    }

    try {
      if (fs.existsSync(realPath)) {
        content = fs.readFileSync(realPath, 'utf-8');
      } else if (!content || content.length < 50) {
        // If we can't find the file and DB content is empty/stripped, we are in trouble.
        // But we can't do much else.
        console.warn(`[Warn] File not found: ${doc.file_path} (resolved: ${realPath})`);
        continue;
      }
    } catch (e) {
      console.error(`Failed to read file ${realPath}`);
      continue;
    }

    if (!content) continue;

    // Check matches
    const parsed = parseEmailContent(content);

    if (parsed && (parsed.from || (parsed.date && isValidDate(parsed.date)))) {
      // Construct metadata
      const metadata = {
        source_account: 'House Oversight',
        from: parsed.from,
        to: parsed.to,
        subject: parsed.subject,
        original_date: parsed.date,
        is_parsed_email: true,
      };

      // Try to verify date format for SQL
      let sqlDate = null;
      if (parsed.date) {
        const d = new Date(parsed.date);
        if (!isNaN(d.getTime())) {
          sqlDate = d.toISOString();
        }
      }

      try {
        updateStmt.run(
          JSON.stringify(metadata),
          parsed.body,
          sqlDate,
          parsed.subject || 'No Subject',
          doc.id,
        );
        updatedCount++;
        if (updatedCount % 100 === 0) process.stdout.write('.');
      } catch (e) {
        console.error(`Error updating doc ${doc.id}:`, e);
      }
    } else {
      // If it WAS an email but now isn't (due to strict check), revert it?
      // Only if it was previously marked as is_parsed_email
      // We can't easily check previous state here without query, but we can just run revert.
      // It's safer to leave recognized docs alone, but for "Sent from iPhone" artifacts, we want to revert.
      revertStmt.run(doc.id);
    }
  }

  console.log(`\nRe-parsed, cleaned, and strictly validated ${updatedCount} emails.`);
}

main();
