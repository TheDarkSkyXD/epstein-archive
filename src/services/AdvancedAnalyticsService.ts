import { getDb } from '../server/db/connection.js';
import { entitiesRepository } from '../server/db/entitiesRepository.js';
import { relationshipsRepository } from '../server/db/relationshipsRepository.js';
import { documentsRepository } from '../server/db/documentsRepository.js';
import { memoryRepository } from '../server/db/memoryRepository.js';

export interface PatternRecognitionResult {
  patternType: string;
  entities: string[];
  documents: string[];
  confidence: number;
  description: string;
}

export interface TimelineEvent {
  id: number;
  title: string;
  description: string;
  date: string;
  entities: string[];
  documents: string[];
  confidence: number;
}

export interface AnomalyDetectionResult {
  id: string;
  type: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
}

export interface RiskAssessment {
  entity: string;
  riskScore: number;
  riskFactors: string[];
  confidence: number;
  recommendations: string[];
}

export interface EntityRelationshipMap {
  sourceEntity: string;
  targetEntity: string;
  relationshipType: string;
  strength: number;
  confidence: number;
  evidence: string[];
}

export class AdvancedAnalyticsService {
  async detectPatterns(searchTerm?: string): Promise<PatternRecognitionResult[]> {
    const db = getDb();

    // Complex pattern detection: find recurring patterns in documents and relationships
    let query = `
      SELECT 
        e1.full_name as entity1,
        e2.full_name as entity2,
        d.evidence_type,
        COUNT(*) as frequency,
        AVG(er.strength) as avgStrength
      FROM entity_mentions em1
      JOIN entity_mentions em2 ON em1.document_id = em2.document_id AND em1.entity_id != em2.entity_id
      JOIN entities e1 ON em1.entity_id = e1.id
      JOIN entities e2 ON em2.entity_id = e2.id
      JOIN documents d ON em1.document_id = d.id
      LEFT JOIN entity_relationships er ON (er.source_entity_id = e1.id AND er.target_entity_id = e2.id)
      WHERE e1.full_name != e2.full_name
    `;

    const params: any = {};
    if (searchTerm) {
      query += ` AND (e1.full_name LIKE @searchTerm OR e2.full_name LIKE @searchTerm OR d.content LIKE @searchTerm)`;
      params.searchTerm = `%${searchTerm}%`;
    }

    query += ` GROUP BY e1.id, e2.id, d.evidence_type HAVING COUNT(*) > 1 ORDER BY frequency DESC LIMIT 50`;

    const results = db.prepare(query).all(params) as any[];

    return results.map((row, index) => ({
      patternType: `Co-occurrence Pattern`,
      entities: [row.entity1, row.entity2],
      documents: [row.evidence_type],
      confidence: Math.min(1.0, row.avgStrength || 0.5),
      description: `Entities "${row.entity1}" and "${row.entity2}" co-occur ${row.frequency} times in ${row.evidence_type} documents`,
    }));
  }

  async reconstructTimeline(entityId?: number, searchTerm?: string): Promise<TimelineEvent[]> {
    const db = getDb();

    const query = `
      SELECT 
        d.id as docId,
        d.file_name as title,
        d.date_created as date,
        d.content,
        e.full_name as entityName
      FROM documents d
      LEFT JOIN entity_mentions em ON d.id = em.document_id
      LEFT JOIN entities e ON em.entity_id = e.id
    `;

    let queryWithParams = query;
    const params: any = {};

    if (entityId) {
      queryWithParams += ` WHERE em.entity_id = @entityId`;
      params.entityId = entityId;

      if (searchTerm) {
        queryWithParams += ` AND (d.file_name LIKE @searchTerm OR d.content LIKE @searchTerm)`;
        params.searchTerm = `%${searchTerm}%`;
      }
    } else if (searchTerm) {
      queryWithParams += ` WHERE (d.file_name LIKE @searchTerm OR d.content LIKE @searchTerm)`;
      params.searchTerm = `%${searchTerm}%`;
    }

    queryWithParams += ` ORDER BY d.date_created ASC LIMIT 100`;

    const results = db.prepare(queryWithParams).all(params) as any[];

    return results.map((row, index) => ({
      id: row.docId,
      title: row.title,
      description: row.content.substring(0, 200) + '...',
      date: row.date,
      entities: row.entityName ? [row.entityName] : [],
      documents: [row.title],
      confidence: 0.8,
    }));
  }

  async detectAnomalies(): Promise<AnomalyDetectionResult[]> {
    const db = getDb();

    // Find documents with unusual characteristics
    const anomalies: AnomalyDetectionResult[] = [];

    // 1. Documents with high red flag ratings but few mentions
    const highRiskLowMention = db
      .prepare(
        `
      SELECT 
        d.id,
        d.file_name,
        d.red_flag_rating,
        d.mentions_count
      FROM documents d
      WHERE d.red_flag_rating >= 4 
        AND (d.mentions_count IS NULL OR d.mentions_count < 5)
      ORDER BY d.red_flag_rating DESC
      LIMIT 10
    `,
      )
      .all() as any[];

    for (const doc of highRiskLowMention) {
      anomalies.push({
        id: `doc-${doc.id}`,
        type: 'High Risk, Low Mention Count',
        description: `Document "${doc.file_name}" has high red flag rating (${doc.red_flag_rating}) but low mention count (${doc.mentions_count})`,
        confidence: 0.85,
        severity: 'high',
        details: {
          redFlagRating: doc.red_flag_rating,
          mentionCount: doc.mentions_count,
          fileName: doc.file_name,
        },
      });
    }

    // 2. Entities with unusual relationship patterns
    const unusualRelationships = db
      .prepare(
        `
      SELECT 
        e.full_name,
        e.red_flag_rating,
        COUNT(er.id) as relationshipCount
      FROM entities e
      LEFT JOIN entity_relationships er ON e.id = er.source_entity_id
      WHERE e.red_flag_rating >= 4
        AND (er.id IS NULL OR relationshipCount < 3)
      ORDER BY e.red_flag_rating DESC
      LIMIT 10
    `,
      )
      .all() as any[];

    for (const entity of unusualRelationships) {
      anomalies.push({
        id: `entity-${entity.id}`,
        type: 'High Risk, Low Connectivity',
        description: `Entity "${entity.full_name}" has high red flag rating (${entity.red_flag_rating}) but low relationship count (${entity.relationshipCount})`,
        confidence: 0.75,
        severity: 'medium',
        details: {
          redFlagRating: entity.red_flag_rating,
          relationshipCount: entity.relationshipCount,
          entityName: entity.full_name,
        },
      });
    }

    return anomalies;
  }

  async assessRisk(entityId?: number): Promise<RiskAssessment[]> {
    const db = getDb();

    let query = `
      SELECT 
        e.id,
        e.full_name,
        e.red_flag_rating,
        e.primary_role,
        COUNT(er.id) as relationshipCount,
        AVG(er.strength) as avgRelationshipStrength
      FROM entities e
      LEFT JOIN entity_relationships er ON e.id = er.source_entity_id
    `;

    const params: any = {};
    const conditions: string[] = [];

    if (entityId) {
      conditions.push('e.id = @entityId');
      params.entityId = entityId;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY e.id ORDER BY e.red_flag_rating DESC, relationshipCount DESC LIMIT 50`;

    const results = db.prepare(query).all(params) as any[];

    return results.map((row) => {
      const riskScore = Math.min(
        100,
        row.red_flag_rating * 20 + row.relationshipCount * 2 + row.avgRelationshipStrength * 10,
      );
      const riskFactors: string[] = [];

      if (row.red_flag_rating >= 4) riskFactors.push('High Red Flag Rating');
      if (row.relationshipCount > 10) riskFactors.push('High Connectivity');
      if (row.primary_role && row.primary_role.toLowerCase().includes('financial'))
        riskFactors.push('Financial Role');

      return {
        entity: row.full_name,
        riskScore: Math.round(riskScore),
        riskFactors,
        confidence: 0.8,
        recommendations: [
          'Review associated documents',
          'Check for pattern violations',
          'Validate entity connections',
        ],
      };
    });
  }

  async mapEntityRelationships(
    entityId?: number,
    depth: number = 2,
  ): Promise<EntityRelationshipMap[]> {
    if (!entityId) {
      // If no entity ID provided, return top relationships
      const db = getDb();
      const results = db
        .prepare(
          `
        SELECT 
          e1.full_name as sourceEntity,
          e2.full_name as targetEntity,
          er.relationship_type,
          er.strength,
          er.confidence
        FROM entity_relationships er
        JOIN entities e1 ON er.source_entity_id = e1.id
        JOIN entities e2 ON er.target_entity_id = e2.id
        ORDER BY er.strength DESC
        LIMIT 50
      `,
        )
        .all() as any[];

      return results.map((row) => ({
        sourceEntity: row.sourceEntity,
        targetEntity: row.targetEntity,
        relationshipType: row.relationship_type,
        strength: row.strength,
        confidence: row.confidence,
        evidence: [],
      }));
    }

    // Get relationships for specific entity with specified depth
    return relationshipsRepository.getGraphSlice(entityId, depth).edges.map((edge) => ({
      sourceEntity: edge.source_id.toString(),
      targetEntity: edge.target_id.toString(),
      relationshipType: edge.relationship_type,
      strength: edge.proximity_score,
      confidence: edge.confidence,
      evidence: [],
    }));
  }

  async getPredictiveInsights(): Promise<any[]> {
    // This would use historical data to predict potential connections or risks
    // For now, we'll return some example predictive insights based on existing patterns

    const db = getDb();

    // Find entities that are highly connected to high-risk entities but have low risk scores themselves
    const potentiallyHighRisk = db
      .prepare(
        `
      SELECT 
        e.id,
        e.full_name,
        e.red_flag_rating,
        COUNT(er2.id) as connectionsToHighRisk
      FROM entities e
      JOIN entity_relationships er1 ON e.id = er1.source_entity_id
      JOIN entities e2 ON er1.target_entity_id = e2.id
      JOIN entity_relationships er2 ON e2.id = er2.source_entity_id
      WHERE e2.red_flag_rating >= 4
        AND e.red_flag_rating < 2
      GROUP BY e.id
      HAVING connectionsToHighRisk >= 3
      ORDER BY connectionsToHighRisk DESC
      LIMIT 10
    `,
      )
      .all() as any[];

    return potentiallyHighRisk.map((row) => ({
      entity: row.full_name,
      currentRiskScore: row.red_flag_rating,
      connectionsToHighRiskEntities: row.connectionsToHighRisk,
      predictedRiskTrend: 'increasing',
      confidence: 0.7,
      explanation: `Entity is highly connected to ${row.connectionsToHighRisk} high-risk entities`,
    }));
  }

  async getCrossReferenceValidation(searchTerm: string): Promise<any[]> {
    const db = getDb();

    // Find mentions of the search term across different document types and validate consistency
    const query = `
      SELECT 
        d.evidence_type,
        COUNT(*) as mentionCount,
        AVG(d.red_flag_rating) as avgRedFlag,
        GROUP_CONCAT(DISTINCT e.full_name) as associatedEntities
      FROM documents d
      LEFT JOIN entity_mentions em ON d.id = em.document_id
      LEFT JOIN entities e ON em.entity_id = e.id
      WHERE d.content LIKE ?
      GROUP BY d.evidence_type
    `;

    const results = db.prepare(query).all(`%${searchTerm}%`) as any[];

    return results.map((row) => ({
      evidenceType: row.evidence_type,
      mentionCount: row.mentionCount,
      avgRedFlagRating: row.avgRedFlag,
      associatedEntities: row.associatedEntities ? row.associatedEntities.split(',') : [],
      consistencyScore: this.calculateConsistencyScore(row.evidence_type, searchTerm),
    }));
  }

  private calculateConsistencyScore(evidenceType: string, searchTerm: string): number {
    // This would be a more complex calculation in a real implementation
    // For now, returning a placeholder score
    return Math.random();
  }

  async getInvestigativeTaskSummary(): Promise<any> {
    const db = getDb();

    // Get overall statistics for investigation planning
    const entityStats = db.prepare('SELECT COUNT(*) as total FROM entities').get() as {
      total: number;
    };
    const documentStats = db.prepare('SELECT COUNT(*) as total FROM documents').get() as {
      total: number;
    };
    const relationshipStats = db
      .prepare('SELECT COUNT(*) as total FROM entity_relationships')
      .get() as { total: number };
    const highRiskEntities = db
      .prepare('SELECT COUNT(*) as total FROM entities WHERE red_flag_rating >= 4')
      .get() as { total: number };

    return {
      totalEntities: entityStats.total,
      totalDocuments: documentStats.total,
      totalRelationships: relationshipStats.total,
      highRiskEntities: highRiskEntities.total,
      dataCompleteness: this.calculateDataCompleteness(),
      investigationReadiness: this.assessInvestigationReadiness(),
    };
  }

  private calculateDataCompleteness(): number {
    // Placeholder calculation - would be more complex in reality
    return 0.75;
  }

  private assessInvestigationReadiness(): string {
    // Placeholder assessment
    return 'moderate';
  }
}
