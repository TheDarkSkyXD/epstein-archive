/**
 * Document Classification & Email Thread Splitting
 * Classifies documents by evidence type and splits multi-email files into individual messages
 */

import Database from 'better-sqlite3';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

const DB_PATH = resolve(process.cwd(), 'epstein-archive.db');

console.log('[Classify] Starting Document Classification...');
console.log(`[Classify] DB Path: ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ============================================================================
// PATTERNS
// ============================================================================

// Email patterns
const EMAIL_HEADER_PATTERN = /^From:\s*(.+?)$/im;
const EMAIL_TO_PATTERN = /^To:\s*(.+?)$/im;
const EMAIL_SENT_PATTERN = /^Sent:\s*(.+?)$/im;
const EMAIL_SUBJECT_PATTERN = /^Subject:\s*(.+?)$/im;
const EMAIL_CC_PATTERN = /^Cc:\s*(.+?)$/im;

// Legal patterns
const LEGAL_PATTERNS = [
  /case\s+no\.?\s*[:\s]*([A-Za-z0-9\-:\/]+)/i,
  /\bv\.\s+/,
  /\bcourt\s+of\b/i,
  /\bplaintiff\b/i,
  /\bdefendant\b/i,
  /\baffidavit\b/i,
  /\bindictment\b/i,
  /\bsubpoena\b/i,
];

// Deposition patterns
const DEPOSITION_PATTERNS = [
  /^Q\.\s+/m,
  /^A\.\s+/m,
  /\bTHE WITNESS:\b/,
  /\bdeposition\s+of\b/i,
  /\bMR\.\s+[A-Z]+:\s+Q\./,
];

// Article patterns
const ARTICLE_PATTERNS = [
  /^By\s+[A-Z][a-z]+\s+[A-Z]/m,
  /\bpublished\s+on\b/i,
  /\bbyline:\b/i,
  /https?:\/\/\S+/,
];

// Email boundary - start of new email in a file
const EMAIL_BOUNDARY_PATTERN = /\n(?=From:\s*\S)/g;

// ============================================================================
// CLASSIFICATION FUNCTIONS
// ============================================================================

interface EmailMessage {
  from: string | null;
  to: string | null;
  cc: string | null;
  subject: string | null;
  sentDate: string | null;
  body: string;
  position: number;
}

function parseEmailHeaders(content: string): EmailMessage | null {
  const fromMatch = content.match(EMAIL_HEADER_PATTERN);
  if (!fromMatch) return null;

  const toMatch = content.match(EMAIL_TO_PATTERN);
  const sentMatch = content.match(EMAIL_SENT_PATTERN);
  const subjectMatch = content.match(EMAIL_SUBJECT_PATTERN);
  const ccMatch = content.match(EMAIL_CC_PATTERN);

  // Find where headers end and body begins
  const lines = content.split('\n');
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '' && i > 3) {
      bodyStart = i + 1;
      break;
    }
  }

  return {
    from: fromMatch?.[1]?.trim() || null,
    to: toMatch?.[1]?.trim() || null,
    cc: ccMatch?.[1]?.trim() || null,
    subject: subjectMatch?.[1]?.trim() || null,
    sentDate: sentMatch?.[1]?.trim() || null,
    body: lines.slice(bodyStart).join('\n').trim(),
    position: 0,
  };
}

function splitEmailThread(content: string): EmailMessage[] {
  // Split by email boundaries
  const parts = content.split(/\n(?=From:\s*[^\n]+\n(?:Sent|To|Date):)/);
  const emails: EmailMessage[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    const email = parseEmailHeaders(part);
    if (email) {
      email.position = i;
      emails.push(email);
    }
  }

  return emails;
}

function classifyDocument(content: string, fileType: string): string {
  const firstLines = content.split('\n').slice(0, 30).join('\n');

  // Check for email
  if (
    EMAIL_HEADER_PATTERN.test(firstLines) &&
    (EMAIL_TO_PATTERN.test(firstLines) || EMAIL_SENT_PATTERN.test(firstLines))
  ) {
    return 'email';
  }

  // Check for deposition
  let depositionScore = 0;
  for (const pattern of DEPOSITION_PATTERNS) {
    if (pattern.test(content)) depositionScore++;
  }
  if (depositionScore >= 2) return 'deposition';

  // Check for legal document
  let legalScore = 0;
  for (const pattern of LEGAL_PATTERNS) {
    if (pattern.test(firstLines)) legalScore++;
  }
  if (legalScore >= 2) return 'legal';

  // Check for article
  let articleScore = 0;
  for (const pattern of ARTICLE_PATTERNS) {
    if (pattern.test(firstLines)) articleScore++;
  }
  if (articleScore >= 2) return 'article';

  // Check file type
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileType.toLowerCase())) {
    return 'photo';
  }

  return 'document';
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

// Add columns if they don't exist
try {
  db.exec(`ALTER TABLE documents ADD COLUMN evidence_type TEXT DEFAULT 'document'`);
  console.log('[Classify] Added evidence_type column');
} catch (e) {
  console.log('[Classify] evidence_type column already exists');
}

try {
  db.exec(`ALTER TABLE documents ADD COLUMN parent_document_id INTEGER REFERENCES documents(id)`);
  console.log('[Classify] Added parent_document_id column');
} catch (e) {
  console.log('[Classify] parent_document_id column already exists');
}

try {
  db.exec(`ALTER TABLE documents ADD COLUMN thread_id TEXT`);
  console.log('[Classify] Added thread_id column');
} catch (e) {
  console.log('[Classify] thread_id column already exists');
}

try {
  db.exec(`ALTER TABLE documents ADD COLUMN thread_position INTEGER`);
  console.log('[Classify] Added thread_position column');
} catch (e) {
  console.log('[Classify] thread_position column already exists');
}

const updateClassification = db.prepare(`
    UPDATE documents 
    SET evidence_type = @evidence_type,
        metadata_json = @metadata_json
    WHERE id = @id
`);

const insertSubDocument = db.prepare(`
    INSERT INTO documents (
        title, content, file_type, evidence_type, 
        parent_document_id, thread_id, thread_position, 
        metadata_json, word_count
    ) VALUES (
        @title, @content, 'email', 'email',
        @parent_id, @thread_id, @position,
        @metadata_json, @word_count
    )
`);

const getDocuments = db.prepare(`
    SELECT id, title, content, file_type, metadata_json 
    FROM documents 
    WHERE parent_document_id IS NULL
    AND content IS NOT NULL 
    AND LENGTH(content) > 50
`);

// ============================================================================
// MAIN CLASSIFICATION
// ============================================================================

async function runClassification() {
  console.log('[Classify] Fetching documents...');
  const documents = getDocuments.all() as any[];
  console.log(`[Classify] Found ${documents.length} documents to classify`);

  let classified = 0;
  let emailsCreated = 0;
  const typeCounts: Record<string, number> = {};

  db.transaction(() => {
    for (const doc of documents) {
      const content = doc.content || '';
      const fileType = doc.file_type || '';

      // Classify
      const evidenceType = classifyDocument(content, fileType);
      typeCounts[evidenceType] = (typeCounts[evidenceType] || 0) + 1;

      // Parse existing metadata
      let metadata: any = {};
      try {
        if (doc.metadata_json) {
          metadata = JSON.parse(doc.metadata_json);
        }
      } catch (e) {}

      // Handle emails - check for multiple emails in file
      if (evidenceType === 'email') {
        const emails = splitEmailThread(content);

        if (emails.length > 1) {
          // Multiple emails - create sub-documents
          const threadId = `thread_${doc.id}_${randomUUID().slice(0, 8)}`;

          for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            const emailMetadata = {
              emailHeaders: {
                from: email.from,
                to: email.to,
                cc: email.cc,
                subject: email.subject,
                sentDate: email.sentDate,
              },
              parentDocument: doc.title,
            };

            try {
              insertSubDocument.run({
                title: email.subject || `Email ${i + 1} from ${email.from || 'Unknown'}`,
                content: email.body,
                parent_id: doc.id,
                thread_id: threadId,
                position: i,
                metadata_json: JSON.stringify(emailMetadata),
                word_count: email.body.split(/\s+/).length,
              });
              emailsCreated++;
            } catch (e) {
              // Ignore duplicates
            }
          }

          // Mark parent document
          metadata.hasEmailThread = true;
          metadata.emailCount = emails.length;
          metadata.threadId = threadId;
        } else if (emails.length === 1) {
          // Single email - just store headers
          const email = emails[0];
          metadata.emailHeaders = {
            from: email.from,
            to: email.to,
            cc: email.cc,
            subject: email.subject,
            sentDate: email.sentDate,
          };
        }
      }

      // Handle depositions
      if (evidenceType === 'deposition') {
        const deponentMatch = content.match(/deposition\s+of\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
        if (deponentMatch) {
          metadata.deponent = deponentMatch[1];
        }
      }

      // Handle legal docs
      if (evidenceType === 'legal') {
        const caseMatch = content.match(/case\s+no\.?\s*[:\s]*([A-Za-z0-9\-:\/]+)/i);
        if (caseMatch) {
          metadata.caseNumber = caseMatch[1];
        }
        const vsMatch = content.match(/([A-Z][A-Za-z\s]+)\s+v\.\s+([A-Z][A-Za-z\s]+)/);
        if (vsMatch) {
          metadata.caseTitle = `${vsMatch[1].trim()} v. ${vsMatch[2].trim()}`;
        }
      }

      // Update document
      updateClassification.run({
        id: doc.id,
        evidence_type: evidenceType,
        metadata_json: JSON.stringify(metadata),
      });

      classified++;
      if (classified % 200 === 0) {
        process.stdout.write(`\r[Classify] Processed ${classified}/${documents.length}`);
      }
    }
  })();

  console.log(`\n[Classify] Classification complete!`);
  console.log(`[Classify] Classified: ${classified}`);
  console.log(`[Classify] Email sub-documents created: ${emailsCreated}`);
  console.log('\n[Classify] Type Distribution:');
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  // Final stats
  const stats = db
    .prepare(
      `
        SELECT evidence_type, COUNT(*) as count 
        FROM documents 
        GROUP BY evidence_type 
        ORDER BY count DESC
    `,
    )
    .all() as { evidence_type: string; count: number }[];

  console.log('\n[Classify] Final Database Stats:');
  for (const { evidence_type, count } of stats) {
    console.log(`  ${evidence_type || 'null'}: ${count}`);
  }

  db.close();
}

runClassification().catch(console.error);
