/**
 * Aggressive Unknowns Cleanup + Risk Factor Column
 */

import Database from 'better-sqlite3';
import { resolve } from 'path';

const DB_PATH = resolve(process.cwd(), 'epstein-archive.db');

console.log('[Cleanup] Starting Aggressive Unknowns Cleanup...');
console.log(`[Cleanup] DB Path: ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ============================================================================
// 1. ADD RISK_FACTOR COLUMN (separate from red_flag_rating)
// ============================================================================

console.log('\n[Schema] Adding risk_factor column...');

try {
    db.exec(`ALTER TABLE entities ADD COLUMN risk_factor INTEGER DEFAULT 0`);
    console.log('  Added risk_factor column');
} catch (e: any) {
    if (e.message.includes('duplicate column')) {
        console.log('  risk_factor column already exists');
    } else {
        console.error('  Error adding risk_factor:', e.message);
    }
}

// Set risk_factor for known perpetrators/associates
console.log('\n[Schema] Setting risk_factor scores...');

const highRiskFactor = [
    { name: 'Jeffrey Epstein', risk: 5 },
    { name: 'Ghislaine Maxwell', risk: 5 },
    { name: 'Jean-Luc Brunel', risk: 4 },
    { name: 'Sarah Kellen', risk: 4 },
    { name: 'Nadia Marcinkova', risk: 4 },
    { name: 'Lesley Groff', risk: 4 },
    { name: 'Prince Andrew', risk: 3 },
    { name: 'Alan Dershowitz', risk: 2 },
    { name: 'Bill Clinton', risk: 2 },
    { name: 'Donald Trump', risk: 2 },
    { name: 'Les Wexner', risk: 2 },
    { name: 'Leslie Wexner', risk: 2 },
];

const updateRiskFactor = db.prepare('UPDATE entities SET risk_factor = ? WHERE LOWER(name) = LOWER(?)');

for (const { name, risk } of highRiskFactor) {
    const result = updateRiskFactor.run(risk, name);
    if (result.changes > 0) {
        console.log(`  Set ${name} risk_factor=${risk}`);
    }
}

// ============================================================================
// 2. AGGRESSIVE UNKNOWNS CLEANUP
// ============================================================================

console.log('\n[Cleanup] Aggressive Unknown entity cleanup...');

// More aggressive junk patterns
const junkPatterns = [
    // Single lowercase words (OCR artifacts)
    /^[a-z]{2,20}$/,
    // CamelCase that looks like code
    /^[a-z]+[A-Z][a-z]+[A-Z]/,
    // Contains numbers mixed with letters that aren't part of names
    /^[a-z]+\d+[a-z]*$/i,
    // URLs and domains
    /\.(com|org|net|edu|gov|io|co|uk|us)$/i,
    /^https?:/i,
    /^www\./i,
    // Email-like
    /@/,
    // File extensions
    /\.(pdf|doc|txt|jpg|png|xlsx|ppt|msg)$/i,
    // Pure numbers or numbers with special chars
    /^[\d\-\(\)\s\.]+$/,
    // Common non-person terms
    /^(the|and|for|with|from|this|that|have|been|would|could|should|about|which|their|there|these|those|other|after|before|first|second|third|page|exhibit|attachment|document|file|report|email|memo|letter|fax|note|meeting|call|message|sent|received|cc|bcc|subject|date|time|re|fw|fwd|inc|llc|corp|ltd|co|office|dept|division|unit|team|group|committee|board|council|staff|management|admin|support|service|null|undefined|nan|true|false|error|unknown|n\/a|na|tbd|tba)$/i,
    // Single character or very short
    /^.{1,2}$/,
    // All caps less than 4 chars (likely abbreviations)
    /^[A-Z]{1,3}$/,
    // Starts with symbols
    /^[^a-zA-Z]/,
    // Contains excessive special characters
    /[!@#$%^&*()+=\[\]{};:'"<>?\/\\|`~]{2,}/,
    // Looks like a timestamp or date format
    /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/,
    // Contains 'test' or 'sample'
    /test|sample|example|demo|temp|tmp/i,
];

// Words that are definitely not names
const notNames = new Set([
    'powerpoint', 'excel', 'word', 'pdf', 'email', 'memo', 'report', 'document',
    'attachment', 'exhibit', 'file', 'folder', 'directory', 'path', 'url', 'link',
    'click', 'here', 'view', 'download', 'upload', 'submit', 'send', 'receive',
    'forward', 'reply', 'delete', 'copy', 'paste', 'cut', 'undo', 'redo',
    'save', 'open', 'close', 'new', 'edit', 'update', 'create', 'remove',
    'add', 'insert', 'append', 'prepend', 'merge', 'split', 'join', 'concat',
    'filter', 'sort', 'search', 'find', 'replace', 'match', 'pattern', 'regex',
    'true', 'false', 'null', 'undefined', 'nan', 'infinity', 'object', 'array',
    'string', 'number', 'boolean', 'function', 'class', 'interface', 'type',
    'const', 'let', 'var', 'import', 'export', 'default', 'return', 'if', 'else',
    'switch', 'case', 'break', 'continue', 'for', 'while', 'do', 'try', 'catch',
    'throw', 'finally', 'async', 'await', 'promise', 'callback', 'event', 'handler',
    'listener', 'observer', 'subscriber', 'publisher', 'emitter', 'dispatcher',
    'controller', 'service', 'repository', 'factory', 'builder', 'adapter', 'proxy',
    'decorator', 'singleton', 'prototype', 'module', 'package', 'library', 'framework',
    'component', 'element', 'node', 'tree', 'graph', 'list', 'map', 'set', 'queue',
    'stack', 'heap', 'buffer', 'stream', 'pipe', 'channel', 'socket', 'connection',
    'request', 'response', 'header', 'body', 'query', 'param', 'argument', 'option',
    'config', 'setting', 'preference', 'property', 'attribute', 'field', 'column',
    'row', 'cell', 'table', 'database', 'schema', 'index', 'key', 'value', 'pair',
    'entry', 'record', 'tuple', 'struct', 'union', 'enum', 'constant', 'variable',
    'reports', 'documents', 'files', 'pages', 'exhibits', 'attachments',
    'nextjump', 'powerpoint', 'larouche', 'spyeye', 'amazongo', 'locasio',
]);

const unknownEntities = db.prepare(`
    SELECT id, name FROM entities WHERE type = 'Unknown'
`).all() as any[];

const deleteEntity = db.prepare('DELETE FROM entities WHERE id = ?');
const deleteRelationships = db.prepare('DELETE FROM entity_relationships WHERE source_id = ? OR target_id = ?');
const reclassifyPerson = db.prepare(`UPDATE entities SET type = 'Person' WHERE id = ?`);
const reclassifyOrg = db.prepare(`UPDATE entities SET type = 'Organization' WHERE id = ?`);

let deleted = 0;
let reclassifiedPerson = 0;
let reclassifiedOrg = 0;

for (const entity of unknownEntities) {
    const name = (entity.name || '').trim();
    
    // Check if it's obviously junk
    let isJunk = false;
    
    // Check against patterns
    for (const pattern of junkPatterns) {
        if (pattern.test(name)) {
            isJunk = true;
            break;
        }
    }
    
    // Check against known non-name words
    if (!isJunk && notNames.has(name.toLowerCase())) {
        isJunk = true;
    }
    
    // Very short names (less than 3 chars)
    if (!isJunk && name.length < 3) {
        isJunk = true;
    }
    
    // Delete junk
    if (isJunk) {
        deleteRelationships.run(entity.id, entity.id);
        deleteEntity.run(entity.id);
        deleted++;
        continue;
    }
    
    // Try to reclassify remaining Unknown entities
    // Pattern: Two or more capitalized words = likely person name
    const personPattern = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/;
    // Pattern: Contains Corp, Inc, LLC, Ltd, Company, Foundation, etc = organization
    const orgPattern = /(Inc\.|LLC|Ltd\.?|Corp\.?|Company|Foundation|Trust|Fund|Association|Institute|University|College|School|Hospital|Bank|Group|Holdings|Partners|Capital|Ventures|Industries|Enterprises|Solutions|Services|Systems|Technologies|Media|Entertainment|Productions|Studios|Records|Publishing|Press|News|Network|Broadcasting|Communications|Consulting|Advisory|Management|Investments|Properties|Development|Construction|Engineering|Manufacturing|Distribution|Logistics|Transportation|Airlines|Hotels|Resorts|Casinos|Restaurants|Retail|Stores|Markets|Foods|Beverages|Pharmaceuticals|Healthcare|Insurance|Financial|Legal|Law|Attorneys|Advocates)/i;
    
    if (orgPattern.test(name)) {
        reclassifyOrg.run(entity.id);
        reclassifiedOrg++;
    } else if (personPattern.test(name)) {
        reclassifyPerson.run(entity.id);
        reclassifiedPerson++;
    }
}

console.log(`  Deleted ${deleted} junk entities`);
console.log(`  Reclassified ${reclassifiedPerson} as Person`);
console.log(`  Reclassified ${reclassifiedOrg} as Organization`);

// ============================================================================
// 3. REBUILD FTS INDEX
// ============================================================================

console.log('\n[Cleanup] Rebuilding FTS index...');

try {
    db.exec(`
        DELETE FROM entities_fts;
        INSERT INTO entities_fts(rowid, name, role, description)
        SELECT id, name, role, description FROM entities;
    `);
    console.log('  FTS rebuilt successfully');
} catch (e) {
    console.log('  FTS rebuild skipped (might need different approach)');
}

// ============================================================================
// FINAL STATS
// ============================================================================

console.log('\n========================================');
console.log('[Cleanup] Cleanup Complete!');
console.log('========================================');

const stats = db.prepare(`
    SELECT 
        (SELECT COUNT(*) FROM entities) as total_entities,
        (SELECT COUNT(*) FROM entities WHERE type = 'Unknown') as unknowns,
        (SELECT COUNT(*) FROM entities WHERE type = 'Person') as persons,
        (SELECT COUNT(*) FROM entities WHERE type = 'Organization') as orgs,
        (SELECT COUNT(*) FROM entities WHERE red_flag_rating >= 4) as high_rfi,
        (SELECT COUNT(*) FROM entities WHERE risk_factor >= 3) as high_risk
`).get() as any;

console.log(`Total Entities:  ${stats.total_entities}`);
console.log(`Unknowns:        ${stats.unknowns}`);
console.log(`Persons:         ${stats.persons}`);
console.log(`Organizations:   ${stats.orgs}`);
console.log(`High RFI (4+):   ${stats.high_rfi}`);
console.log(`High Risk (3+):  ${stats.high_risk}`);

// Show remaining unknowns sample
console.log('\nSample of remaining Unknown entities:');
const remainingSample = db.prepare(`
    SELECT name FROM entities WHERE type = 'Unknown' ORDER BY RANDOM() LIMIT 10
`).all() as any[];

for (const e of remainingSample) {
    console.log(`  - ${e.name}`);
}

db.close();
