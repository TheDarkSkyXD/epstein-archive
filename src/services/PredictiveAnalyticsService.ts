import { getDb } from '../server/db/connection.js';
import { entitiesRepository } from '../server/db/entitiesRepository.js';
import { relationshipsRepository } from '../server/db/relationshipsRepository.js';
import { documentsRepository } from '../server/db/documentsRepository.js';

export interface PatternPrediction {
  id: string;
  type: 'connection' | 'event' | 'risk';
  prediction: string;
  confidence: number;
  supportingEvidence: string[];
  likelihood: 'high' | 'medium' | 'low';
  timeframe?: string;
}

export interface RiskAssessmentPrediction {
  entity: string;
  currentRisk: number;
  predictedRisk: number;
  riskTrend: 'increasing' | 'decreasing' | 'stable';
  contributingFactors: string[];
  confidence: number;
}

export interface ConnectionInference {
  sourceEntity: string;
  targetEntity: string;
  inferredRelationship: string;
  confidence: number;
  supportingEvidence: string[];
  reason: string;
}

export class PredictiveAnalyticsService {
  async getPatternPredictions(): Promise<PatternPrediction[]> {
    const db = getDb();

    const predictions: PatternPrediction[] = [];

    // 1. Predict potential new connections based on existing patterns
    const potentialConnections = await this.getInferredConnections();

    for (const connection of potentialConnections) {
      predictions.push({
        id: `conn-${connection.sourceEntity}-${connection.targetEntity}`,
        type: 'connection',
        prediction: `Connection between ${connection.sourceEntity} and ${connection.targetEntity}`,
        confidence: connection.confidence,
        supportingEvidence: connection.supportingEvidence,
        likelihood:
          connection.confidence > 0.8 ? 'high' : connection.confidence > 0.5 ? 'medium' : 'low',
      });
    }

    // 2. Predict potential high-risk entities based on network patterns
    const highRiskPredictions = db
      .prepare(
        `
      SELECT 
        e.id,
        e.full_name,
        e.red_flag_rating,
        COUNT(er.id) as relationshipCount,
        AVG(er.strength) as avgStrength
      FROM entities e
      LEFT JOIN entity_relationships er ON e.id = er.source_id
      WHERE e.red_flag_rating < 3  -- Low to medium risk entities
        AND (
          SELECT COUNT(*) 
          FROM entity_relationships er2 
          JOIN entities e2 ON er2.target_id = e2.id 
          WHERE er2.source_id = e.id 
            AND e2.red_flag_rating >= 4  -- Connected to high-risk entities
        ) >= 2
      ORDER BY relationshipCount DESC
      LIMIT 10
    `,
      )
      .all() as any[];

    for (const entity of highRiskPredictions) {
      predictions.push({
        id: `risk-${entity.id}`,
        type: 'risk',
        prediction: `${entity.full_name} may become high-risk due to connections with known high-risk entities`,
        confidence: Math.min(1.0, entity.relationshipCount * 0.15),
        supportingEvidence: [`Connected to ${entity.relationshipCount} high-risk entities`],
        likelihood: entity.red_flag_rating < 2 ? 'high' : 'medium',
      });
    }

    return predictions;
  }

  async getRiskAssessmentPredictions(): Promise<RiskAssessmentPrediction[]> {
    const db = getDb();

    // Find entities that might be at risk of having their risk rating increase
    const query = `
      SELECT 
        e.id,
        e.full_name,
        e.red_flag_rating as currentRisk,
        COUNT(er.id) as relationshipCount,
        AVG(er.strength) as avgStrength,
        (SELECT COUNT(*) FROM entity_mentions em WHERE em.entity_id = e.id) as mentionCount
      FROM entities e
      LEFT JOIN entity_relationships er ON e.id = er.source_id
      WHERE e.red_flag_rating < 4  -- Not already high risk
        AND (
          SELECT COUNT(*) 
          FROM entity_relationships er2 
          JOIN entities e2 ON er2.target_id = e2.id 
          WHERE er2.source_id = e.id 
            AND e2.red_flag_rating >= 4
        ) >= 1  -- Connected to at least one high-risk entity
      GROUP BY e.id
      HAVING relationshipCount >= 3 AND mentionCount >= 5
      ORDER BY relationshipCount DESC, avgStrength DESC
      LIMIT 20
    `;

    const results = db.prepare(query).all() as any[];

    return results.map((row) => {
      const predictedRisk = Math.min(5, row.currentRisk + row.relationshipCount * 0.2);
      const riskTrend = predictedRisk > row.currentRisk ? 'increasing' : 'stable';

      return {
        entity: row.full_name,
        currentRisk: row.currentRisk,
        predictedRisk: Math.round(predictedRisk * 10) / 10,
        riskTrend,
        contributingFactors: [
          `Connected to ${row.relationshipCount} entities`,
          `Mentioned in ${row.mentionCount} documents`,
          'Connected to high-risk entities',
        ],
        confidence: Math.min(1.0, row.relationshipCount * 0.1),
      };
    });
  }

  async getConnectionInferences(entityId?: number): Promise<ConnectionInference[]> {
    const db = getDb();

    const query = `
      WITH entity_connections AS (
        -- Get all entities connected to our main entity
        SELECT target_id as connected_entity
        FROM entity_relationships
        WHERE source_id = ?
        UNION
        SELECT source_id as connected_entity
        FROM entity_relationships
        WHERE target_id = ?
      ),
      potential_connections AS (
        -- Find entities that share connections with the main entity's connections
        SELECT 
          er1.target_id as potential_target,
          COUNT(*) as shared_connections,
          AVG(er1.strength) as avg_strength
        FROM entity_relationships er1
        JOIN entity_connections ec ON er1.source_id = ec.connected_entity
        WHERE er1.target_id != ?
          AND er1.target_id NOT IN (SELECT connected_entity FROM entity_connections)
          AND NOT EXISTS (
            SELECT 1 FROM entity_relationships er2 
            WHERE (er2.source_id = ? AND er2.target_id = er1.target_id)
               OR (er2.source_id = er1.target_id AND er2.target_id = ?)
          )
        GROUP BY er1.target_id
        HAVING COUNT(*) >= 2
      )
      SELECT 
        e.id,
        e.full_name,
        pc.shared_connections,
        pc.avg_strength
      FROM potential_connections pc
      JOIN entities e ON pc.potential_target = e.id
      ORDER BY pc.shared_connections DESC, pc.avg_strength DESC
      LIMIT 10
    `;

    const params = entityId ? [entityId, entityId, entityId, entityId, entityId] : [1, 1, 1, 1, 1];
    const results = db.prepare(query).all(...params) as any[];

    return results.map((row) => ({
      sourceEntity: entityId
        ? entitiesRepository.getEntityById(entityId)?.fullName || 'Unknown'
        : 'Multiple',
      targetEntity: row.full_name,
      inferredRelationship: 'potential connection',
      confidence: Math.min(1.0, row.shared_connections * 0.2),
      supportingEvidence: [
        `Shares ${row.shared_connections} connections`,
        `Average strength: ${row.avg_strength}`,
      ],
      reason: `Shares multiple connections with entities connected to target`,
    }));
  }

  async getRiskAssessmentDashboard(): Promise<any> {
    const db = getDb();

    // Calculate overall risk metrics
    const totalEntities = db.prepare('SELECT COUNT(*) as count FROM entities').get() as {
      count: number;
    };
    const highRiskEntities = db
      .prepare('SELECT COUNT(*) as count FROM entities WHERE red_flag_rating >= 4')
      .get() as { count: number };
    const mediumRiskEntities = db
      .prepare(
        'SELECT COUNT(*) as count FROM entities WHERE red_flag_rating >= 2 AND red_flag_rating < 4',
      )
      .get() as { count: number };
    const lowRiskEntities = db
      .prepare('SELECT COUNT(*) as count FROM entities WHERE red_flag_rating < 2')
      .get() as { count: number };

    // Risk trend analysis
    const riskTrend = db
      .prepare(
        `
      SELECT 
        date_created,
        COUNT(*) as newEntities,
        AVG(red_flag_rating) as avgRisk
      FROM entities
      WHERE date_created IS NOT NULL
      GROUP BY date_created
      ORDER BY date_created DESC
      LIMIT 30
    `,
      )
      .all() as any[];

    // High-risk entity connections
    const highRiskConnections = db
      .prepare(
        `
      SELECT 
        e1.full_name as entity1,
        e2.full_name as entity2,
        er.strength,
        er.relationship_type
      FROM entity_relationships er
      JOIN entities e1 ON er.source_id = e1.id
      JOIN entities e2 ON er.target_id = e2.id
      WHERE e1.red_flag_rating >= 4 OR e2.red_flag_rating >= 4
      ORDER BY er.strength DESC
      LIMIT 20
    `,
      )
      .all() as any[];

    // Predicted high-risk entities
    const predictedHighRisk = await this.getRiskAssessmentPredictions();

    return {
      overallMetrics: {
        totalEntities: totalEntities.count,
        highRiskCount: highRiskEntities.count,
        mediumRiskCount: mediumRiskEntities.count,
        lowRiskCount: lowRiskEntities.count,
        highRiskPercentage:
          totalEntities.count > 0 ? (highRiskEntities.count / totalEntities.count) * 100 : 0,
      },
      riskTrend,
      highRiskConnections,
      predictedHighRiskEntities: predictedHighRisk
        .filter((p) => p.riskTrend === 'increasing')
        .slice(0, 10),
      riskDistribution: {
        high: highRiskEntities.count,
        medium: mediumRiskEntities.count,
        low: lowRiskEntities.count,
      },
    };
  }

  async getPredictiveInsights(searchTerm?: string): Promise<any> {
    const db = getDb();

    // Find entities that appear in similar contexts to known high-risk entities
    const contextSimilarityQuery = `
      SELECT 
        e.id,
        e.full_name,
        e.red_flag_rating,
        COUNT(DISTINCT dm.document_id) as similarContextCount
      FROM entities e
      JOIN entity_mentions em ON e.id = em.entity_id
      JOIN entity_mentions dm ON em.document_id = dm.document_id
      JOIN entities de ON dm.entity_id = de.id
      WHERE de.red_flag_rating >= 4  -- Connected to high-risk entities
        AND e.red_flag_rating < 3  -- But not high-risk themselves
        AND e.id != de.id
    `;

    let queryWithParams = contextSimilarityQuery;
    const params: any = {};

    if (searchTerm) {
      queryWithParams += ` AND (e.full_name LIKE @searchTerm OR de.full_name LIKE @searchTerm)`;
      params.searchTerm = `%${searchTerm}%`;
    }

    queryWithParams += ` GROUP BY e.id HAVING similarContextCount >= 2 ORDER BY similarContextCount DESC LIMIT 10`;

    const similarContextEntities = db.prepare(queryWithParams).all(params) as any[];

    // Pattern-based predictions
    const patternPredictions = await this.getPatternPredictions();

    // Connection inferences
    const connectionInferences = await this.getConnectionInferences();

    return {
      contextSimilarity: similarContextEntities.map((entity) => ({
        entity: entity.full_name,
        currentRisk: entity.red_flag_rating,
        similarityScore: entity.similarContextCount,
        reason: 'Appears in similar contexts as high-risk entities',
      })),
      patternPredictions,
      connectionInferences,
      summary: {
        potentialRisks: similarContextEntities.length,
        predictedConnections: patternPredictions.length,
        inferredConnections: connectionInferences.length,
      },
    };
  }

  async getPatternPredictionsForEntity(entityId: number): Promise<PatternPrediction[]> {
    const db = getDb();

    const predictions: PatternPrediction[] = [];

    // Find documents where this entity appears with other high-risk entities
    const query = `
      SELECT 
        d.id,
        d.file_name,
        d.date_created,
        e2.full_name as otherEntity,
        e2.red_flag_rating as otherRiskRating
      FROM entity_mentions em1
      JOIN entity_mentions em2 ON em1.document_id = em2.document_id
      JOIN documents d ON em1.document_id = d.id
      JOIN entities e2 ON em2.entity_id = e2.id
      WHERE em1.entity_id = ?
        AND em2.entity_id != ?
        AND e2.red_flag_rating >= 4
      ORDER BY d.date_created DESC
      LIMIT 10
    `;

    const results = db.prepare(query).all(entityId, entityId) as any[];

    for (const result of results) {
      predictions.push({
        id: `doc-${result.id}-${entityId}`,
        type: 'event',
        prediction: `Document "${result.file_name}" connects ${result.otherEntity} (high-risk) with target entity`,
        confidence: Math.min(1.0, result.otherRiskRating * 0.2),
        supportingEvidence: [
          `Document: ${result.file_name}`,
          `Connected to high-risk entity: ${result.otherEntity}`,
        ],
        likelihood: result.otherRiskRating >= 4 ? 'high' : 'medium',
        timeframe: result.date_created,
      });
    }

    // Get inferred connections for this specific entity
    const inferredConnections = await this.getConnectionInferences(entityId);

    for (const conn of inferredConnections) {
      predictions.push({
        id: `inference-${entityId}-${conn.targetEntity}`,
        type: 'connection',
        prediction: `Connection likely exists between ${conn.sourceEntity} and ${conn.targetEntity}`,
        confidence: conn.confidence,
        supportingEvidence: conn.supportingEvidence,
        likelihood: conn.confidence > 0.7 ? 'high' : conn.confidence > 0.4 ? 'medium' : 'low',
      });
    }

    return predictions;
  }

  private async getInferredConnections(): Promise<ConnectionInference[]> {
    // This method is used internally to get general connection inferences
    const db = getDb();

    // Find entities that are highly connected to the same other entities
    const query = `
      SELECT 
        e1.full_name as sourceEntity,
        e2.full_name as targetEntity,
        COUNT(common_conn.entity_id) as commonConnectionCount,
        AVG(er1.strength) as avgStrength1,
        AVG(er2.strength) as avgStrength2
      FROM entities e1
      JOIN entity_relationships er1 ON e1.id = er1.source_id
      JOIN entity_relationships er2 ON e2.id = er2.source_id
      JOIN (
        SELECT er1.target_id as entity_id
        FROM entity_relationships er1
        JOIN entity_relationships er2 ON er1.target_id = er2.target_id
        WHERE er1.source_id != er2.source_id
        GROUP BY er1.target_id
        HAVING COUNT(*) >= 2
      ) as common_conn ON er1.target_id = common_conn.entity_id
      WHERE e1.id != e2.id
        AND er1.target_id = er2.target_id
      GROUP BY e1.id, e2.id
      HAVING commonConnectionCount >= 2
      ORDER BY commonConnectionCount DESC, avgStrength1 DESC, avgStrength2 DESC
      LIMIT 10
    `;

    const results = db.prepare(query).all() as any[];

    return results.map((row) => ({
      sourceEntity: row.sourceEntity,
      targetEntity: row.targetEntity,
      inferredRelationship: 'similar connection patterns',
      confidence: Math.min(1.0, row.commonConnectionCount * 0.2),
      supportingEvidence: [
        `Share ${row.commonConnectionCount} common connections`,
        `Average connection strength: ${((row.avgStrength1 || 0) + (row.avgStrength2 || 0)) / 2}`,
      ],
      reason: `Connected to many of the same entities`,
    }));
  }
}
