#!/usr/bin/env tsx
import Database from 'better-sqlite3';
import path from 'path';
import * as fs from 'fs';
import { simpleParser } from 'mailparser';
import { convert } from 'html-to-text';
import { RedactionResolver } from '../src/server/services/RedactionResolver.js';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

async function processEmail(filePath: string): Promise<{
  content: string;
  metadata: any;
  date?: string;
}> {
  try {
    const rawContent = await fs.promises.readFile(filePath);
    // Check if it's a JSON metadata file (common in this dataset)
    if (filePath.endsWith('.meta') || rawContent.toString().trim().startsWith('{')) {
      try {
        const json = JSON.parse(rawContent.toString());

        let content = '';
        if (json.metadata && typeof json.metadata === 'string') {
          // Clean up the metadata string which seems to be a custom serialization
          // Example: "d1:f45:we will have to wait..." -> "we will have to wait..."
          // We'll just strip the prefix if it matches the pattern or take it all
          content = json.metadata.replace(/^[a-z0-9]+:[a-z0-9]+:/, '');
        }

        const metadata = {
          from: json.sender || '',
          to: json.recipient || '', // JSON might not have recipient, check structure if needed
          subject: json.subject || '',
          date: json.date ? new Date(json.date * 1000).toISOString() : undefined,
          cc: '',
          messageId: json.id?.toString() || '',
          inReplyTo: json.parent_id?.toString() || '',
        };

        const resolution = RedactionResolver.resolve(content, {
          sender: metadata.from,
          receiver: metadata.to,
          subject: metadata.subject,
          date: metadata.date,
        });

        return {
          content: resolution.resolvedText || '[Metadata Record Only]',
          metadata,
          date: metadata.date,
        };
      } catch (err: any) {
        // Fall through to standard parsing if JSON parse fails
        console.warn(`  ⚠️ Failed to parse as JSON, falling back: ${err.message}`);
      }
    }

    const parsed = await simpleParser(rawContent);

    // Prefer text body, fallback to html-to-text
    let textBody = parsed.text;
    if (!textBody && parsed.html) {
      textBody = convert(parsed.html, {
        wordwrap: 130,
      });
    }

    // Fallback to raw string if parsing failed completely but we have content
    // (though usually simpleParser throws if it fails)
    if (!textBody && !parsed.html) {
      textBody = rawContent.toString('utf-8');
    }

    const cleanText = textBody || '';

    // Extract metadata
    const metadata = {
      from: Array.isArray(parsed.from)
        ? parsed.from.map((a) => a.text).join(', ')
        : parsed.from?.text || '',
      to: Array.isArray(parsed.to)
        ? parsed.to.map((a) => a.text).join(', ')
        : parsed.to?.text || '',
      subject: parsed.subject || '',
      date: parsed.date ? parsed.date.toISOString() : undefined,
      cc: Array.isArray(parsed.cc)
        ? parsed.cc.map((a) => a.text).join(', ')
        : parsed.cc?.text || '',
      messageId: parsed.messageId || '',
      inReplyTo: parsed.inReplyTo || '',
    };

    // Apply Redaction Resolver
    const resolution = RedactionResolver.resolve(cleanText, {
      sender: metadata.from,
      receiver: metadata.to,
      subject: metadata.subject,
      date: metadata.date,
    });

    return {
      content: resolution.resolvedText,
      metadata,
      date: metadata.date,
    };
  } catch (error) {
    console.warn(`  ⚠️  Email parsing failed for ${path.basename(filePath)}:`, error);
    return {
      content: '',
      metadata: { error: 'Parse failed' },
      date: undefined,
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
