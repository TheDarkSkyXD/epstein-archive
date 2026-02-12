#!/usr/bin/env tsx
import Database from 'better-sqlite3';
import path from 'path';
import * as fs from 'fs';
import { cleanMime, CleanedEmailParts } from '../src/server/services/mimeCleaner.js';
import { JSDOM } from 'jsdom';
import { RedactionResolver } from '../src/server/services/RedactionResolver.js';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH, { timeout: 10000 }); // 10s timeout for busy locks

// Helper to parse the specific HTML format found in the dataset
function parseHtmlEmail(raw: string): CleanedEmailParts {
  try {
    const dom = new JSDOM(raw);
    const doc = dom.window.document;

    // Helper to get text from table cells
    const getText = (id: string) => {
      const el = doc.getElementById(id);
      return el ? el.textContent?.trim() || '' : '';
    };

    const from = getText('from_text') || getText('from_row')?.replace('From:', '').trim() || '';
    const toRaw = getText('to_text') || getText('to_row')?.replace('To:', '').trim() || '';
    const ccRaw = getText('cc_text') || getText('cc_row')?.replace('CC:', '').trim() || '';
    const dateStr = getText('date_text') || getText('date_row')?.replace('Date:', '').trim() || '';
    const subject =
      getText('subject_text') || getText('subject_row')?.replace('Subject:', '').trim() || '';

    // Body is in #msg_body
    const bodyEl = doc.getElementById('msg_body');
    const bodyHtml = bodyEl ? bodyEl.innerHTML : '';
    const bodyText = bodyEl ? bodyEl.textContent?.trim() || '' : '';

    // Parse Date
    let date: Date | null = null;
    if (dateStr) {
      try {
        date = new Date(dateStr);
        if (isNaN(date.getTime())) date = null;
      } catch {}
    }

    return {
      body_clean_text: bodyText,
      body_clean_html: bodyHtml,
      subject,
      from,
      to: toRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      cc: ccRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      bcc: [],
      date,
      message_id: '', // HTML export doesn't have message-id usually
      references: [],
      attachments_count: 0, // TODO: parse #attach_table if needed
      mime_parse_status: 'success',
      headers: {},
    };
  } catch (error: any) {
    return {
      body_clean_text: raw,
      body_clean_html: '',
      subject: '',
      from: '',
      to: [],
      cc: [],
      bcc: [],
      date: null,
      message_id: '',
      references: [],
      attachments_count: 0,
      mime_parse_status: 'failed',
      mime_parse_reason: error.message,
      headers: {},
    };
  }
}

async function processEmail(filePath: string): Promise<{
  content: string;
  metadata: any;
  date?: string;
  preview: string;
}> {
  try {
    const rawBuffer = await fs.promises.readFile(filePath);
    const rawContent = rawBuffer.toString();

    let parts: CleanedEmailParts;

    // 1. JSON Metadata File
    if (filePath.endsWith('.meta') || rawContent.trim().startsWith('{')) {
      try {
        const json = JSON.parse(rawContent);
        let body = '';
        if (json.metadata && typeof json.metadata === 'string') {
          body = json.metadata.replace(/^[a-z0-9]+:[a-z0-9]+:/, '');
        }

        // Map JSON to CleanedEmailParts structure
        parts = {
          body_clean_text: body,
          body_clean_html: `<div>${body}</div>`,
          subject: json.subject || '',
          from: json.sender || '',
          to: json.recipient ? [json.recipient] : [],
          cc: [],
          bcc: [],
          date: json.date ? new Date(json.date * 1000) : null,
          message_id: json.id?.toString() || '',
          references: json.parent_id ? [json.parent_id.toString()] : [],
          attachments_count: 0,
          mime_parse_status: 'success',
          headers: {},
        };
      } catch (err: any) {
        console.warn(`  ⚠️ Failed to parse as JSON: ${err.message}`);
        parts = {
          body_clean_text: rawContent,
          body_clean_html: '',
          subject: '',
          from: '',
          to: [],
          cc: [],
          bcc: [],
          date: null,
          message_id: '',
          references: [],
          attachments_count: 0,
          mime_parse_status: 'failed',
          mime_parse_reason: err.message,
          headers: {},
        };
      }
    }
    // 2. HTML Export
    else if (filePath.endsWith('.html')) {
      parts = parseHtmlEmail(rawContent);
    }
    // 3. Raw MIME (.eml, .msg)
    else {
      parts = await cleanMime(rawContent);
    }

    // Apply Redaction Resolver (if needed, but user wants RAW mostly)
    // The user said "raw source accessible".
    // We will store the cleaned text in content.
    const resolution = RedactionResolver.resolve(parts.body_clean_text, {
      sender: parts.from,
      receiver: parts.to.join(', '),
      subject: parts.subject,
      date: parts.date?.toISOString(),
    });

    const finalContent = resolution.resolvedText || parts.body_clean_text;

    // Merge parts into metadata
    const metadata = {
      ...parts, // Include all cleaned parts in metadata
      // explicit overrides if needed
      thread_id: parts.references.length > 0 ? parts.references[0] : parts.message_id, // Simple threading attempt
    };

    return {
      content: finalContent,
      metadata,
      date: parts.date?.toISOString(),
      preview: finalContent.substring(0, 500),
    };
  } catch (error) {
    console.warn(`  ⚠️  Email parsing failed for ${path.basename(filePath)}:`, error);
    return {
      content: '',
      metadata: { error: 'Parse failed' },
      date: undefined,
      preview: '',
    };
  }
}

async function main() {
  console.log('🚀 REPROCESSING EMAILS...');

  // Find all email documents
  // We can look for evidence_type OR file extension if evidence_type wasn't set
  const rows = db
    .prepare(
      `
    SELECT id, file_path, metadata_json 
    FROM documents 
    WHERE evidence_type = 'email' 
       OR file_path LIKE '%.eml' 
       OR file_path LIKE '%.msg'
  `,
    )
    .all() as { id: number; file_path: string; metadata_json: string }[];

  console.log(`Found ${rows.length} emails to reprocess.`);

  let processed = 0;
  let errors = 0;

  for (const row of rows) {
    // Fix path: DB might have leading slash which makes it absolute to root, but it's relative to project
    let fullPath = row.file_path;
    if (fullPath.startsWith('/') && !fs.existsSync(fullPath)) {
      // Try removing leading slash
      fullPath = fullPath.substring(1);
    }

    // Also try joining with CWD if not absolute
    if (!path.isAbsolute(fullPath)) {
      fullPath = path.join(process.cwd(), fullPath);
    }

    if (!fs.existsSync(fullPath)) {
      console.warn(
        `  ⚠️  File not found: ${fullPath} (Original: ${row.file_path}) (ID: ${row.id})`,
      );
      errors++;
      continue;
    }

    const result = await processEmail(fullPath);

    if (row.id === 40934) {
      console.log(`--- DEBUG ID 40934 ---`);
      console.log(`Path: ${row.file_path}`);
      console.log(`Content length: ${result.content?.length}`);
      console.log(`Text preview: ${result.content?.substring(0, 100)}`);
      console.log(`Metadata: ${JSON.stringify(result.metadata)}`);
    }

    if (result.content) {
      // Merge metadata
      let currentMeta = {};
      try {
        currentMeta = JSON.parse(row.metadata_json || '{}');
      } catch {
        // ignore invalid json definition
      }

      const newMeta = { ...currentMeta, ...result.metadata };

      // Update DB
      db.prepare(
        `
            UPDATE documents 
            SET content = ?, 
                metadata_json = ?, 
                evidence_type = 'email',
                date_created = COALESCE(?, date_created),
                content_preview = ?,
                word_count = ?,
                title = ?
            WHERE id = ?
        `,
      ).run(
        result.content,
        JSON.stringify(newMeta),
        result.date,
        result.content.substring(0, 500),
        (result.content.match(/\b[\w']+\b/g) || []).length,
        result.metadata.subject || 'No Subject',
        row.id,
      );
      processed++;
    } else {
      errors++;
    }

    if (processed % 100 === 0) {
      process.stdout.write(`  Processed ${processed}/${rows.length}...\r`);
    }
  }

  console.log(`\n✅ Done! Processed: ${processed}, Errors/Skipped: ${errors}`);
}

main().catch(console.error);
