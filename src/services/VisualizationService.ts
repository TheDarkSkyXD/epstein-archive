import { getDb } from '../server/db/connection.js';
import { entitiesRepository } from '../server/db/entitiesRepository.js';
import { relationshipsRepository } from '../server/db/relationshipsRepository.js';
import { documentsRepository } from '../server/db/documentsRepository.js';

export interface RelationshipNode {
  id: string;
  label: string;
  type: string;
  redFlagRating?: number;
  group?: string;
  x?: number;
  y?: number;
}

export interface RelationshipEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  strength: number;
  confidence?: number;
}

export interface NetworkGraph {
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
}

export interface GeospatialData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  connections: string[];
}

export interface TimelineVisualization {
  events: {
    id: string;
    title: string;
    date: string;
    entities: string[];
    documents: string[];
    type: string;
  }[];
}

export class VisualizationService {
  async getRelationshipGraph(entityId?: number, maxNodes: number = 100): Promise<NetworkGraph> {
    const db = getDb();
    
    let nodes: RelationshipNode[] = [];
    let edges: RelationshipEdge[] = [];
    
    if (entityId) {
      // Get a specific entity's network
      const graphData = relationshipsRepository.getGraphSlice(entityId, 3);
      
      // Process nodes
      nodes = graphData.nodes.map(node => ({
        id: node.id.toString(),
        label: node.label,
        type: node.type,
        group: node.type
      }));
      
      // Process edges
      edges = graphData.edges.map(edge => ({
        id: `${edge.source_id}-${edge.target_id}`,
        source: edge.source_id.toString(),
        target: edge.target_id.toString(),
        type: edge.relationship_type,
        strength: edge.proximity_score || 0.5
      }));
    } else {
      // Get top connected entities for a broader view
      const topEntities = db.prepare(`
        SELECT 
          e.id,
          e.full_name,
          e.primary_role,
          e.red_flag_rating,
          COUNT(er.id) as connectionCount
        FROM entities e
        LEFT JOIN entity_relationships er ON e.id = er.source_id OR e.id = er.target_id
        GROUP BY e.id
        ORDER BY connectionCount DESC
        LIMIT ?
      `).all(maxNodes) as any[];
      
      // Add top entities as nodes
      nodes = topEntities.map(entity => ({
        id: entity.id.toString(),
        label: entity.full_name,
        type: entity.primary_role || 'Person',
        redFlagRating: entity.red_flag_rating,
        group: entity.primary_role || 'Person'
      }));
      
      // Get relationships between these top entities
      const entityIds = topEntities.map(e => e.id);
      if (entityIds.length > 0) {
        const placeholders = entityIds.map(() => '?').join(',');
        const relationships = db.prepare(`
          SELECT 
            er.source_id,
            er.target_id,
            er.relationship_type,
            COALESCE(er.strength, er.proximity_score, 0.5) as strength
          FROM entity_relationships er
          WHERE (er.source_id IN (${placeholders}) AND er.target_id IN (${placeholders}))
        `).all(...entityIds, ...entityIds) as any[];
        
        edges = relationships.map(rel => ({
          id: `${rel.source_id}-${rel.target_id}`,
          source: rel.source_id.toString(),
          target: rel.target_id.toString(),
          type: rel.relationship_type,
          strength: rel.strength
        }));
      }
    }
    
    return { nodes, edges };
  }

  async getGeospatialData(): Promise<GeospatialData[]> {
    const db = getDb();
    
    // This would typically extract location data from documents
    // For now, we'll return some example data based on available information
    const locations: GeospatialData[] = [];
    
    // Example: Get flight data if available (since flight data often has locations)
    try {
      const flightLocations = db.prepare(`
        SELECT DISTINCT 
          departure_airport,
          arrival_airport,
          departure_lat,
          departure_lon,
          arrival_lat,
          arrival_lon
        FROM flights
        WHERE departure_lat IS NOT NULL AND departure_lon IS NOT NULL
        LIMIT 50
      `).all() as any[];
      
      flightLocations.forEach(flight => {
        if (flight.departure_lat && flight.departure_lon) {
          locations.push({
            id: `dep-${flight.departure_airport}`,
            name: flight.departure_airport,
            latitude: flight.departure_lat,
            longitude: flight.departure_lon,
            type: 'departure',
            connections: [flight.arrival_airport]
          });
        }
        
        if (flight.arrival_lat && flight.arrival_lon) {
          locations.push({
            id: `arr-${flight.arrival_airport}`,
            name: flight.arrival_airport,
            latitude: flight.arrival_lat,
            longitude: flight.arrival_lon,
            type: 'arrival',
            connections: [flight.departure_airport]
          });
        }
      });
    } catch (e) {
      // Flight table might not exist, that's OK
      console.log('Flight data not available for geospatial visualization');
    }
    
    return locations;
  }

  async getTimelineVisualization(searchTerm?: string): Promise<TimelineVisualization> {
    const db = getDb();
    
    let query = `
      SELECT 
        d.id,
        d.file_name as title,
        d.date_created as date,
        d.evidence_type as type,
        GROUP_CONCAT(e.full_name) as entities
      FROM documents d
      LEFT JOIN entity_mentions em ON d.id = em.document_id
      LEFT JOIN entities e ON em.entity_id = e.id
    `;
    
    let queryWithParams = query;
    const params: any = {};
    
    if (searchTerm) {
      queryWithParams += ` WHERE d.file_name LIKE @searchTerm OR d.content LIKE @searchTerm`;
      params.searchTerm = `%${searchTerm}%`;
    }
    
    queryWithParams += ` GROUP BY d.id ORDER BY d.date_created ASC LIMIT 100`;
    
    const results = db.prepare(queryWithParams).all(params) as any[];
    
    const events = results.map(row => ({
      id: row.id.toString(),
      title: row.title,
      date: row.date,
      entities: row.entities ? row.entities.split(',') : [],
      documents: [row.title],
      type: row.type || 'document'
    }));
    
    return { events };
  }

  async getNetworkAnalysis(): Promise<any> {
    const db = getDb();
    
    // Calculate network metrics
    const totalEntities = db.prepare('SELECT COUNT(*) as count FROM entities').get() as { count: number };
    const totalRelationships = db.prepare('SELECT COUNT(*) as count FROM entity_relationships').get() as { count: number };
    
    // Find central figures (entities with most connections)
    const centralFigures = db.prepare(`
      SELECT 
        e.id,
        e.full_name,
        e.primary_role,
        e.red_flag_rating,
        (SELECT COUNT(*) FROM entity_relationships WHERE source_id = e.id OR target_id = e.id) as connectionCount
      FROM entities e
      ORDER BY connectionCount DESC
      LIMIT 10
    `).all() as any[];
    
    // Find relationship types distribution
    const relationshipTypes = db.prepare(`
      SELECT 
        relationship_type,
        COUNT(*) as count
      FROM entity_relationships
      WHERE relationship_type IS NOT NULL
      GROUP BY relationship_type
      ORDER BY count DESC
    `).all() as any[];
    
    // Information flow patterns
    const infoFlow = db.prepare(`
      SELECT 
        e1.full_name as source,
        e2.full_name as target,
        er.relationship_type,
        er.strength
      FROM entity_relationships er
      JOIN entities e1 ON er.source_id = e1.id
      JOIN entities e2 ON er.target_id = e2.id
      ORDER BY er.strength DESC
      LIMIT 20
    `).all() as any[];
    
    return {
      networkMetrics: {
        totalEntities: totalEntities.count,
        totalRelationships: totalRelationships.count,
        density: totalEntities.count > 0 ? totalRelationships.count / (totalEntities.count * (totalEntities.count - 1)) : 0,
        averageConnectionsPerEntity: totalEntities.count > 0 ? totalRelationships.count / totalEntities.count : 0
      },
      centralFigures,
      relationshipTypes,
      informationFlow: infoFlow
    };
  }

  async getInteractiveMapData(): Promise<any> {
    // This would provide data for an interactive relationship map
    // For now, return a structure that could be used for visualization
    
    const graph = await this.getRelationshipGraph();
    
    // Add coordinates for visualization (using a simple layout algorithm)
    const nodesWithCoords = graph.nodes.map((node, index) => {
      // Simple circular layout
      const angle = (2 * Math.PI * index) / graph.nodes.length;
      return {
        ...node,
        x: 300 + 200 * Math.cos(angle),
        y: 300 + 200 * Math.sin(angle)
      };
    });
    
    return {
      nodes: nodesWithCoords,
      edges: graph.edges,
      layout: 'circular'
    };
  }

  async getConnectionInference(entityId: number): Promise<any[]> {
    const db = getDb();
    
    // Find entities that are not directly connected to the given entity 
    // but share connections with entities that are connected to it
    const query = `
      WITH direct_connections AS (
        SELECT target_id as connected_id
        FROM entity_relationships
        WHERE source_id = ?
        UNION
        SELECT source_id as connected_id
        FROM entity_relationships
        WHERE target_id = ?
      ),
      shared_connections AS (
        SELECT 
          er1.target_id as potential_connection,
          COUNT(*) as shared_count
        FROM entity_relationships er1
        JOIN entity_relationships er2 ON er1.target_id = er2.target_id
        JOIN direct_connections dc ON er2.source_id = dc.connected_id
        WHERE er1.source_id = ?
          AND er1.target_id != ?
          AND er2.target_id != ?
        GROUP BY er1.target_id
        HAVING COUNT(*) >= 2
      )
      SELECT 
        e.id,
        e.full_name,
        e.primary_role,
        e.red_flag_rating,
        sc.shared_count
      FROM shared_connections sc
      JOIN entities e ON sc.potential_connection = e.id
      ORDER BY sc.shared_count DESC
      LIMIT 10
    `;
    
    const inferredConnections = db.prepare(query).all(entityId, entityId, entityId, entityId, entityId) as any[];
    
    return inferredConnections.map(conn => ({
      entity: conn.full_name,
      primaryRole: conn.primary_role,
      redFlagRating: conn.red_flag_rating,
      confidence: conn.shared_count > 0 ? Math.min(1.0, conn.shared_count * 0.2) : 0,
      sharedConnectionCount: conn.shared_count,
      reason: `Connected through ${conn.shared_count} shared connections`
    }));
  }
}