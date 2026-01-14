/**
 * Entity Linking Service
 * CTO Priority: MEDIUM #8 - Auto-entity linking with confidence scores
 */

// Use 'any' for the database instance type to avoid TypeScript namespace issues
// with better-sqlite3 in this environment

export interface EntityLinkCandidate {
  documentId: number;
  mentionText: string;
  mentionContext: string;
  startOffset: number;
  endOffset: number;
  candidateEntityId: number;
  confidenceScore: number;
  matchMethod: 'exact' | 'fuzzy' | 'alias' | 'ai' | 'pattern';
}

export interface EntityLinkConfig {
  minConfidenceAutoAccept: number;
  minConfidenceSuggest: number;
  fuzzyMatchThreshold: number;
  enableAutoLinking: boolean;
  enableAiDetection: boolean;
  maxCandidatesPerDocument: number;
}

export interface Entity {
  id: number;
  full_name: string;
  aliases?: string;
  primary_role?: string;
  entity_type?: string;
}

export class EntityLinkingService {
  private db: any;
  private config: EntityLinkConfig;

  constructor(db: any) {
    this.db = db;
    this.config = this.loadConfig();
  }

  private loadConfig(): EntityLinkConfig {
    const configRows = this.db
      .prepare('SELECT config_key, config_value FROM entity_link_config')
      .all() as Array<{ config_key: string; config_value: string }>;
    const config: Record<string, any> = {};
    for (const row of configRows) {
      config[row.config_key] = row.config_value;
    }
    return {
      minConfidenceAutoAccept: parseFloat(config.min_confidence_auto_accept || '0.95'),
      minConfidenceSuggest: parseFloat(config.min_confidence_suggest || '0.70'),
      fuzzyMatchThreshold: parseFloat(config.fuzzy_match_threshold || '0.85'),
      enableAutoLinking: config.enable_auto_linking === 'true',
      enableAiDetection: config.enable_ai_detection === 'true',
      maxCandidatesPerDocument: parseInt(config.max_candidates_per_document || '100', 10),
    };
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }
    return matrix[len1][len2];
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 1.0;
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1.0;
    const distance = this.levenshteinDistance(s1, s2);
    return 1 - distance / maxLen;
  }

  private getAllEntities(): Entity[] {
    return this.db
      .prepare(
        `SELECT id, full_name, aliases, primary_role, entity_type FROM entities WHERE full_name IS NOT NULL AND full_name != ''`,
      )
      .all() as Entity[];
  }

  findEntityCandidates(
    mentionText: string,
  ): Array<{ entity: Entity; confidence: number; method: string }> {
    const entities = this.getAllEntities();
    const candidates: Array<{ entity: Entity; confidence: number; method: string }> = [];
    const normalizedMention = mentionText.toLowerCase().trim();

    for (const entity of entities) {
      const normalizedName = entity.full_name.toLowerCase().trim();
      if (normalizedMention === normalizedName) {
        candidates.push({ entity, confidence: 1.0, method: 'exact' });
        continue;
      }
      if (entity.aliases) {
        try {
          const aliases = JSON.parse(entity.aliases) as string[];
          for (const alias of aliases) {
            if (normalizedMention === alias.toLowerCase().trim()) {
              candidates.push({ entity, confidence: 0.98, method: 'alias' });
              break;
            }
          }
        } catch {
          // Ignore JSON parse errors for invalid alias formats
        }
      }
      const similarity = this.calculateSimilarity(normalizedMention, normalizedName);
      if (similarity >= this.config.fuzzyMatchThreshold) {
        candidates.push({ entity, confidence: similarity * 0.95, method: 'fuzzy' });
      }
    }
    candidates.sort((a, b) => b.confidence - a.confidence);
    return candidates.filter((c) => c.confidence >= this.config.minConfidenceSuggest);
  }

  extractPotentialMentions(text: string): Array<{ text: string; offset: number }> {
    const mentions: Array<{ text: string; offset: number }> = [];
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
    let match;
    while ((match = namePattern.exec(text)) !== null) {
      mentions.push({ text: match[1], offset: match.index });
    }
    return mentions;
  }

  async generateCandidatesForDocument(
    documentId: number,
    documentText: string,
    options: { autoAccept?: boolean } = {},
  ): Promise<number> {
    if (!this.config.enableAutoLinking) return 0;
    const mentions = this.extractPotentialMentions(documentText);
    let candidatesCreated = 0;
    const insertStmt = this.db.prepare(
      `INSERT INTO entity_link_candidates (document_id, mention_text, mention_context, start_offset, end_offset, candidate_entity_id, confidence_score, match_method, accepted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const mention of mentions) {
      if (candidatesCreated >= this.config.maxCandidatesPerDocument) break;
      const candidates = this.findEntityCandidates(mention.text);
      for (const candidate of candidates) {
        const context = this.extractContext(documentText, mention.offset, mention.text.length);
        const shouldAutoAccept =
          options.autoAccept && candidate.confidence >= this.config.minConfidenceAutoAccept;
        insertStmt.run(
          documentId,
          mention.text,
          context,
          mention.offset,
          mention.offset + mention.text.length,
          candidate.entity.id,
          candidate.confidence,
          candidate.method,
          shouldAutoAccept ? 1 : 0,
        );
        candidatesCreated++;
        if (shouldAutoAccept) {
          this.createEntityMention(documentId, candidate.entity.id, {
            confidence: candidate.confidence,
            method: candidate.method,
            context,
          });
        }
        break;
      }
    }
    return candidatesCreated;
  }

  private extractContext(text: string, offset: number, length: number, contextSize = 100): string {
    const start = Math.max(0, offset - contextSize);
    const end = Math.min(text.length, offset + length + contextSize);
    return text.substring(start, end);
  }

  createEntityMention(
    documentId: number,
    entityId: number,
    options: {
      confidence?: number;
      method?: string;
      context?: string;
      verified?: boolean;
      verifiedBy?: number;
    } = {},
  ): void {
    const existing = this.db
      .prepare(
        `SELECT id, mention_count, contexts_json FROM entity_mentions WHERE entity_id = ? AND document_id = ?`,
      )
      .get(entityId, documentId) as
      | { id: number; mention_count: number; contexts_json: string | null }
      | undefined;
    if (existing) {
      let contexts: string[] = [];
      if (existing.contexts_json) {
        try {
          contexts = JSON.parse(existing.contexts_json);
        } catch {
          // Ignore JSON parse errors for invalid alias formats
        }
      }
      if (options.context && !contexts.includes(options.context)) {
        contexts.push(options.context);
      }
      this.db
        .prepare(
          `UPDATE entity_mentions SET mention_count = mention_count + 1, contexts_json = ?, last_seen_at = CURRENT_TIMESTAMP, confidence_score = ?, link_method = ?, verified = ?, verified_by = ?, verified_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE verified_at END WHERE id = ?`,
        )
        .run(
          JSON.stringify(contexts),
          options.confidence ?? 1.0,
          options.method ?? 'manual',
          options.verified ? 1 : 0,
          options.verifiedBy ?? null,
          options.verified ? 1 : 0,
          existing.id,
        );
    } else {
      const contexts = options.context ? [options.context] : [];
      this.db
        .prepare(
          `INSERT INTO entity_mentions (entity_id, document_id, mention_count, first_seen_at, last_seen_at, contexts_json, confidence_score, link_method, verified, verified_by, verified_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END)`,
        )
        .run(
          entityId,
          documentId,
          JSON.stringify(contexts),
          options.confidence ?? 1.0,
          options.method ?? 'manual',
          options.verified ? 1 : 0,
          options.verifiedBy ?? null,
          options.verified ? 1 : 0,
        );
    }
    this.db
      .prepare(
        `UPDATE entities SET mentions = (SELECT COUNT(*) FROM entity_mentions WHERE entity_id = ?) WHERE id = ?`,
      )
      .run(entityId, entityId);
  }

  getPendingCandidates(limit = 50): EntityLinkCandidate[] {
    return this.db
      .prepare(
        `SELECT document_id as documentId, mention_text as mentionText, mention_context as mentionContext, start_offset as startOffset, end_offset as endOffset, candidate_entity_id as candidateEntityId, confidence_score as confidenceScore, match_method as matchMethod FROM entity_link_candidates WHERE processed = 0 AND accepted = 0 AND rejected = 0 ORDER BY confidence_score DESC, created_at ASC LIMIT ?`,
      )
      .all(limit) as EntityLinkCandidate[];
  }

  acceptCandidate(candidateId: number, userId?: number): void {
    const candidate = this.db
      .prepare(
        `SELECT document_id, candidate_entity_id, mention_context, confidence_score, match_method FROM entity_link_candidates WHERE id = ?`,
      )
      .get(candidateId) as
      | {
          document_id: number;
          candidate_entity_id: number;
          mention_context: string;
          confidence_score: number;
          match_method: string;
        }
      | undefined;
    if (!candidate) throw new Error(`Candidate ${candidateId} not found`);
    this.db
      .prepare(
        `UPDATE entity_link_candidates SET processed = 1, accepted = 1, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(userId ?? null, candidateId);
    this.createEntityMention(candidate.document_id, candidate.candidate_entity_id, {
      confidence: candidate.confidence_score,
      method: candidate.match_method,
      context: candidate.mention_context,
      verified: true,
      verifiedBy: userId,
    });
  }

  rejectCandidate(candidateId: number, userId?: number, reason?: string): void {
    this.db
      .prepare(
        `UPDATE entity_link_candidates SET processed = 1, rejected = 1, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, notes = ? WHERE id = ?`,
      )
      .run(userId ?? null, reason ?? null, candidateId);
  }
}
