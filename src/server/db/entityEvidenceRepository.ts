import { getDb } from './connection.js';

export const entityEvidenceRepository = {
  async getEntityMentionEvidence(entityId: string) {
    const db = getDb();

    // Basic entity lookup
    const entity = db
      .prepare(
        `
        SELECT id, full_name, primary_role, entity_category, risk_level
        FROM entities
        WHERE id = ?
      `,
      )
      .get(entityId);

    if (!entity) {
      return null;
    }

    // Detect optional tables/columns so we can operate against older DBs.
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const tableNames = new Set(tables.map((t) => t.name));

    const hasMentions = tableNames.has('mentions');
    const hasQualityFlags = tableNames.has('quality_flags');
    const hasRelations = tableNames.has('relations');
    const hasEntityMentionsScore = (db
      .prepare("PRAGMA table_info(entity_mentions)")
      .all() as { name: string }[]).some((c) => c.name === 'score');

    // Core mention-derived evidence items
    let evidenceRows: any[] = [];
    if (hasMentions) {
      const sql = `
        SELECT
          em.rowid as id,
          em.document_id,
          em.mention_context,
          ${hasEntityMentionsScore ? 'em.score' : 'NULL'} as score,
          em.mention_id,
          d.title,
          d.file_path,
          d.evidence_type,
          d.red_flag_rating,
          d.date_created,
          q.flag_type,
          q.severity
        FROM entity_mentions em
        JOIN documents d ON d.id = em.document_id
        LEFT JOIN quality_flags q
          ON ${hasQualityFlags ? "q.target_type = 'mention' AND q.target_id = em.mention_id" : '1=0'}
        WHERE em.entity_id = ?
        ORDER BY d.date_created DESC, em.rowid DESC
        LIMIT 200
      `;
      evidenceRows = db.prepare(sql).all(entityId) as any[];
    } else {
      const sql = `
        SELECT
          em.rowid as id,
          em.document_id,
          em.mention_context,
          NULL as score,
          NULL as mention_id,
          d.title,
          d.file_path,
          d.evidence_type,
          d.red_flag_rating,
          d.date_created,
          NULL as flag_type,
          NULL as severity
        FROM entity_mentions em
        JOIN documents d ON d.id = em.document_id
        WHERE em.entity_id = ?
        ORDER BY d.date_created DESC, em.rowid DESC
        LIMIT 200
      `;
      evidenceRows = db.prepare(sql).all(entityId) as any[];
    }

    // Normalize evidence shape to match EntityEvidencePanel expectations
    const evidence = evidenceRows.map((row) => ({
      id: row.id,
      evidence_type: row.evidence_type || 'document_context',
      title: row.title || `Document ${row.document_id}`,
      description: '',
      source_path: row.file_path || '',
      cleaned_path: null,
      red_flag_rating: row.red_flag_rating ?? 0,
      created_at: row.date_created || null,
      role: 'mentioned',
      confidence: typeof row.score === 'number' ? row.score : 0.0,
      context_snippet: row.mention_context || '',
      flags: row.flag_type
        ? [
            {
              type: row.flag_type,
              severity: row.severity,
            },
          ]
        : [],
    }));

    // Stats
    const totalEvidence = evidence.length;

    // Type breakdown by evidence_type
    const typeMap = new Map<string, number>();
    for (const e of evidence) {
      const key = e.evidence_type || 'unknown';
      typeMap.set(key, (typeMap.get(key) || 0) + 1);
    }
    const typeBreakdown = Array.from(typeMap.entries()).map(([evidence_type, count]) => ({
      evidence_type,
      count,
    }));

    // Role breakdown (currently all 'mentioned', but keep shape for UI)
    const roleMap = new Map<string, number>();
    for (const e of evidence) {
      const key = e.role || 'mentioned';
      roleMap.set(key, (roleMap.get(key) || 0) + 1);
    }
    const roleBreakdown = Array.from(roleMap.entries()).map(([role, count]) => ({
      role,
      count,
    }));

    // Related entities via relations graph when available
    let relatedEntities: any[] = [];
    if (hasRelations) {
      const relSql = `
        SELECT
          other.id,
          other.full_name,
          other.entity_category,
          SUM(r.weight) as shared_evidence_count
        FROM relations r
        JOIN entities other ON
          other.id = CASE
            WHEN r.subject_entity_id = :entityId THEN r.object_entity_id
            ELSE r.subject_entity_id
          END
        WHERE r.subject_entity_id = :entityId OR r.object_entity_id = :entityId
        GROUP BY other.id, other.full_name, other.entity_category
        ORDER BY shared_evidence_count DESC
        LIMIT 20
      `;
      relatedEntities = db
        .prepare(relSql)
        .all({ entityId: Number(entityId) }) as any[];
    }

    const highRiskCount = evidence.filter((e: any) => (e.red_flag_rating || 0) >= 4).length;
    const averageConfidence =
      evidence.reduce((sum: number, e: any) => sum + (e.confidence || 0), 0) /
        (evidence.length || 1);

    return {
      entity,
      evidence,
      stats: {
        totalEvidence,
        typeBreakdown,
        roleBreakdown,
        relatedEntities,
        highRiskCount,
        averageConfidence,
      },
    };
  },

  async getRelationEvidenceForEntity(entityId: string) {
    const db = getDb();

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const names = new Set(tables.map((t) => t.name));
    if (!names.has('relations') || !names.has('relation_evidence')) {
      return { relations: [], evidence: [] };
    }

    const rows = db
      .prepare(
        `
        SELECT
          r.id as relation_id,
          r.subject_entity_id,
          r.object_entity_id,
          r.predicate,
          r.direction,
          r.weight,
          r.first_seen_at,
          r.last_seen_at,
          re.id as relation_evidence_id,
          re.document_id,
          re.span_id,
          re.quote_text,
          re.confidence,
          re.mention_ids,
          d.title as document_title,
          d.file_path as document_path
        FROM relations r
        JOIN relation_evidence re ON re.relation_id = r.id
        LEFT JOIN documents d ON d.id = re.document_id
        WHERE r.subject_entity_id = ? OR r.object_entity_id = ?
        ORDER BY r.weight DESC, re.confidence DESC
      `,
      )
      .all(entityId, entityId) as any[];

    const byRelation = new Map<string, any>();

    for (const row of rows) {
      let rel = byRelation.get(row.relation_id);
      if (!rel) {
        rel = {
          id: row.relation_id,
          subject_entity_id: row.subject_entity_id,
          object_entity_id: row.object_entity_id,
          predicate: row.predicate,
          direction: row.direction,
          weight: row.weight,
          first_seen_at: row.first_seen_at,
          last_seen_at: row.last_seen_at,
          evidence: [] as any[],
        };
        byRelation.set(row.relation_id, rel);
      }
      rel.evidence.push({
        id: row.relation_evidence_id,
        document_id: row.document_id,
        span_id: row.span_id,
        quote_text: row.quote_text,
        confidence: row.confidence,
        mention_ids: row.mention_ids,
        document_title: row.document_title,
        document_path: row.document_path,
      });
    }

    return {
      relations: Array.from(byRelation.values()),
      evidence: rows,
    };
  },
};
