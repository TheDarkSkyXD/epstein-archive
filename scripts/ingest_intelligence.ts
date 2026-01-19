import Database from 'better-sqlite3';
// fs imports reserved for future file operations
import * as crypto from 'crypto';

// Simplistic NLP / Term Extraction
// In a real "Ultimate" pipeline, we might call an LLM here,
// but for reliability/speed let's start with robust regex & heuristics + consolidation.

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

// CONFIGURATION
const BATCH_SIZE = 100;

// TYPE HEURISTICS
const ORG_SUFFIXES = [
  'Inc',
  'Corp',
  'LLC',
  'Ltd',
  'Bank',
  'Foundation',
  'University',
  'Institute',
  'Association',
  'Club',
  'Holdings',
  'Trust',
  'Limited',
  'Group',
  'Fund',
];
const LOC_TERMS = [
  'Street',
  'Avenue',
  'Boulevard',
  'Drive',
  'Road',
  'Lane',
  'Island',
  'City',
  'County',
  'State',
  'New York',
  'Florida',
  'Palm Beach',
  'Paris',
  'London',
  'Airport',
  'House',
  'Mansion',
];

function detectType(name: string): 'Person' | 'Organization' | 'Location' | 'Other' {
  const parts = name.split(/[\s,.]+/);
  if (ORG_SUFFIXES.some((s) => new RegExp(`\\b${s}\\b`, 'i').test(name))) return 'Organization';
  if (LOC_TERMS.some((s) => new RegExp(`\\b${s}\\b`, 'i').test(name))) return 'Location';
  if (parts.length >= 2 && parts.length <= 4) return 'Person'; // Default for 2-4 words capitalized
  return 'Other';
}

// Import centralized blacklist
// TODO: Use ENTITY_BLACKLIST for validation - see UNUSED_VARIABLES_RECOMMENDATIONS.md
import {
  ENTITY_BLACKLIST as _ENTITY_BLACKLIST,
  ENTITY_BLACKLIST_REGEX,
  ENTITY_PARTIAL_BLOCKLIST,
} from '../src/config/entityBlacklist';

const JUNK_REGEX = ENTITY_BLACKLIST_REGEX;

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

function rebuildEntityPipeline() {
  console.log('🚀 Starting ULTIMATE Entity Ingestion Pipeline...');

  const insertEntity = db.prepare(
    'INSERT INTO entities (full_name, entity_type, red_flag_rating) VALUES (?, ?, ?)',
  );
  // Check existing entity_mentions schema to see if extended columns are present.
  const mentionsColumns = db.prepare('PRAGMA table_info(entity_mentions)').all() as {
    name: string;
  }[];
  const hasAssignedBy = mentionsColumns.some((c) => c.name === 'assigned_by');
  const hasScoreCol = mentionsColumns.some((c) => c.name === 'score');
  const hasDecisionVersion = mentionsColumns.some((c) => c.name === 'decision_version');
  const hasEvidenceJson = mentionsColumns.some((c) => c.name === 'evidence_json');
  const hasMentionIdCol = mentionsColumns.some((c) => c.name === 'mention_id');

  const insertEntityMention =
    hasAssignedBy && hasScoreCol && hasDecisionVersion && hasEvidenceJson && hasMentionIdCol
      ? db.prepare(
          'INSERT INTO entity_mentions (entity_id, document_id, mention_context, keyword, assigned_by, score, decision_version, evidence_json, mention_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
      : db.prepare(
          'INSERT INTO entity_mentions (entity_id, document_id, mention_context, keyword) VALUES (?, ?, ?, ?)',
        );

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
  const hasRelationEvidence = !!db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'relation_evidence'")
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

  const insertRelation = hasRelationsTable
    ? db.prepare(
        "INSERT INTO relations (id, subject_entity_id, object_entity_id, predicate, direction, weight, first_seen_at, last_seen_at, status) VALUES (?, ?, ?, 'mentioned_with', 'undirected', ?, datetime('now'), datetime('now'), 'active') ON CONFLICT(id) DO UPDATE SET weight = weight + excluded.weight, last_seen_at = excluded.last_seen_at",
      )
    : null;

  const insertRelationEvidence = hasRelationEvidence
    ? db.prepare(
        'INSERT INTO relation_evidence (id, relation_id, document_id, span_id, quote_text, confidence, mention_ids) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
    : null;

  const insertQualityFlag = hasQualityFlags
    ? db.prepare(
        "INSERT INTO quality_flags (id, target_type, target_id, flag_type, severity, details_json, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), NULL)",
      )
    : null;

  // Stats
  let totalEntities = 0;
  let totalMentions = 0;
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

  // 2. Fetch Unanalyzed Documents
  // Process in batches
  let hasMoreDocs = true;
  while (hasMoreDocs) {
    const docs = db
      .prepare(
        `
        SELECT id, content, file_name
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
    let newEntities = 0;
    let newMentions = 0;

    const markAnalyzed = db.prepare(
      "UPDATE documents SET analyzed_at = datetime('now') WHERE id = ?",
    );

    db.transaction(() => {
      for (const doc of docs) {
        const content = doc.content as string;

        // Create a coarse span covering the whole document content when the
        // new schema is available. This gives us a substrate for mentions
        // without needing per-page layout yet.
        let spanId: string | null = null;
        if (hasDocumentSpans && insertSpan) {
          spanId = makeId();
          insertSpan.run(spanId, doc.id, 0, content.length, content, content);
        }

        // Heuristic: Capitalized words (2-5 words long)
        const POTENTIAL_ENTITY_REGEX = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})\b/g;

        const matches = [...content.matchAll(POTENTIAL_ENTITY_REGEX)];
        // TODO: Track entity mentions per document - see UNUSED_VARIABLES_RECOMMENDATIONS.md
        const _docMentions = new Set<string>(); // avoid dups per doc if context weak
        const docEntityFirstMention = new Map<number, string>();

        for (const match of matches) {
          const rawName = match[0];
          const cleanName = normalizeName(rawName);

          // A. Junk Filter
          if (cleanName.length < 4) continue;
          if (JUNK_REGEX.test(cleanName)) continue;
          if (cleanName.includes('Epstein') && !cleanName.includes('Island')) continue; // Skip generic Epstein, allow Island

          // Check partial blocklist (e.g. "Received Received")
          if (
            ENTITY_PARTIAL_BLOCKLIST.some((term) =>
              cleanName.toLowerCase().includes(term.toLowerCase()),
            )
          ) {
            continue;
          }

          // B. Resolve
          const lowerName = cleanName.toLowerCase();
          let entityId = entityCache.get(lowerName);
          let entityType = 'Person';

          if (!entityId) {
            // Heuristic Type Detection
            entityType = detectType(cleanName);
            if (entityType === 'Other') continue; // Skip ambiguous "Other" for now to reduce noise? OR keep as generic?
            // Let's keep strict for now: if implies Org/Loc or looks like Human Name

            try {
              const res = insertEntity.run(cleanName, entityType, 1);
              entityId = Number(res.lastInsertRowid);
              entityCache.set(lowerName, entityId);
              newEntities++;
            } catch (e) {
              continue;
            }
          }

          // C. Mention
          // Only add one mention per entity per doc UNLESS specific context? keeps DB smaller.
          // User requested "rich metadata", so full mentions are good.
          const idx = match.index || 0;
          const start = Math.max(0, idx - 50);
          const end = Math.min(content.length, idx + rawName.length + 50);
          const context = content.substring(start, end).replace(/\s+/g, ' ');

          // Simple feature-style scoring for now: exact match gets 1.0,
          // otherwise treat as slightly lower confidence.
          const exactMatch = lowerName === normalizeName(cleanName).toLowerCase();
          const score = exactMatch ? 1.0 : 0.85;

          // Build evidence payload (very lightweight starter version)
          const evidence = {
            context,
            rawName,
            cleanName,
            entityType,
          };

          let mentionId: string | null = null;

          if (hasMentionsTable && insertMentionRow && spanId) {
            mentionId = makeId();
            insertMentionRow.run(
              mentionId,
              doc.id,
              spanId,
              match.index || 0,
              (match.index || 0) + rawName.length,
              rawName,
              cleanName.toLowerCase(),
              entityType,
              'regex-capitalized-heuristic',
              score,
              content.substring(start, idx),
              content.substring(idx + rawName.length, end),
              JSON.stringify({ source: 'ingest_intelligence_v1' }),
            );

            // Track the first mention id per entity in this document for
            // relationship evidence.
            if (!docEntityFirstMention.has(entityId)) {
              docEntityFirstMention.set(entityId, mentionId);
            }
          }

          // Insert into entity_mentions, either with extended columns when
          // available, or in the legacy 4-column shape.
          if (
            hasAssignedBy &&
            hasScoreCol &&
            hasDecisionVersion &&
            hasEvidenceJson &&
            hasMentionIdCol
          ) {
            insertEntityMention.run(
              entityId,
              doc.id,
              context,
              cleanName,
              'auto',
              score,
              1,
              JSON.stringify(evidence),
              mentionId,
            );
          } else {
            insertEntityMention.run(entityId, doc.id, context, cleanName);
          }

          newMentions++;

          // Also record resolution_candidate rows for auditability when table exists.
          if (hasResolutionCandidates && insertResolutionCandidate && mentionId) {
            const mentionTokens = cleanName
              .toLowerCase()
              .split(' ')
              .filter((t) => t.length > 0);
            const mentionLast = mentionTokens[mentionTokens.length - 1];

            const candidates = lastNameIndex.get(mentionLast) || [];

            // Helper to compute a simple feature-based score between mention and candidate entity
            function computeCandidateScore(candidateName: string, candidateType: string): {
              score: number;
              features: Record<string, number>;
            } {
              const candTokens = candidateName
                .toLowerCase()
                .split(' ')
                .filter((t) => t.length > 0);
              const setMention = new Set(mentionTokens);
              const setCand = new Set(candTokens);
              let inter = 0;
              for (const t of setMention) {
                if (setCand.has(t)) inter++;
              }
              const union = new Set([...mentionTokens, ...candTokens]).size || 1;
              const jaccard = inter / union;

              const fNameExact =
                normalizeName(candidateName).toLowerCase() === lowerName ? 1 : 0;
              const fLastNameMatch = 1; // by construction of the blocking key
              const fTypeMatch = detectType(cleanName) === candidateType ? 1 : 0;

              const scoreVal =
                0.5 * fNameExact + 0.25 * jaccard + 0.25 * fTypeMatch;

              return {
                score: Math.max(scoreVal, 0.01),
                features: {
                  F_name_exact: fNameExact,
                  F_last_name_match: fLastNameMatch,
                  F_token_jaccard: jaccard,
                  F_type_match: fTypeMatch,
                },
              };
            }

            // Build candidate list and limit to top K
            const scoredCandidates = candidates
              .map((c) => {
                const { score: candScore, features } = computeCandidateScore(
                  c.full_name,
                  c.entity_type || 'Unknown',
                );
                return { ...c, candScore, features };
              })
              .sort((a, b) => b.candScore - a.candScore)
              .slice(0, 5);

            for (const cand of scoredCandidates) {
              const features = {
                ...cand.features,
                F_name_soft: 1,
              };
              const candidateScore = cand.candScore;
              const decision = cand.id === entityId ? 'merged' : null;

              const candidateIdDet = makeDeterministicId([
                'resCandidate',
                mentionId,
                cand.id,
              ]);

              insertResolutionCandidate.run(
                candidateIdDet,
                cand.id,
                entityId,
                mentionId,
                'mention_to_entity',
                candidateScore,
                JSON.stringify(features),
                decision,
                'auto',
              );
            }
          }

          // Add a low_evidence quality flag for lower-confidence mentions
          // when the table is available.
          if (insertQualityFlag && hasQualityFlags && mentionId && score < 0.9) {
            const flagId = makeId();
            insertQualityFlag.run(
              flagId,
              'mention',
              mentionId,
              'low_evidence',
              'low',
              JSON.stringify({ score, rawName, cleanName }),
            );
          }
        }
        markAnalyzed.run(doc.id);
      }
    })();

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

  console.log(`\n============== REPORT ==============`);
  console.log(`Total New Entities: ${totalEntities}`);
  console.log(`Total Mentions Added: ${totalMentions}`);
  console.log(`====================================`);
}

function mapCoOccurrences() {
  // 1. Find docs with > 1 entity
  // We limit to docs processed in this run? Or all?
  // "Ultimate" implies full regeneration, but we should be efficient.
  // Let's process valid docs.
  const BATCH_SIZE_REL = 500;

  // Group by document, get entity list
  // This query can be heavy. Let's do it in chunks or simpler way?
  // Aggregation in sqlite is okay.
  const rows = db
    .prepare(
      `
        SELECT document_id, GROUP_CONCAT(entity_id) as ids 
        FROM entity_mentions 
        GROUP BY document_id 
        HAVING COUNT(DISTINCT entity_id) > 1
    `,
    )
    .all() as { document_id: number; ids: string }[];

  console.log(`   Found ${rows.length} documents with multiple entities for linking.`);

  const insertRel = db.prepare(`
        INSERT INTO entity_relationships (source_entity_id, target_entity_id, relationship_type, strength, confidence) 
        VALUES (?, ?, 'co_occurrence', ?, 0.5) 
        ON CONFLICT(source_entity_id, target_entity_id, relationship_type) 
        DO UPDATE SET strength = strength + ?
    `);

  const hasRelationsTable = !!db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'relations'")
    .get();

  const insertNewRel = hasRelationsTable
    ? db.prepare(
        "INSERT INTO relations (id, subject_entity_id, object_entity_id, predicate, direction, weight, first_seen_at, last_seen_at, status) VALUES (?, ?, ?, 'mentioned_with', 'undirected', ?, datetime('now'), datetime('now'), 'active') ON CONFLICT(id) DO UPDATE SET weight = weight + excluded.weight, last_seen_at = excluded.last_seen_at",
      )
    : null;

  let pairsCount = 0;

  const tx = db.transaction((pairs: [number, number][]) => {
    for (const [a, b] of pairs) {
      insertRel.run(a, b, 1, 1);
    }
  });

  let buffer: [number, number][] = [];

  for (const row of rows) {
    // Unique integers, sorted
    const ids = [...new Set(row.ids.split(',').map(Number))].sort((a, b) => a - b);

    // Skip massive lists (e.g. index pages)
    if (ids.length > 50) continue;

    // Generate combinations
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        buffer.push([ids[i], ids[j]]);
      }
    }

    if (buffer.length >= BATCH_SIZE_REL) {
      tx(buffer);
      pairsCount += buffer.length;
      buffer = [];
      process.stdout.write(`   Linked ${pairsCount} pairs...\r`);
    }
  }

  if (buffer.length > 0) {
    tx(buffer);
    pairsCount += buffer.length;
  }

  // Also populate the new relations table with a coarse "mentioned_with" edge
  // when available. We use a deterministic id based on sorted entity ids and
  // predicate so repeated passes simply increment weight.
  if (insertNewRel) {
    const relTx = db.transaction((pairs: [number, number][]) => {
      for (const [a, b] of pairs) {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const relId = `${lo}-${hi}-mentioned_with`;
        insertNewRel.run(relId, lo, hi, 1);
      }
    });
    relTx(buffer as [number, number][]);
  }

  console.log(`   ✅ Created/Updated ${pairsCount} relationship links.`);
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
    Map<
      number,
      { mention_id: string; span_id: string | null; quote: string; score: number }
    >
  >();

  for (const row of rows) {
    const docId = row.document_id as number;
    const entityId = row.entity_id as number;
    const key = `${docId}`;
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

          insertRelationEvidence.run(
            evId,
            relId,
            docId,
            spanId,
            quote,
            conf,
            mentionIds,
          );
          inserted++;
        }
      }
    }
  });

  tx();

  console.log(`   ✅ Populated ${inserted} relation_evidence rows.`);
}

rebuildEntityPipeline();
