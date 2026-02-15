import Database from 'better-sqlite3';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { extractEvidence, scoreCategoryMatch } from './utils/evidence_extractor.js';
import { recalculateRisk } from './recalculate_entity_risk.js';
import { JobManager } from '../src/server/services/JobManager.js';
import os from 'os';

// Simplistic NLP / Term Extraction
// In a real "Ultimate" pipeline, we might call an LLM here,
// but for reliability/speed let's start with robust regex & heuristics + consolidation.

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
let db: Database.Database;
let currentResolverRunId: string;

// Prepared statements for widespread use
let insertSpan: any;
let insertMentionRow: any;
let insertRelation: any;

// CONFIGURATION
const BATCH_SIZE = 100;

// ... (Pattern definitions remain here) ...
const LOCATION_PATTERN =
  /\b(House|Street|Road|Avenue|Park|Beach|Islands|Drive|Place|Apartment|Mansion|Ranch|Island|Airport|Courthouse|Building|Plaza|Center|Terminal|Hangar|Dock)\b/i;
const HOUSEKEEPER_PATTERN = /Housekeeper/i;
const ORG_PATTERN =
  /\b(Inc\.?|LLC|Corp\.?|Ltd\.?|Group|Trust|Foundation|University|College|School|Academy|Department|Bureau|Agency|Police|Sheriff|FBI|CIA|Secret Service|Bank|Association|Club|Holdings|Limited|Fund|Service|Office|Registry|Commission|Board)\b/i;
const MEDIA_PATTERN =
  /\b(New York Times|Post|News|Press|Journal|Magazine|Broadcast|Radio|TV|Herald|Tribune|Chronicle)\b/i;
const FINANCIAL_PATTERN =
  /\b(Bank|Financial|Transfer|Payment|Account|Trust|LLC|Inc|Corp|Investment|Capital|Securities|Fund|Equity)\b/i;
const PERSON_TITLE_PATTERN =
  /\b(Judge|Officer|Agent|Senator|Representative|Justice|Professor|Doctor|Advocate|Counsel|Attorney|Lawyer|Pilot|Detective|Marshal|Sheriff|Foreman|Owner)\b/i;

const ROLE_PATTERNS = [
  { role: 'Pilot', regex: /\bpilot|aviation|flight|cockpit\b/i },
  { role: 'Survivor', regex: /\bsurvivor|victim|accuser|whistleblower\b/i },
  { role: 'Butler', regex: /\bbutler|housekeeper|maid|staff|employee\b/i },
  { role: 'Lawyer', regex: /\blawyer|attorney|counsel|legal|prosecutor|defense\b/i },
  { role: 'Associate', regex: /\bassociate|partner|colleague|friend|confidant\b/i },
  { role: 'Political', regex: /\bsenator|representative|congress|governor|president|mayor\b/i },
  { role: 'Judicial', regex: /\bjudge|justice|magistrate|court\b/i },
  { role: 'Security', regex: /\bsecurity|guard|officer|agent|police|fbi|cia\b/i },
];

// Phase 3: High Interest Patterns (Simulated/Heuristic)
const INTEREST_PATTERNS = [
  { regex: /explicit|child|illegal/i, reason: 'Potentially sensitive keywords' },
  { regex: /password|secret|key/i, reason: 'Potentially leaked credentials' },
];

const CREDENTIAL_PATTERNS = [
  { type: 'Password', regex: /password[:=]\s*([a-zA-Z0-9!@#$%^&*()_+]{4,})/i },
  { type: 'API Key', regex: /(?:api[_-]?key|access[_-]?token)[:=]\s*([a-zA-Z0-9-_.]{16,})/i },
  { type: 'Bank Account', regex: /\b(?:account[_-]?number|iban|routing)[:=]\s*([A-Z0-9-]{8,})\b/i },
];

const CONTACT_PATTERNS = {
  email:
    /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/g,
  phone: /(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})/g,
};

function checkHighInterest(text: string): { status: 'high_interest' | 'none'; reason?: string } {
  for (const pattern of INTEREST_PATTERNS) {
    if (pattern.regex.test(text)) {
      return { status: 'high_interest', reason: pattern.reason };
    }
  }
  return { status: 'none' };
}

function detectType(
  name: string,
): 'Person' | 'Organization' | 'Location' | 'Media' | 'Financial' | 'Other' {
  const parts = name.split(/[\s,.]+/);

  // 1. Title check (e.g. "Officer Smith" -> Person)
  if (PERSON_TITLE_PATTERN.test(name)) return 'Person';

  // 2. Organization Check
  if (ORG_PATTERN.test(name)) return 'Organization';

  // 3. Media Check
  if (MEDIA_PATTERN.test(name)) return 'Media';

  // 4. Financial Check
  if (FINANCIAL_PATTERN.test(name)) return 'Financial';

  // 5. Location Check (with exclusions)
  if (LOCATION_PATTERN.test(name) && !HOUSEKEEPER_PATTERN.test(name)) return 'Location';

  // 6. Person Heuristic (Default for 2-3 words capitalized)
  // Reduced from 4 to be more aggressive against noise
  if (parts.length >= 2 && parts.length <= 3) return 'Person';

  return 'Other';
}

// Import centralized blacklist
// TODO: Use ENTITY_BLACKLIST for validation - see UNUSED_VARIABLES_RECOMMENDATIONS.md
import {
  ENTITY_BLACKLIST as _ENTITY_BLACKLIST,
  ENTITY_BLACKLIST_REGEX,
  ENTITY_PARTIAL_BLOCKLIST,
} from '../src/config/entityBlacklist';

// New Filters & Rules (2026-01-23)
import { isJunkEntity } from './filters/entityFilters.js';
import { resolveAmbiguity } from './filters/contextRules.js';
import { resolveVip, VIP_RULES } from './filters/vipRules.js';
import { fileURLToPath } from 'url';
import { BoilerplateService } from '../src/server/services/BoilerplateService.js';
import { TextCleaner } from './utils/text_cleaner.js';

// const JUNK_REGEX = ENTITY_BLACKLIST_REGEX;

// Entity Normalizer
function normalizeName(name: string): string {
  return name
    .replace(/[\n\r\t]/g, ' ') // Remove newlines
    .replace(/\s+/g, ' ') // Collapse spaces
    .replace(/^['"]|['"]$/g, '') // Remove quotes
    .replace(/[.,;:]$/g, '') // Remove trailing punctuation
    .trim();
}

function extractCredentials(doc: any, content: string) {
  for (const pattern of CREDENTIAL_PATTERNS) {
    const regex = new RegExp(pattern.regex, 'gi');
    const matches = [...content.matchAll(regex)];
    for (const match of matches) {
      if (match[1]) {
        db.prepare(
          `
          INSERT INTO black_book_entries (entry_text, notes, document_id, entry_category, created_at)
          VALUES (?, ?, ?, 'credential', CURRENT_TIMESTAMP)
        `,
        ).run(
          `⭐ ${pattern.type}: ${match[1]}`,
          `[CREDENTIAL] Extracted from document ${doc.id} (${doc.file_name})`,
          doc.id,
        );
        console.log(`   🔐 Extracted ${pattern.type} from document ${doc.id}`);
      }
    }
  }
}

function harvestContacts(doc: any, content: string, entitiesFound: any[]) {
  // Look for contact info near identified Person entities
  for (const entity of entitiesFound) {
    if (entity.type !== 'Person') continue;

    // Find name mentions in content to look around them

    const nameRegex = new RegExp(entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let match;
    while ((match = nameRegex.exec(content)) !== null) {
      const idx = match.index;
      // Look for contacts in the next 150 characters
      const window = content.substring(idx, idx + 200);

      const emails = [...window.matchAll(CONTACT_PATTERNS.email)];
      const phones = [...window.matchAll(CONTACT_PATTERNS.phone)];

      for (const emailMatch of emails) {
        const email = emailMatch[0];
        // Only insert if not already present for this doc
        const existing = db
          .prepare(
            `
          SELECT id FROM black_book_entries 
          WHERE document_id = ? AND entry_text LIKE ?
        `,
          )
          .get(doc.id, `%${email}%`);

        if (!existing) {
          const entry_text = `⭐ ${entity.name} (Contact): ${email}`;
          const notes = `[HARVESTED] Found near name in document ${doc.id} (${doc.file_name})`;

          db.prepare(
            `
            INSERT INTO black_book_entries (person_id, entry_text, notes, document_id, entry_category, created_at)
            VALUES (@person_id, @entry_text, @notes, @document_id, 'contact', CURRENT_TIMESTAMP)
          `,
          ).run({
            person_id: entity.entityId || null,
            entry_text,
            notes,
            document_id: doc.id,
          });
          console.log(`   📧 Harvested email for ${entity.name}`);
        }
      }

      for (const phoneMatch of phones) {
        const phone = phoneMatch[0];
        const existing = db
          .prepare(
            `
          SELECT id FROM black_book_entries 
          WHERE document_id = ? AND entry_text LIKE ?
        `,
          )
          .get(doc.id, `%${phone}%`);

        if (!existing) {
          const entry_text = `⭐ ${entity.name} (Contact): ${phone}`;
          const notes = `[HARVESTED] Found near name in document ${doc.id} (${doc.file_name})`;

          db.prepare(
            `
            INSERT INTO black_book_entries (person_id, entry_text, notes, document_id, entry_category, created_at)
            VALUES (@person_id, @entry_text, @notes, @document_id, 'contact', CURRENT_TIMESTAMP)
          `,
          ).run({
            person_id: entity.entityId || null,
            entry_text,
            notes,
            document_id: doc.id,
          });
          console.log(`   📞 Harvested phone for ${entity.name}`);
        }
      }
    }
  }
}

function makeId(): string {
  return crypto.randomUUID();
}

function makeDeterministicId(parts: Array<string | number>): string {
  const hash = crypto.createHash('sha1');
  for (const part of parts) {
    hash.update(String(part));
    hash.update('|');
  }
  return hash.digest('hex');
}

export async function runIntelligencePipeline() {
  console.log('🚀 Starting ULTIMATE Evidentiary Ingestion Pipeline...');

  // Initialize DB at the top level of the function to be accessible by helper functions
  db = new Database(DB_PATH, { timeout: 30000 });

  // Stats & Telemetry
  let totalEntities = 0;
  let totalMentions = 0;
  let newEntities = 0; // Batch counter
  let newMentions = 0; // Batch counter
  let newEntitiesCount = 0; // Per-doc throttle helper
  const ingestRunId = makeId();
  currentResolverRunId = ingestRunId;

  try {
    // 1. Initialize Ingest Run
    const gitCommit = execSync('git rev-parse HEAD').toString().trim();
    const pipelineVersion = '2.0.0-evidentiary';
    const resolverVersion = '2.0.0';

    db.prepare(
      `
      INSERT INTO ingest_runs (id, status, git_commit, pipeline_version, agentic_enabled)
      VALUES (?, 'running', ?, ?, ?)
    `,
    ).run(ingestRunId, gitCommit, pipelineVersion, 0);

    // 0. Pre-Flight: MIME Sanitization (Critical for uncovering hidden entities)
    // sanitizeContent();

    let currentResolverRunTableId: number | bigint = 0;

    // Register resolver run
    const hasResolverRuns = !!db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'resolver_runs'")
      .get();
    if (hasResolverRuns) {
      const res = db
        .prepare('INSERT INTO resolver_runs (resolver_name, resolver_version) VALUES (?, ?)')
        .run('UltimateIngestionPipeline', resolverVersion);
      currentResolverRunTableId = res.lastInsertRowid;
    }

    const hasResolutionEvents = !!db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'entity_resolution_events'",
      )
      .get();
    const insertResolutionEvent = hasResolutionEvents
      ? db.prepare(
          'INSERT INTO entity_resolution_events (resolver_run_id, document_id, mention_text, resolved_entity_id, resolution_method, confidence, evidence_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
      : null;

    const insertEntity = db.prepare(
      'INSERT INTO entities (full_name, entity_type, red_flag_rating, risk_level, entity_category, death_date, notes, bio, birth_date, aliases) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    // Legacy entity_mentions is now entity_mentions_legacy.
    // We use insertMentionRow for the new schema.

    // Optional new-schema integration (document_spans, mentions, resolution_candidates, relations)
    const hasDocumentSpans = !!db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'document_spans'")
      .get();
    const hasMentionsTable = !!db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'mentions'")
      .get();
    const hasResolutionCandidates = !!db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'resolution_candidates'",
      )
      .get();
    const hasRelationsTable = !!db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'relations'")
      .get();
    const hasQualityFlags = !!db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'quality_flags'")
      .get();

    insertSpan = db.prepare(`
    INSERT INTO document_spans (id, document_id, start_offset, end_offset, extraction_method, confidence, ingest_run_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    insertMentionRow = db.prepare(`
    INSERT INTO entity_mentions (
      id, entity_id, document_id, span_id, start_offset, end_offset, 
      surface_text, mention_type, mention_context, confidence, ingest_run_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    insertRelation = db.prepare(`
    INSERT INTO entity_relationships (
      source_entity_id, target_entity_id, relationship_type, strength, confidence, ingest_run_id, evidence_pack_json
    ) VALUES (?, ?, 'co_occurrence', ?, 0.5, ?, ?) 
    ON CONFLICT(source_entity_id, target_entity_id, relationship_type) 
    DO UPDATE SET 
      strength = strength + excluded.strength, 
      evidence_pack_json = excluded.evidence_pack_json,
      ingest_run_id = excluded.ingest_run_id
  `);

    const insertQualityFlag = hasQualityFlags
      ? db.prepare(
          "INSERT INTO quality_flags (id, target_type, target_id, flag_type, severity, details_json, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), NULL)",
        )
      : null;

    const insertTriple = db.prepare(`
    INSERT INTO claim_triples (
      subject_entity_id, predicate, object_entity_id, object_text,
      document_id, sentence_id, confidence, modality, evidence_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const CLAIM_PATTERNS = [
      { regex: /\b(met with|spoke to|called|visited|emailed|messaged)\b/i, predicate: 'contacted' },
      { regex: /\b(flew to|traveled to|arrived at|stayed at)\b/i, predicate: 'traveled_to' },
      {
        regex: /\b(paid|transferred|sent money to|received money from|wired)\b/i,
        predicate: 'financial_link',
      },
      {
        regex: /\b(works for|employed by|member of|affiliated with|partner at)\b/i,
        predicate: 'affiliated',
      },
      { regex: /\b(accused|alleged|testified|deposed|stated)\b/i, predicate: 'legal_action' },
      { regex: /\b(recruited|procured|trafficked)\b/i, predicate: 'recruited' },
    ];

    // Stats are now declared above

    try {
      db.prepare('ALTER TABLE documents ADD COLUMN analyzed_at DATETIME').run();
      console.log('✅ Added analyzed_at column to documents.');
    } catch {
      // Column already exists - safe to ignore
    }

    // 1. Load Cache
    const entityCache = new Map<string, number>();
    // Also cache detected type to avoid re-detecting
    // const typeCache = new Map<string, string>();

    const entityRows = db
      .prepare('SELECT id, full_name, aliases, entity_type FROM entities')
      .all() as any[];

    // Cache of normalized name -> entity id
    entityRows.forEach((row) => {
      entityCache.set(normalizeName(row.full_name).toLowerCase(), row.id);
      if (row.aliases) {
        row.aliases.split(',').forEach((alias: string) => {
          entityCache.set(normalizeName(alias).toLowerCase(), row.id);
        });
      }
    });

    // Simple blocking index by last token of name/alias for resolution_candidates
    const lastNameIndex = new Map<
      string,
      { id: number; full_name: string; entity_type: string }[]
    >();

    function addToLastNameIndex(id: number, name: string, entityType: string) {
      const norm = normalizeName(name);
      const parts = norm.split(' ');
      if (!parts.length) return;
      const last = parts[parts.length - 1].toLowerCase();
      if (last.length < 2) return;
      const bucket = lastNameIndex.get(last) || [];
      bucket.push({ id, full_name: norm, entity_type: entityType });
      lastNameIndex.set(last, bucket);
    }

    /**
     * Shared extraction and storage logic for mentions (Phase 3 Provenance).
     */
    function extractAndStoreMention(
      doc: any,
      match: RegExpMatchArray,
      fullText: string,
      sentenceId?: number,
      pageId?: number,
    ) {
      const rawName = match[0];
      const cleanName = normalizeName(rawName);

      if (cleanName.length < 3 || isJunkEntity(cleanName)) return;
      if (_ENTITY_BLACKLIST.includes(cleanName) || ENTITY_BLACKLIST_REGEX.test(cleanName)) return;
      if (
        ENTITY_PARTIAL_BLOCKLIST.some((term) =>
          cleanName.toLowerCase().includes(term.toLowerCase()),
        )
      )
        return;

      if (cleanName.includes('Epstein') && !cleanName.includes('Island')) return;

      // A. Resolve
      const vipResolution = resolveVip(cleanName);

      // Throttling Check (Hygiene)
      // If not a VIP and we've exceeded the limit for this document, skip.
      // We assume 'doc' object has a temporary 'newEntitiesCount' property we manage, or we pass it in.
      // Let's attach it to 'doc' for now since it's passed around.
      const MAX_ENTITIES_PER_DOC = 50;
      if (!vipResolution && (doc as any).newEntitiesCount >= MAX_ENTITIES_PER_DOC) {
        // console.log(`   Start throttling entities for doc ${doc.id}`);
        return;
      }

      let resolvedName = vipResolution || cleanName;
      let resolutionMethod = vipResolution ? 'exact_match' : 'exact_match';
      let mentionContext: string | null = null;

      if (!vipResolution) {
        // Boilerplate Check on Context (Hygiene)
        if (BoilerplateService.getInstance().isBoilerplate(fullText)) {
          return; // Skip entities in boilerplate blocks
        }

        const idx = match.index || 0;
        const start = Math.max(0, idx - 100);
        const end = Math.min(fullText.length, idx + rawName.length + 100);
        mentionContext = fullText.substring(start, end);
        const res = resolveAmbiguity(cleanName, mentionContext);
        if (res) {
          resolvedName = res.resolvedName;
          resolutionMethod = 'exact_match';
        }
      } else {
        // Still grab context for VIPs for audit visibility
        const idx = match.index || 0;
        const start = Math.max(0, idx - 100);
        const end = Math.min(fullText.length, idx + rawName.length + 100);
        mentionContext = fullText.substring(start, end);
      }

      const lowerName = resolvedName.toLowerCase();
      let entityId = entityCache.get(lowerName);
      let entityType = 'Person';

      if (vipResolution) {
        const rule = VIP_RULES.find((r) => r.canonicalName === vipResolution);
        if (rule) entityType = rule.type;
      } else if (resolutionMethod === 'exact_match' && !vipResolution) {
        const idx = match.index || 0;
        const start = Math.max(0, idx - 100);
        const end = Math.min(fullText.length, idx + rawName.length + 100);
        const resContext = fullText.substring(start, end);
        const res = resolveAmbiguity(cleanName, resContext);
        if (res) entityType = res.entityType;
      } else {
        entityType = detectType(resolvedName);
      }

      if (!entityId) {
        if (entityType === 'Other') return;
        try {
          const res = insertEntity.run(
            resolvedName,
            entityType,
            1,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          );
          entityId = Number(res.lastInsertRowid);
          entityCache.set(lowerName, entityId);
          newEntities++;
        } catch {
          const existing = db
            .prepare('SELECT id FROM entities WHERE full_name = ?')
            .get(resolvedName) as { id: number };
          if (!existing) return;
          entityId = existing.id;
          entityCache.set(lowerName, entityId);
        }
      }

      // Role Attribution (Phase 4 Intelligence)
      if (entityType === 'Person' && entityId) {
        const idx = match.index || 0;
        const start = Math.max(0, idx - 150);
        const end = Math.min(fullText.length, idx + rawName.length + 150);
        const roleContext = fullText.substring(start, end);

        const foundRoles: string[] = [];
        for (const pattern of ROLE_PATTERNS) {
          if (pattern.regex.test(roleContext)) {
            foundRoles.push(pattern.role);
          }
        }

        if (foundRoles.length > 0) {
          db.prepare(
            `
          UPDATE entities 
          SET primary_role = COALESCE(primary_role, ?),
              entity_category = COALESCE(entity_category, ?)
          WHERE id = ? AND primary_role IS NULL
        `,
          ).run(foundRoles[0], foundRoles[0], entityId);
        }
      }
      // Confidence assignment
      let confidence = 0.5; // Default low for new/unknown
      if (vipResolution) confidence = 1.0;
      else if (entityType !== 'Person')
        confidence = 0.7; // Orgs/Locs usually reliable
      else if (entityId && !newEntities) confidence = 0.8; // Existing entity

      // B. Create Span and Mention
      const spanId = makeId();
      const idx = match.index || 0;
      const end = idx + rawName.length;

      insertSpan.run(
        spanId,
        doc.id,
        idx,
        end,
        'pdf_native', // Simplified for now
        1.0,
        currentResolverRunId,
      );

      const dbMentionId = makeId();
      insertMentionRow.run(
        dbMentionId,
        entityId,
        doc.id,
        spanId,
        idx,
        end,
        rawName,
        entityType,
        mentionContext,
        confidence,
        currentResolverRunId,
      );

      // Increment global and document-level counters
      newMentions++;

      // Simplification: Count every extraction towards the cap to be safe and prevent massive fan-out
      (doc as any).newEntitiesCount = ((doc as any).newEntitiesCount || 0) + 1;
      return {
        entityId,
        mentionId: dbMentionId,
        type: entityType,
        confidence,
        name: resolvedName,
      };
    }

    function extractAndStoreTriples(
      doc: any,
      fullText: string,
      foundEntities: any[],
      sentenceId?: number,
    ) {
      if (foundEntities.length < 2) return;

      // Check pairs of entities within the same context
      for (let i = 0; i < foundEntities.length; i++) {
        for (let j = 0; j < foundEntities.length; j++) {
          if (i === j) continue;

          const e1 = foundEntities[i];
          const e2 = foundEntities[j];

          // Text between entities
          const start = Math.min(e1.match.index, e2.match.index);
          const end = Math.max(
            e1.match.index + e1.match[0].length,
            e2.match.index + e2.match[0].length,
          );
          const midText = fullText.substring(start, end);

          for (const pattern of CLAIM_PATTERNS) {
            if (pattern.regex.test(midText)) {
              const tripleId = makeDeterministicId([
                'triple',
                e1.entityId,
                pattern.predicate,
                e2.entityId,
                doc.id,
                sentenceId || 0,
              ]);
              const modality =
                midText.toLowerCase().includes('not') || midText.toLowerCase().includes('deny')
                  ? 'denied'
                  : 'asserted';

              try {
                insertTriple.run(
                  e1.entityId,
                  pattern.predicate,
                  e2.entityId,
                  null,
                  doc.id,
                  sentenceId || null,
                  0.7,
                  modality,
                  JSON.stringify({
                    snippet: midText,
                    e1_text: e1.match[0],
                    e2_text: e2.match[0],
                  }),
                );
              } catch (e) {
                // ignore duplicate triples
              }
            }
          }
        }
      }
    }

    function processGranularProvenance(doc: any, sentences: any[]) {
      const newEntitiesInDoc = 0;
      (doc as any).newEntitiesCount = 0; // Initialize throttling counter
      const updateSignal = db.prepare(
        'UPDATE document_sentences SET signal_score = ? WHERE id = ?',
      );

      for (const s of sentences) {
        // 1. Boilerplate Filter (Kill Switch)
        if (s.is_boilerplate === 1) {
          continue;
        }

        // 2. Initial Signal Score (Base + Source Quality)
        let score = 0.5;
        if (s.text_source === 'visible_layer') score += 0.2;
        if (s.ocr_quality_score && s.ocr_quality_score < 0.7) score -= 0.2;

        const content = s.sentence_text;
        const POTENTIAL_ENTITY_REGEX = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})\b/g;
        const matches = [...content.matchAll(POTENTIAL_ENTITY_REGEX)];

        const foundInSentence: any[] = [];
        const hasVip = false;

        for (const match of matches) {
          const info = extractAndStoreMention(doc, match, content, s.id, s.page_id);
          if (info) {
            foundInSentence.push({ ...info, match });
            // Check if VIP (naive check via type or prior resolution?)
            // For now, if we found *any* entity, boost slightly.
            // If detailed VIP check needed, we'd check entity type returned.
            if (info.type && info.type !== 'Person') {
              // reduced boost for non-people? No, orgs are important.
            }
            score += 0.1;
          }
        }

        if (foundInSentence.length >= 2) {
          // Kill Switch: Do not create edges from unverified/low-confidence mentions
          const highConfidenceEntities = foundInSentence.filter((e) => e.confidence >= 0.6);

          if (highConfidenceEntities.length >= 2) {
            extractAndStoreTriples(doc, content, highConfidenceEntities, s.id);
            score += 0.2;
          }
        }

        // Cap score
        score = Math.min(1.0, Math.max(0.0, score));
        updateSignal.run(score, s.id);
      }

      // Expanded Harvesting: Extract contact information for persons found across all sentences
      const allFound = sentences.flatMap((s) =>
        [...s.sentence_text.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})\b/g)]
          .map((match) => {
            const info = extractAndStoreMention(doc, match, s.sentence_text, s.id, s.page_id);
            return info ? { name: info.name, type: info.type, entityId: info.entityId } : null;
          })
          .filter(Boolean),
      );
      harvestContacts(
        doc,
        (doc as any).content || sentences.map((s) => s.sentence_text).join(' '),
        allFound,
      );

      rollupScores(doc.id);
    }

    function rollupScores(docId: number) {
      // 1. Rollup to Page: Avg of Setence Scores
      const pages = db
        .prepare(
          `
      SELECT page_id, AVG(signal_score) as avg_score
      FROM document_sentences
      WHERE document_id = ? AND page_id IS NOT NULL
      GROUP BY page_id
    `,
        )
        .all(docId) as { page_id: number; avg_score: number }[];

      const updatePage = db.prepare('UPDATE document_pages SET signal_score = ? WHERE id = ?');
      for (const p of pages) {
        updatePage.run(p.avg_score, p.page_id);
      }

      // 2. Rollup to Document: Max of Page Scores (to highlight high-signal docs)
      // Or avg? User said "max(page score), count of high-score sentences..."
      // Let's use Max Page Score as the primary sort signal.
      const docStats = db
        .prepare(
          `
      SELECT MAX(signal_score) as max_score
      FROM document_pages
      WHERE document_id = ?
    `,
        )
        .get(docId) as { max_score: number };

      // If no pages (e.g. text file), fall back to avg of sentences
      let docScore = docStats ? docStats.max_score : 0;
      if (!docScore) {
        const sentStats = db
          .prepare(
            'SELECT AVG(signal_score) as avg_score FROM document_sentences WHERE document_id = ?',
          )
          .get(docId) as { avg_score: number };
        docScore = sentStats ? sentStats.avg_score : 0;
      }

      db.prepare('UPDATE documents SET signal_score = ? WHERE id = ?').run(docScore, docId);
    }

    function processCoarseProvenance(doc: any, content: string) {
      const POTENTIAL_ENTITY_REGEX = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})\b/g;
      const matches = [...content.matchAll(POTENTIAL_ENTITY_REGEX)];

      const foundInDoc: any[] = [];
      for (const match of matches) {
        const info = extractAndStoreMention(doc, match, content);
        if (info) {
          foundInDoc.push({ ...info, match });
        }
      }

      // For coarse provenance, we only extract triples if they are relatively close (e.g. within 200 chars)
      // but here we'll just skip to avoid garbage links in massive files.
      // In a better version, we'd split by paragraph even in coarse mode.

      // Expanded Harvesting: Extract contact information for persons
      harvestContacts(
        doc,
        content,
        foundInDoc.map((f) => ({ name: f.name, type: f.type, entityId: f.entityId })),
      );
    }

    entityRows.forEach((row) => {
      addToLastNameIndex(row.id, row.full_name, row.entity_type || 'Unknown');
      if (row.aliases) {
        row.aliases.split(',').forEach((alias: string) => {
          addToLastNameIndex(row.id, alias, row.entity_type || 'Unknown');
        });
      }
    });

    console.log(
      `🧠 Loaded ${entityCache.size} existing entities into memory (blocking keys: ${lastNameIndex.size}).`,
    );
    // 2. Sync VIP Entities (Force Update/Insert)
    console.log('👑 Syncing VIP entities...');
    const updateEntity = db.prepare(
      'UPDATE entities SET entity_category = ?, risk_level = ?, death_date = ?, notes = ?, red_flag_rating = ?, bio = ?, birth_date = ?, aliases = ?, is_vip = ? WHERE id = ?',
    );

    let syncedVips = 0;
    for (const rule of VIP_RULES) {
      const lower = normalizeName(rule.canonicalName).toLowerCase();
      let id = entityCache.get(lower);

      let riskLevel: string | null = null;
      let category: string | null = null;
      let deathDate: string | null = null;
      let notes: string | null = null;
      let bio: string | null = null;
      let birthDate: string | null = null;
      let redFlagRating = 1;

      if (rule.metadata) {
        riskLevel = rule.metadata.riskLevel || null;
        category = rule.metadata.category || null;
        deathDate = rule.metadata.deathDate || null;
        notes = rule.metadata.notes || null;
        bio = rule.metadata.bio || null;
        birthDate = rule.metadata.birthDate || null;

        if (riskLevel === 'high') redFlagRating = 3;
        else if (riskLevel === 'medium') redFlagRating = 2;
      }

      const aliasesStr = rule.aliases ? rule.aliases.join(',') : null;
      const isVipFlag = rule.type === 'Person' || rule.type === 'Organization' ? 1 : 0;

      if (id) {
        // Update
        updateEntity.run(
          category,
          riskLevel,
          deathDate,
          notes,
          redFlagRating,
          bio,
          birthDate,
          aliasesStr,
          isVipFlag,
          id,
        );
      } else {
        // Insert
        try {
          const res = insertEntity.run(
            rule.canonicalName,
            rule.type,
            redFlagRating,
            riskLevel,
            category,
            deathDate,
            notes,
            bio,
            birthDate,
            aliasesStr,
          );
          id = Number(res.lastInsertRowid);
          db.prepare('UPDATE entities SET is_vip = ? WHERE id = ?').run(isVipFlag, id);
          entityCache.set(lower, id);
          // Also index aliases
          if (rule.aliases) {
            rule.aliases.forEach((alias) => {
              entityCache.set(normalizeName(alias).toLowerCase(), id!);
            });
          }
          addToLastNameIndex(id, rule.canonicalName, rule.type);
        } catch (e) {
          console.error(`Failed to insert VIP ${rule.canonicalName}:`, e);
        }
      }
      syncedVips++;
    }
    console.log(`✅ Synced ${syncedVips} VIP entities.`);

    // 3. Fetch Unanalyzed Documents using JobManager for cluster safety
    const jobManager = new JobManager();
    console.log(`🤖 Worker ID: ${jobManager.getWorkerId()}`);

    // Signal Handling for Graceful Shutdown
    let shuttingDown = false;
    const currentJobId: number | null = null;

    const handleSignal = () => {
      if (shuttingDown) return;
      console.log('\n🛑 Graceful shutdown initiated...');
      shuttingDown = true;
    };

    process.on('SIGINT', handleSignal);
    process.on('SIGTERM', handleSignal);

    let hasMoreDocs = true;
    while (hasMoreDocs && !shuttingDown) {
      // We still support CLI overrides for single doc debugging
      const targetDocIdIdx = process.argv.indexOf('--document-id');
      const targetDocId =
        process.argv.find((arg) => arg.startsWith('--document-id='))?.split('=')[1] ||
        (targetDocIdIdx !== -1 && targetDocIdIdx + 1 < process.argv.length
          ? process.argv[targetDocIdIdx + 1]
          : null);

      let docs: any[] = [];

      if (targetDocId) {
        const idVal = parseInt(targetDocId);
        docs = db
          .prepare('SELECT id, content, file_name, file_path FROM documents WHERE id = ?')
          .all(idVal);
        hasMoreDocs = false; // Only process the requested doc
      } else {
        // Use JobManager to lease a batch of jobs
        for (let i = 0; i < BATCH_SIZE; i++) {
          const job = jobManager.acquireJob(600); // 10 min lease
          if (job) {
            const doc = db
              .prepare('SELECT id, content, file_name, file_path FROM documents WHERE id = ?')
              .get(job.id);
            if (doc) docs.push(doc);
          } else {
            break;
          }
        }
      }

      if (docs.length === 0) {
        console.log(
          targetDocId ? `❌ Document ${targetDocId} not found.` : '✨ No more documents in queue.',
        );
        hasMoreDocs = false;
        continue;
      }

      console.log(`📄 Processing leased batch of ${docs.length} documents...`);
      newEntities = 0;
      newMentions = 0;

      for (const doc of docs) {
        if (shuttingDown) {
          jobManager.failJob(doc.id, 'Worker shutting down');
          continue;
        }

        try {
          db.transaction(() => {
            const content = doc.content as string;
            extractCredentials(doc, content);

            const hasSentences = !!db
              .prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='document_sentences'",
              )
              .get();
            const sentences = hasSentences
              ? db
                  .prepare(
                    `
                            SELECT s.id, s.sentence_text, s.is_boilerplate, 
                                   p.id as page_id, p.ocr_quality_score, p.text_source
                            FROM document_sentences s
                            LEFT JOIN document_pages p ON s.page_id = p.id
                            WHERE s.document_id = ?
                            ORDER BY s.id ASC
                        `,
                  )
                  .all(doc.id)
              : [];

            if (sentences.length > 0) {
              processGranularProvenance(doc, sentences as any);
            } else {
              processCoarseProvenance(doc, content);
            }

            // Success
            db.prepare("UPDATE documents SET analyzed_at = datetime('now') WHERE id = ?").run(
              doc.id,
            );
            jobManager.completeJob(doc.id);
          })();
        } catch (err: any) {
          console.error(`❌ Failed to process document ${doc.id}:`, err.message);
          jobManager.failJob(doc.id, err.message);
        }
      }

      console.log(`   Batch complete. New Entities: ${newEntities}, Mentions: ${newMentions}`);
      totalEntities += newEntities;
      totalMentions += newMentions;
    }

    // 3. Post-Process: Map Relationships (Co-occurrence)
    console.log('🔗 Mapping Relationships (Co-occurrence)...');
    mapCoOccurrences();

    // 4. Post-Process: Populate relation_evidence when schema is available
    console.log('📎 Populating relation evidence from mentions...');
    populateRelationEvidence();

    console.log('🔗 Consolidating entities (auto-cleanup)...');
    performCleanup();

    console.log('🔗 Generating consolidation candidates...');
    consolidateEntities();

    console.log('⚖️ Running Dynamic Risk Recalibration...');
    await recalculateRisk();

    // Finalize Ingest Run with Invariants (Phase 1)
    console.log('🏁 Finalizing Run Manifest and verifying invariants...');
    try {
      // 1. SQLite quick_check
      const check = db.prepare('PRAGMA quick_check').get() as any;
      if (check.quick_check !== 'ok') throw new Error(`Database corrupted: ${check.quick_check}`);

      // 2. FTS Row count alignment (Sample)
      const docCountRec = db.prepare('SELECT COUNT(*) as c FROM documents').get() as any;
      const ftsCountRec = db.prepare('SELECT COUNT(*) as c FROM evidence_fts').get() as any;
      const docCount = docCountRec ? docCountRec.c : 0;
      const ftsCnt = ftsCountRec ? ftsCountRec.c : 0;

      if (Math.abs(docCount - ftsCnt) > docCount * 0.05) {
        // 5% drift tolerance
        console.warn(`⚠️ FTS Drift detected: Docs=${docCount}, FTS=${ftsCnt}`);
      }

      db.prepare(
        `
        UPDATE ingest_runs 
        SET status = 'success', finished_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `,
      ).run(ingestRunId);
      console.log('✅ Ingest Run completed successfully.');
    } catch (invErr: any) {
      console.error('❌ Invariant Check Failed:', invErr.message);
      db.prepare(
        `
        UPDATE ingest_runs 
        SET status = 'failed', finished_at = CURRENT_TIMESTAMP, notes = ? 
        WHERE id = ?
      `,
      ).run(`Invariant failure: ${invErr.message}`, ingestRunId);
    }

    console.log(`\n============== REPORT ==============`);
    console.log(`Total New Entities: ${totalEntities}`);
    console.log(`Total Mentions Added: ${totalMentions}`);
    console.log(`====================================`);
  } catch (error: any) {
    console.error('❌ Pipeline CRASHED:', error);
    if (db) {
      db.prepare(
        `
        UPDATE ingest_runs 
        SET status = 'failed', finished_at = CURRENT_TIMESTAMP, notes = ? 
        WHERE id = ?
      `,
      ).run(`Pipeline crash: ${error.message}`, currentResolverRunId);
    }
    throw error;
  } finally {
    if (db) db.close();
  }
}

// Check if this script is being run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runIntelligencePipeline().catch(console.error);
}

function mapCoOccurrences() {
  // Phase 3: Weighted Co-occurrence
  // Weights: Sentence=1.0, Paragraph=0.6, Page=0.35, Doc=0.15
  console.log('🔗 Mapping Relationships (Weighted Co-occurrence)...');

  // A. Sentence-level (Strongest)
  const sentencePairs = db
    .prepare(
      `
    SELECT s.id as sentence_id, GROUP_CONCAT(em.entity_id) as ids
    FROM document_sentences s
    JOIN entity_mentions em ON em.mention_id IN (
        SELECT id FROM mentions WHERE sentence_id = s.id
    )
    GROUP BY s.id
    HAVING COUNT(DISTINCT em.entity_id) > 1
  `,
    )
    .all() as { ids: string }[];

  processPairs(sentencePairs, 1.0);

  // B. Document-level fallback
  const docRows = db
    .prepare(
      `
    SELECT document_id, GROUP_CONCAT(entity_id) as ids 
    FROM entity_mentions 
    GROUP BY document_id 
    HAVING COUNT(DISTINCT entity_id) > 1
  `,
    )
    .all() as { ids: string }[];

  processPairs(docRows, 0.15);

  console.log(`   ✅ Created/Updated relationship links with weighted scoring.`);
}

function processPairs(rows: { ids: string }[], weight: number) {
  const insertRel = db.prepare(`
    INSERT INTO entity_relationships (source_entity_id, target_entity_id, relationship_type, strength, confidence) 
    VALUES (?, ?, 'co_occurrence', ?, 0.5) 
    ON CONFLICT(source_entity_id, target_entity_id, relationship_type) 
    DO UPDATE SET strength = strength + ?
  `);

  const tx = db.transaction((pairs: [number, number, any][]) => {
    for (const [a, b, evidence] of pairs) {
      insertRelation.run(a, b, weight, currentResolverRunId, JSON.stringify(evidence));
    }
  });

  let buffer: [number, number, any][] = [];
  for (const row of rows) {
    const ids = [...new Set(row.ids.split(',').map(Number))].sort((a, b) => a - b);
    if (ids.length > 50) continue;

    const evidence = {
      base_comention_count: ids.length,
      window_signal: weight === 1.0 ? 'sentence' : 'document',
      score_breakdown: { base: weight },
    };

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        buffer.push([ids[i], ids[j], evidence]);
      }
    }
    if (buffer.length >= 500) {
      tx(buffer);
      buffer = [];
    }
  }
  if (buffer.length > 0) tx(buffer);
}

function populateRelationEvidence() {
  // Use entity_relationships instead of legacy relations for evidence packs
  const insertRelationEvidence = db.prepare(
    'INSERT OR IGNORE INTO relation_evidence (id, relation_id, document_id, span_id, quote_text, confidence, mention_ids) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );

  const rows = db
    .prepare(
      `
        SELECT 
          em.document_id as document_id,
          em.entity_id as entity_id,
          em.id as mention_id,
          em.confidence as mention_conf,
          m.id as span_id,
          m.surface_text as surface_text
        FROM entity_mentions em
        JOIN document_spans m ON m.id = em.span_id
        WHERE em.ingest_run_id = ?
        ORDER BY em.document_id
      `,
    )
    .all(currentResolverRunId) as any[];

  if (!rows.length) {
    console.log('   No mentions found in this run for relation evidence.');
    return;
  }

  const byDoc = new Map<
    number,
    Map<number, { mention_id: string; span_id: string | null; quote: string; score: number }>
  >();

  for (const row of rows) {
    const docId = row.document_id as number;
    const entityId = row.entity_id as number;
    let perDoc = byDoc.get(docId);
    if (!perDoc) {
      perDoc = new Map();
      byDoc.set(docId, perDoc);
    }

    const existing = perDoc.get(entityId);
    const quote = `${row.surface_text || ''}`.replace(/\s+/g, ' ').trim().slice(0, 400);
    const score = row.mention_conf || 1.0;

    if (!existing || score > existing.score) {
      perDoc.set(entityId, {
        mention_id: row.mention_id,
        span_id: row.span_id || null,
        quote,
        score,
      });
    }
  }

  let inserted = 0;

  const tx = db.transaction(() => {
    for (const [docId, entityMap] of byDoc.entries()) {
      const entityIds = Array.from(entityMap.keys()).sort((a, b) => a - b);
      if (entityIds.length < 2) continue;

      for (let i = 0; i < entityIds.length; i++) {
        for (let j = i + 1; j < entityIds.length; j++) {
          const a = entityIds[i];
          const b = entityIds[j];
          const evidence = {
            supporting_mention_ids: [entityMap.get(a)!.mention_id, entityMap.get(b)!.mention_id],
            document_id: docId,
          };

          insertRelation.run(
            a,
            b,
            0.1, // Small weight for co-occurrence co-mentions
            currentResolverRunId,
            JSON.stringify(evidence),
          );
          inserted++;
        }
      }
    }
  });

  tx();

  console.log(`   ✅ Populated ${inserted} evidentiary connections. `);
}

function consolidateEntities() {
  console.log('   Starting entity consolidation...');
  // Find entities with similar names that aren't already grouped
  const entities = db.prepare('SELECT id, full_name, entity_type FROM entities').all() as any[];

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const e1 = entities[i];
      const e2 = entities[j];

      if (e1.entity_type !== e2.entity_type) continue;

      const n1 = e1.full_name.toLowerCase();
      const n2 = e2.full_name.toLowerCase();

      // Simple logic: if one contains the other and they are > 10 chars, or exact match
      if (n1 === n2 || (n1.length > 10 && n2.length > 10 && (n1.includes(n2) || n2.includes(n1)))) {
        db.prepare(
          'INSERT OR IGNORE INTO resolution_candidates (id, left_entity_id, right_entity_id, candidate_type, score, decision) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(
          makeDeterministicId(['consolidation', e1.id, e2.id]),
          e1.id,
          e2.id,
          'name_similarity',
          0.9,
          'pending',
        );
      }
    }
  }
}

function performCleanup() {
  console.log('🧹 Performing automated entity cleanup...');
  // 1. Delete Junk Patterns
  const TO_DELETE_PATTERNS = [
    'Hi Jeffrey',
    'Hello Jeffrey',
    'Dear Jeffrey',
    'Hey Jeffrey',
    'The Jeffrey Epstein',
    'About Jeffrey Epstein',
    'For Jeffrey Epstein',
    'With Jeffrey Epstein',
    'With Jeffrey',
    'Unknown Sender',
    'Unknown Doctor',
    'Unknown Current Medications',
    'No Subject',
    'Unknown',
    'Going On',
    'Not Going',
    'Epstein Jeffrey',
  ];

  const deleteList = TO_DELETE_PATTERNS.filter((p) => !p.includes('Epstein Jeffrey'));
  const deleteStmt = db.prepare('DELETE FROM entities WHERE full_name = ?');
  const checkStmt = db.prepare('SELECT id FROM entities WHERE full_name = ?');
  const deleteMentions = db.prepare('DELETE FROM entity_mentions WHERE entity_id = ?');

  for (const name of deleteList) {
    const row = checkStmt.get(name) as { id: number } | undefined;
    if (row) {
      deleteMentions.run(row.id);
      deleteStmt.run(name);
      console.log(`   Deleted junk: ${name}`);
    }
  }

  // 2. Merge Duplicates
  const je = checkStmt.get('Jeffrey Epstein') as { id: number } | undefined;
  if (je) {
    // logic to merge
    const TO_MERGE_PATTERNS = [
      'Epstein Jeffrey',
      'Epstem Jeffrey',
      'Jenrey E. Masrein Jeffrey',
      'Chil Jeffrey',
      'Jeffrey Bateman',
      'Sex Offender Jeffrey',
      'Billionaire Jeffrey Epstein',
      'Jeffrey  We',
      'Sam Epstein',
    ];

    const updateMentions = db.prepare(
      'UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?',
    );

    for (const name of TO_MERGE_PATTERNS) {
      const row = checkStmt.get(name) as { id: number } | undefined;
      if (row && row.id !== je.id) {
        updateMentions.run(je.id, row.id);
        deleteStmt.run(name);
        console.log(`   Merged ${name} -> Jeffrey Epstein`);
      }
    }
  }
}

function consolidateClaims() {
  // Corroborate claims by counting occurrences across different documents
  const counts = db
    .prepare(
      `
    SELECT subject_entity_id, predicate, object_entity_id, COUNT(DISTINCT document_id) as doc_count, COUNT(*) as total_count
    FROM claim_triples
    GROUP BY subject_entity_id, predicate, object_entity_id
    HAVING total_count > 1
  `,
    )
    .all() as {
    subject_entity_id: number;
    predicate: string;
    object_entity_id: number;
    doc_count: number;
    total_count: number;
  }[];

  const updateConf = db.prepare(`
    UPDATE claim_triples 
    SET confidence = ? 
    WHERE subject_entity_id = ? AND predicate = ? AND object_entity_id = ?
  `);

  let updated = 0;
  db.transaction(() => {
    for (const row of counts) {
      // Base confidence starts around 0.7 (from extraction)
      // Boost by 0.1 for every extra document, up to 1.0 (max confidence)
      // Corroboration formula: base + (log2(doc_count) * 0.1)
      const boost = Math.min(0.3, Math.log2(row.doc_count) * 0.1);
      const newConf = Math.min(1.0, 0.7 + boost);

      updateConf.run(newConf, row.subject_entity_id, row.predicate, row.object_entity_id);
      updated += row.total_count;
    }
  })();

  console.log(`   ✅ Corroborated ${counts.length} unique claims across ${updated} instances.`);
}

function sanitizeContent() {
  console.log('🧹 Sanity Check: Scanning for MIME artifacts in database...');
  // Heuristic: Documents with "=" followed by a newline or hex digits are likely dirty MIME QP
  // We check for processing_status='succeeded' to only clean valid docs.
  const candidates = db
    .prepare(
      `
    SELECT id, content FROM documents 
    WHERE (content LIKE '%=%' OR content LIKE '%â%')
      AND (processing_status = 'succeeded' OR analyzed_at IS NOT NULL)
  `,
    )
    .all() as { id: number; content: string }[];

  console.log(`   Found ${candidates.length} candidates for MIME sanitization.`);

  let cleanedCount = 0;
  const updateDoc = db.prepare('UPDATE documents SET content = ?, analyzed_at = NULL WHERE id = ?');
  const hasSentences = !!db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='document_sentences'")
    .get();
  const hasPages = !!db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='document_pages'")
    .get();
  const clearSentences = hasSentences
    ? db.prepare('DELETE FROM document_sentences WHERE document_id = ?')
    : null;
  const clearPages = hasPages
    ? db.prepare('DELETE FROM document_pages WHERE document_id = ?')
    : null;
  const clearMentions = db.prepare('DELETE FROM entity_mentions WHERE document_id = ?');

  const tx = db.transaction(() => {
    for (const doc of candidates) {
      if (!doc.content) continue;
      const originals = doc.content;
      const cleaned = TextCleaner.cleanEmailText(originals);

      // If content cleaned resulted in a change (meaning artifacts were removed/fixed)
      if (cleaned !== originals) {
        updateDoc.run(cleaned, doc.id);
        if (clearSentences) clearSentences.run(doc.id);
        if (clearPages) clearPages.run(doc.id);
        clearMentions.run(doc.id); // Clear mentions so they get re-extracted on next pass
        cleanedCount++;
        if (cleanedCount % 50 === 0) process.stdout.write(`   Sanitized ${cleanedCount}...\r`);
      }
    }
  });

  if (candidates.length > 0) {
    tx();
  }

  if (cleanedCount > 0) {
    console.log(`   ✅ Sanitized and reset ${cleanedCount} documents.`);
  } else {
    console.log(`   ✅ No documents required sanitization.`);
  }
}
