import Database from 'better-sqlite3';
import * as crypto from 'crypto';
import { extractEvidence, scoreCategoryMatch } from './utils/evidence_extractor.js';
import { recalculateRisk } from './recalculate_entity_risk.js';

// Simplistic NLP / Term Extraction
// In a real "Ultimate" pipeline, we might call an LLM here,
// but for reliability/speed let's start with robust regex & heuristics + consolidation.

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
let db: Database.Database;
let currentResolverRunId: string;

// CONFIGURATION
const BATCH_SIZE = 100;

// ... (Pattern definitions remain here) ...
const LOCATION_PATTERN =
  /\b(House|Street|Road|Avenue|Park|Beach|Islands|Drive|Place|Apartment|Mansion)\b/i;
const HOUSEKEEPER_PATTERN = /Housekeeper/i;
const ORG_PATTERN =
  /\b(Inc\.?|LLC|Corp\.?|Ltd\.?|Group|Trust|Foundation|University|College|School|Academy|Department|Bureau|Agency|Police|Sheriff|FBI|CIA|Secret Service|Bank|Association|Club|Holdings|Limited|Fund)\b/i;
const MEDIA_PATTERN = /\b(New York Times|Post|News|Press|Journal|Magazine)\b/i;
const FINANCIAL_PATTERN = /\b(Bank|Financial|Transfer|Payment|Account|Trust|LLC|Inc|Corp)\b/i;

// Phase 3: Quarantine Patterns (Simulated/Heuristic)
const QUARANTINE_PATTERNS = [
  { regex: /explicit|child|illegal/i, reason: 'Potentially sensitive keywords' },
  { regex: /password|secret|key/i, reason: 'Potentially leaked credentials' },
];

function checkQuarantine(text: string): { status: 'quarantined' | 'none'; reason?: string } {
  for (const pattern of QUARANTINE_PATTERNS) {
    if (pattern.regex.test(text)) {
      return { status: 'quarantined', reason: pattern.reason };
    }
  }
  return { status: 'none' };
}

function detectType(
  name: string,
): 'Person' | 'Organization' | 'Location' | 'Media' | 'Financial' | 'Other' {
  const parts = name.split(/[\s,.]+/);

  // 1. Organization Check
  if (ORG_PATTERN.test(name)) return 'Organization';

  // 2. Media Check
  if (MEDIA_PATTERN.test(name)) return 'Media';

  // 3. Financial Check
  if (FINANCIAL_PATTERN.test(name)) return 'Financial';

  // 4. Location Check (with exclusions)
  if (LOCATION_PATTERN.test(name) && !HOUSEKEEPER_PATTERN.test(name)) return 'Location';

  // 5. Person Heuristic (Default for 2-4 words capitalized)
  if (parts.length >= 2 && parts.length <= 4) return 'Person';

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

function makeId(): string {
  // Simple 128-bit hex id for spans, mentions, etc.
  return crypto.randomBytes(16).toString('hex');
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
  console.log('🚀 Starting ULTIMATE Entity Ingestion Pipeline...');

  currentResolverRunId = makeId();
  const resolverVersion = '1.1.0';

  // Initialize DB locally within the function to avoid top-level side effects
  db = new Database(DB_PATH);
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
  const insertEntityMention = db.prepare(`
    INSERT INTO entity_mentions (
      entity_id, document_id, mention_context, keyword, 
      significance_score, confidence_score, link_method, 
      resolver_run_id, resolver_version, evidence_json,
      sentence_id, page_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

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

  const insertSpan = hasDocumentSpans
    ? db.prepare(
        'INSERT INTO document_spans (id, document_id, page_num, span_start_char, span_end_char, raw_text, cleaned_text, ocr_confidence, layout_json) VALUES (?, ?, NULL, ?, ?, ?, ?, NULL, NULL)',
      )
    : null;

  const insertMentionRow = hasMentionsTable
    ? db.prepare(
        'INSERT INTO mentions (id, document_id, span_id, mention_start_char, mention_end_char, surface_text, normalised_text, entity_type, ner_model, ner_confidence, context_window_before, context_window_after, sentence_id, paragraph_id, extracted_features_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)',
      )
    : null;

  const insertResolutionCandidate = hasResolutionCandidates
    ? db.prepare(
        "INSERT OR IGNORE INTO resolution_candidates (id, left_entity_id, right_entity_id, mention_id, candidate_type, score, feature_vector_json, decision, decided_at, decided_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)",
      )
    : null;

  const _insertRelation = hasRelationsTable
    ? db.prepare(
        "INSERT INTO relations (id, subject_entity_id, object_entity_id, predicate, direction, weight, first_seen_at, last_seen_at, status) VALUES (?, ?, ?, 'mentioned_with', 'undirected', ?, datetime('now'), datetime('now'), 'active') ON CONFLICT(id) DO UPDATE SET weight = weight + excluded.weight, last_seen_at = excluded.last_seen_at",
      )
    : null;

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

  // Stats
  let totalEntities = 0;
  let totalMentions = 0;
  let newEntities = 0;
  let newMentions = 0;

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
  const lastNameIndex = new Map<string, { id: number; full_name: string; entity_type: string }[]>();

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
      ENTITY_PARTIAL_BLOCKLIST.some((term) => cleanName.toLowerCase().includes(term.toLowerCase()))
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
    let resolutionMethod = vipResolution ? 'vip_rule' : 'exact';

    if (!vipResolution) {
      // Boilerplate Check on Context (Hygiene)
      if (BoilerplateService.getInstance().isBoilerplate(fullText)) {
        return; // Skip entities in boilerplate blocks
      }

      const idx = match.index || 0;
      const start = Math.max(0, idx - 100);
      const end = Math.min(fullText.length, idx + rawName.length + 100);
      const resolutionContext = fullText.substring(start, end);
      const res = resolveAmbiguity(cleanName, resolutionContext);
      if (res) {
        resolvedName = res.resolvedName;
        resolutionMethod = 'context_rule';
      }
    }

    const lowerName = resolvedName.toLowerCase();
    let entityId = entityCache.get(lowerName);
    let entityType = 'Person';

    if (vipResolution) {
      const rule = VIP_RULES.find((r) => r.canonicalName === vipResolution);
      if (rule) entityType = rule.type;
    } else if (resolutionMethod === 'context_rule') {
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

    // B. Mention
    // Confidence assignment
    let confidence = 0.5; // Default low for new/unknown
    if (vipResolution) confidence = 1.0;
    else if (entityType !== 'Person')
      confidence = 0.7; // Orgs/Locs usually reliable
    else if (entityId && !newEntities) confidence = 0.8; // Existing entity

    const evidence = extractEvidence(
      fullText,
      match.index || 0,
      (match.index || 0) + rawName.length,
    );
    const score = evidence.score;
    const context = evidence.context;

    insertEntityMention.run(
      entityId,
      doc.id,
      context,
      cleanName,
      score,
      confidence,
      resolutionMethod,
      currentResolverRunTableId || null,
      resolverVersion,
      JSON.stringify(evidence),
      sentenceId || null,
      pageId || null,
    );

    const dbMentionId = Number((db.prepare('SELECT last_insert_rowid() as id').get() as any).id);

    // C. Resolution Event (Phase 3 Explainability)
    if (insertResolutionEvent) {
      insertResolutionEvent.run(
        currentResolverRunTableId || null,
        doc.id,
        cleanName,
        entityId,
        resolutionMethod,
        confidence, // Use the calculated confidence here
        JSON.stringify({
          original_text: rawName,
          context: context,
          vip_rule: !!vipResolution,
          mention_id: dbMentionId,
        }),
      );
    }

    // Increment global and document-level counters
    newMentions++;

    // Simplification: Count every extraction towards the cap to be safe and prevent massive fan-out
    (doc as any).newEntitiesCount = ((doc as any).newEntitiesCount || 0) + 1;
    return { entityId, mentionId: dbMentionId, type: entityType, confidence };
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
    const updateSignal = db.prepare('UPDATE document_sentences SET signal_score = ? WHERE id = ?');

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
    'UPDATE entities SET entity_category = ?, risk_level = ?, death_date = ?, notes = ?, red_flag_rating = ?, bio = ?, birth_date = ?, aliases = ? WHERE id = ?',
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

  // 3. Fetch Unanalyzed Documents
  // Process in batches
  let hasMoreDocs = true;
  while (hasMoreDocs) {
    const docs = db
      .prepare(
        `
        SELECT id, content, file_name, file_path
        FROM documents
        WHERE analyzed_at IS NULL AND content IS NOT NULL
        LIMIT ?
      `,
      )
      .all(BATCH_SIZE) as any[];

    if (docs.length === 0) {
      console.log('✨ All documents processed.');
      hasMoreDocs = false;
      continue;
    }

    console.log(`📄 Processing batch of ${docs.length} documents...`);
    newEntities = 0;
    newMentions = 0;

    const markAnalyzed = db.prepare(
      "UPDATE documents SET analyzed_at = datetime('now') WHERE id = ?",
    );

    db.transaction(() => {
      for (const doc of docs) {
        const content = doc.content as string;

        // Phase 3: Content Classification & Quarantine
        const q = checkQuarantine(content);
        if (q.status === 'quarantined') {
          db.prepare(
            `
            UPDATE documents 
            SET quarantine_status = 'quarantined', 
                quarantine_reason = ?, 
                quarantine_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `,
          ).run(q.reason, doc.id);
          console.log(`   ⚠️ Document ${doc.id} quarantined: ${q.reason}`);
          markAnalyzed.run(doc.id);
          continue;
        }

        // Fetch granular data (Pages/Sentences) for provenance
        const sentences = db
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
          .all(doc.id) as {
          id: number;
          sentence_text: string;
          page_id: number;
          is_boilerplate: number;
          ocr_quality_score: number;
          text_source: string;
        }[];

        if (sentences.length > 0) {
          processGranularProvenance(doc, sentences);
        } else {
          processCoarseProvenance(doc, content);
        }

        markAnalyzed.run(doc.id);
      }
    });

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

  console.log(`\n============== REPORT ==============`);
  console.log(`Total New Entities: ${totalEntities}`);
  console.log(`Total Mentions Added: ${totalMentions}`);
  console.log(`====================================`);
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

  const tx = db.transaction((pairs: [number, number][]) => {
    for (const [a, b] of pairs) {
      insertRel.run(a, b, weight, weight);
    }
  });

  let buffer: [number, number][] = [];
  for (const row of rows) {
    const ids = [...new Set(row.ids.split(',').map(Number))].sort((a, b) => a - b);
    if (ids.length > 50) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        buffer.push([ids[i], ids[j]]);
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
  const hasRelationEvidence = !!db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'relation_evidence'")
    .get();
  const hasRelations = !!db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'relations'")
    .get();
  const hasMentions = !!db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'mentions'")
    .get();

  if (!hasRelationEvidence || !hasRelations || !hasMentions) {
    console.log('   Skipping relation_evidence population (schema not present).');
    return;
  }

  const insertRelationEvidence = db.prepare(
    'INSERT OR IGNORE INTO relation_evidence (id, relation_id, document_id, span_id, quote_text, confidence, mention_ids) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );

  const rows = db
    .prepare(
      `
        SELECT 
          em.document_id as document_id,
          em.entity_id as entity_id,
          em.mention_id as mention_id,
          em.score as mention_score,
          m.span_id as span_id,
          m.surface_text as surface_text,
          m.context_window_before as before,
          m.context_window_after as after
        FROM entity_mentions em
        JOIN mentions m ON m.id = em.mention_id
        WHERE em.mention_id IS NOT NULL
        ORDER BY em.document_id
      `,
    )
    .all() as any[];

  if (!rows.length) {
    console.log('   No mention-backed entity_mentions found for relation evidence.');
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
    const quote = `${row.before || ''}${row.surface_text || ''}${row.after || ''}`
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 400);
    const score = typeof row.mention_score === 'number' ? row.mention_score : 1.0;

    // Keep the highest-scoring mention per (doc, entity) pair
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
          const relId = `${Math.min(a, b)}-${Math.max(a, b)}-mentioned_with`;

          const aData = entityMap.get(a)!;
          const bData = entityMap.get(b)!;
          const quote = (aData.quote || bData.quote || '').slice(0, 400);
          const conf = Math.min(aData.score, bData.score);
          const mentionIds = JSON.stringify([aData.mention_id, bData.mention_id]);
          const spanId = aData.span_id || bData.span_id || null;

          const evId = makeDeterministicId([
            'relEvidence',
            relId,
            docId,
            aData.mention_id,
            bData.mention_id,
          ]);

          // Ensure relation exists to satisfy foreign key
          if (hasRelations) {
            db.prepare(
              "INSERT OR IGNORE INTO relations (id, subject_entity_id, object_entity_id, predicate, direction, weight, status) VALUES (?, ?, ?, 'mentioned_with', 'undirected', 0, 'active')",
            ).run(relId, Math.min(a, b), Math.max(a, b));
          }

          insertRelationEvidence.run(evId, relId, docId, spanId, quote, conf, mentionIds);
          inserted++;
        }
      }
    }
  });

  tx();

  console.log(`   ✅ Populated ${inserted} relation_evidence rows.`);
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
