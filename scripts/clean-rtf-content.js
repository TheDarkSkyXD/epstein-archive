#!/usr/bin/env node
/**
 * Script to strip RTF formatting from documents
 * Converts RTF content to plain text by removing control codes
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'epstein-archive-production.db');

/**
 * Strip RTF formatting and return plain text
 */
function stripRtf(rtfContent) {
  if (!rtfContent || !rtfContent.startsWith('{\\rtf')) {
    return rtfContent;
  }

  let text = rtfContent;
  
  // Remove RTF header and font tables
  text = text.replace(/\{\\rtf[^}]*\}/g, '');
  text = text.replace(/\{\\fonttbl[^}]*(\{[^}]*\})*\}/g, '');
  text = text.replace(/\{\\colortbl[^}]*\}/g, '');
  text = text.replace(/\{\\stylesheet[^}]*(\{[^}]*\})*\}/g, '');
  text = text.replace(/\{\\info[^}]*(\{[^}]*\})*\}/g, '');
  text = text.replace(/\{\\\\?\*[^}]*\}/g, '');
  
  // Remove various RTF control words
  text = text.replace(/\\viewkind\d*/g, '');
  text = text.replace(/\\uc\d*/g, '');
  text = text.replace(/\\pard[^\\}]*/g, '\n');
  text = text.replace(/\\par[^a-z]/g, '\n');
  text = text.replace(/\\line/g, '\n');
  text = text.replace(/\\tab/g, '\t');
  text = text.replace(/\\fs\d+/g, '');
  text = text.replace(/\\f\d+/g, '');
  text = text.replace(/\\cf\d+/g, '');
  text = text.replace(/\\b\d*/g, '');
  text = text.replace(/\\i\d*/g, '');
  text = text.replace(/\\ul\d*/g, '');
  text = text.replace(/\\ulnone/g, '');
  text = text.replace(/\\highlight\d*/g, '');
  text = text.replace(/\\lang\d+/g, '');
  text = text.replace(/\\kerning\d+/g, '');
  text = text.replace(/\\expnd\d+/g, '');
  text = text.replace(/\\expndtw\d+/g, '');
  text = text.replace(/\\outl\d*/g, '');
  text = text.replace(/\\shad\d*/g, '');
  text = text.replace(/\\scaps\d*/g, '');
  text = text.replace(/\\caps\d*/g, '');
  text = text.replace(/\\strike\d*/g, '');
  text = text.replace(/\\striked\d+/g, '');
  text = text.replace(/\\deleted\d+/g, '');
  text = text.replace(/\\revised\d*/g, '');
  text = text.replace(/\\super/g, '');
  text = text.replace(/\\sub/g, '');
  text = text.replace(/\\nosupersub/g, '');
  text = text.replace(/\\plain/g, '');
  text = text.replace(/\\qc/g, '');
  text = text.replace(/\\qj/g, '');
  text = text.replace(/\\ql/g, '');
  text = text.replace(/\\qr/g, '');
  text = text.replace(/\\ri\d+/g, '');
  text = text.replace(/\\li\d+/g, '');
  text = text.replace(/\\fi-?\d+/g, '');
  text = text.replace(/\\sl-?\d+/g, '');
  text = text.replace(/\\slmult\d+/g, '');
  text = text.replace(/\\sb\d+/g, '');
  text = text.replace(/\\sa\d+/g, '');
  text = text.replace(/\\nowidctlpar/g, '');
  text = text.replace(/\\widctlpar/g, '');
  text = text.replace(/\\intbl/g, '');
  text = text.replace(/\\cell/g, '\t');
  text = text.replace(/\\row/g, '\n');
  text = text.replace(/\\trowd[^\\]*/g, '');
  text = text.replace(/\\clbrdr[lrtb][^\\]*/g, '');
  text = text.replace(/\\cellx\d+/g, '');
  
  // Remove RTF special characters
  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Remove remaining backslash commands
  text = text.replace(/\\[a-z]+\d*/gi, '');
  
  // Remove braces
  text = text.replace(/[{}]/g, '');
  
  // Clean up whitespace
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.trim();
  
  return text;
}

function cleanRtfDocuments() {
  console.log('Database path:', DB_PATH);
  
  const db = new Database(DB_PATH);
  
  // Find RTF documents
  const rtfDocs = db.prepare(`
    SELECT id, file_name, content FROM documents 
    WHERE content LIKE '{%rtf%' OR content LIKE '%\\par%'
  `).all();
  
  console.log(`Found ${rtfDocs.length} RTF documents to clean`);
  
  let cleaned = 0;
  for (const doc of rtfDocs) {
    const cleanedContent = stripRtf(doc.content);
    if (cleanedContent !== doc.content) {
      db.prepare('UPDATE documents SET content = ? WHERE id = ?').run(cleanedContent, doc.id);
      console.log(`Cleaned: ${doc.file_name}`);
      cleaned++;
    }
  }
  
  console.log(`\nCleaned ${cleaned} documents`);
  db.close();
}

cleanRtfDocuments();
